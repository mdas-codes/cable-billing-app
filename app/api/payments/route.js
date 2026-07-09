// app/api/payments/route.js
// ---------------------------------------------------------------------
// Handles robust transactional payment captures, rollback balances,
// and summary metrics securely optimized at the database layer.
// ---------------------------------------------------------------------

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  verifyAdminPassword,
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successResponse,
} from "@/lib/auth";

function serializePayment(p) {
  return {
    id: p.id,
    customerId: p.customerId,
    customerDisplayId: p.customer?.customerId ?? "",
    customerName: p.customer?.name ?? "",
    packageId: p.packageId,
    packageName: p.package?.name ?? "",
    packagePriceSnapshot: Number(p.packagePriceSnapshot),
    amountPaid: Number(p.amountPaid),
    balanceAfterPayment: Number(p.balanceAfterPayment),
    paymentType: p.paymentType,
    recordedBy: p.recordedBy,
    note: p.note ?? "",
    paidAt: p.paidAt.toISOString(),
    createdAt: p.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------
// GET /api/payments
// ---------------------------------------------------------------------
export async function GET(request) {
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "today";

  const now = new Date();
  let dateFilter;

  if (mode === "today") {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    dateFilter = { gte: todayStart, lte: todayEnd };
  } else if (mode === "monthly") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    dateFilter = { gte: monthStart, lte: now };
  } else if (mode === "3months") {
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    dateFilter = { gte: threeMonthsAgo, lte: now };
  } else {
    return badRequestResponse("Invalid mode. Use: today, monthly, or 3months.");
  }

  try {
    // Parallelize calculations to avoid blocking runtime sequence lines
    const [payments, dueAggregation] = await prisma.$transaction([
      prisma.payment.findMany({
        where: { paidAt: dateFilter },
        include: {
          customer: { select: { customerId: true, name: true } },
          package: { select: { name: true } },
        },
        orderBy: { paidAt: "desc" },
      }),
      prisma.customer.aggregate({
        where: { status: "ACTIVE", balanceDue: { gt: 0 } },
        _sum: { balanceDue: true }
      })
    ]);

    let totalPaid = 0;
    for (let i = 0; i < payments.length; i++) {
      totalPaid += Number(payments[i].amountPaid);
    }

    const totalDue = Number(dueAggregation._sum.balanceDue ?? 0);

    return successResponse({
      payments: payments.map(serializePayment),
      summary: {
        totalPaid: Number(totalPaid.toFixed(2)),
        totalDue: Number(totalDue.toFixed(2)),
        count: payments.length,
      },
    });
  } catch (err) {
    return serverErrorResponse("Failed to fetch payments context registries.", err);
  }
}

// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// POST /api/payments
// ---------------------------------------------------------------------
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return badRequestResponse("Invalid JSON body."); }

  const { customerId, amountPaid, recordedBy, note } = body;

  if (!customerId || customerId.trim().length === 0) {
    return badRequestResponse("Customer ID is required.");
  }
  if (amountPaid === undefined || amountPaid === null || isNaN(Number(amountPaid)) || Number(amountPaid) <= 0) {
    return badRequestResponse("A valid positive amount paid (₹) is required.");
  }

  const validRecordedBy = ["COLLECTOR", "ADMIN"].includes(recordedBy) ? recordedBy : "COLLECTOR";

  try {
    const executionResult = await prisma.$transaction(async (tx) => {

      // 1. Fetch live profile mapping to verify current standing
      const customer = await tx.customer.findUnique({
        where: { customerId: customerId.trim().toUpperCase() },
        include: { package: true },
      });

      if (!customer) throw new Error("Customer record registry target not discovered.");
      if (customer.status !== "ACTIVE") throw new Error(`Customer ${customer.customerId} is status: ${customer.status}. Blocked.`);

      // 2. Identify active cycle price snapshot (respecting customPrice for "OTHER" plan)
      const isOtherPkg = customer.package?.name?.toUpperCase() === "OTHER";
      const packagePrice = isOtherPkg && customer.customPrice !== null
        ? Number(customer.customPrice)
        : Number(customer.package?.price || 0);

      const liveBalance = Number(customer.balanceDue);
      const paidAmount = Number(amountPaid);

      // 3. Compute structural totals matching UI logic
      // Safely check if current balance already reflects an integrated billing cycle
      const isDbAlreadyCombined = packagePrice > 0 && liveBalance > packagePrice;
      const totalCollectible = isDbAlreadyCombined ? liveBalance : (packagePrice + liveBalance);

      // 4. Determine final outstanding balance unit using plain numbers
      const finalBalanceAfterPayment = totalCollectible - paidAmount;
      const paymentType = finalBalanceAfterPayment <= 0 ? "FULL" : "PARTIAL";

      // 5. Determine new expiration timeline extension rules
      const duration = customer.package?.durationDays || 30;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let anchorDate = new Date(customer.expiryDate);
      anchorDate.setHours(0, 0, 0, 0);

      // Rule: If already expired, extend starting from today. If paying early, stack duration Days on top of their remaining cycle end date.
      if (anchorDate < today) {
        anchorDate = new Date(today);
      }

      const newExpiryDate = new Date(anchorDate);
      newExpiryDate.setDate(newExpiryDate.getDate() + duration);

      // 6. Log historical ledger row entry
      const paymentRecord = await tx.payment.create({
        data: {
          customerId: customer.id,
          packageId: customer.packageId,
          packagePriceSnapshot: new Prisma.Decimal(packagePrice),
          amountPaid: new Prisma.Decimal(paidAmount),
          balanceAfterPayment: new Prisma.Decimal(finalBalanceAfterPayment),
          paymentType,
          recordedBy: validRecordedBy,
          note: note ? note.trim() : null,
        },
        include: {
          customer: { select: { customerId: true, name: true } },
          package: { select: { name: true } },
        },
      });

      // 7. Commit new balance state directly back to the customer model
      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          balanceDue: new Prisma.Decimal(finalBalanceAfterPayment),
          cycleStartDate: anchorDate,
          expiryDate: newExpiryDate
        },
      });

      return {
        payment: paymentRecord,
        message: `✓ Payment Saved! Balance: ₹${finalBalanceAfterPayment.toFixed(2)}. Exp: ${newExpiryDate.getDate()}/${newExpiryDate.getMonth() + 1}/${newExpiryDate.getFullYear()}`
      };
    });

    // Async decoupled processing cleanup avoids locking runtime API speeds
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    prisma.payment.deleteMany({ where: { paidAt: { lt: threeMonthsAgo } } })
      .catch((err) => console.warn("[CLEANUP_WARN]:", err));

    return successResponse({
      payment: serializePayment(executionResult.payment),
      message: executionResult.message
    });

  } catch (err) {
    console.error("[PAYMENT_POST_ERROR]:", err);
    return serverErrorResponse(err.message || "Failed to record payment context transaction.");
  }
}

// ---------------------------------------------------------------------
// DELETE /api/payments
// ---------------------------------------------------------------------
export async function DELETE(request) {
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return badRequestResponse("Missing log identifier ID parameter mapping.");

  try {
    const existingPayment = await prisma.payment.findUnique({
      where: { id },
      include: { package: true }
    });

    if (!existingPayment) {
      return badRequestResponse("Payment record not found on system servers.");
    }

    let customerDataUpdate = {
      balanceDue: { increment: existingPayment.amountPaid },
    };

    if (existingPayment.paymentType === "FULL") {
      const currentCustomer = await prisma.customer.findUnique({
        where: { id: existingPayment.customerId }
      });

      if (currentCustomer) {
        const daysToRollback = existingPayment.package?.durationDays ?? 30;

        const previousStart = new Date(currentCustomer.cycleStartDate);
        previousStart.setDate(previousStart.getDate() - daysToRollback);

        const previousExpiry = new Date(currentCustomer.expiryDate);
        previousExpiry.setDate(previousExpiry.getDate() - daysToRollback);

        customerDataUpdate.cycleStartDate = previousStart;
        customerDataUpdate.expiryDate = previousExpiry;
      }
    }

    await prisma.$transaction([
      prisma.customer.update({
        where: { id: existingPayment.customerId },
        data: customerDataUpdate,
      }),
      prisma.payment.delete({
        where: { id },
      }),
    ]);

    return successResponse({ message: "Payment reversed and historical billing timeline restored cleanly." });
  } catch (error) {
    console.error("[PAYMENT_DELETE_ERROR]:", error);
    return serverErrorResponse("Database transactional operational failure on inversion process.", error);
  }
}
