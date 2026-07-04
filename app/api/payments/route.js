// app/api/payments/route.js
// ---------------------------------------------------------------------
// Handles all payment recording and payment history fetching.
//
// GET  /api/payments   — Admin only. Fetches payment history.
//                        Query params:
//                          ?mode=today    — All payments made today
//                          ?mode=monthly  — All payments in current month
//                          ?mode=3months  — All payments in last 3 months
//
// POST /api/payments   — Public (collector) + Admin. Records a payment.
//                        Handles both full and partial payments.
//                        Automatically:
//                          - Calculates new balanceDue after payment
//                          - Renews billing cycle if fully paid
//                          - Carries forward unpaid balance to next cycle
//                          - Deletes payment records older than 3 months
// ---------------------------------------------------------------------

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  verifyAdminPassword,
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successResponse,
} from "@/lib/auth";

// Helper: serialize a payment object for JSON response
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
// Admin only — requires x-admin-password header.
// Returns payment history filtered by mode.
// ---------------------------------------------------------------------
export async function GET(request) {
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "today";

  const now = new Date();

  let dateFilter;

  if (mode === "today") {
    // Start and end of today
    const todayStart = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0
    );
    const todayEnd = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999
    );
    dateFilter = { gte: todayStart, lte: todayEnd };

  } else if (mode === "monthly") {
    // Start of current month to now
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    dateFilter = { gte: monthStart, lte: now };

  } else if (mode === "3months") {
    // Rolling 3-month window
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    dateFilter = { gte: threeMonthsAgo, lte: now };

  } else {
    return badRequestResponse("Invalid mode. Use: today, monthly, or 3months.");
  }

  try {
    const payments = await prisma.payment.findMany({
      where: { paidAt: dateFilter },
      include: {
        customer: {
          select: { customerId: true, name: true },
        },
        package: {
          select: { name: true },
        },
      },
      orderBy: { paidAt: "desc" },
    });

    // Calculate summary totals for the period
    const totalPaid = payments.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0
    );

    // Total due = sum of balanceAfterPayment for latest payment per customer
    // We group by customer and take the most recent balanceAfterPayment
    const latestPerCustomer = new Map();
    for (const p of payments) {
      if (!latestPerCustomer.has(p.customerId)) {
        latestPerCustomer.set(p.customerId, Number(p.balanceAfterPayment));
      }
    }
    const totalDue = Array.from(latestPerCustomer.values()).reduce(
      (sum, bal) => sum + (bal > 0 ? bal : 0),
      0
    );

    return successResponse({
      payments: payments.map(serializePayment),
      summary: {
        totalPaid: Number(totalPaid.toFixed(2)),
        totalDue: Number(totalDue.toFixed(2)),
        count: payments.length,
      },
    });
  } catch (err) {
    return serverErrorResponse("Failed to fetch payments.", err);
  }
}

// ---------------------------------------------------------------------
// POST /api/payments
// Public — no admin password required (collector uses this).
// Records a payment for a customer.
//
// Request body (JSON):
// {
//   "customerId":  "C001",       // human-facing customer ID (required)
//   "amountPaid":  300,          // amount paid in ₹ (required, > 0)
//   "recordedBy":  "COLLECTOR",  // "COLLECTOR" or "ADMIN" (optional)
//   "note":        "Paid cash"   // optional note
// }
//
// What happens automatically:
// 1. Looks up the customer and their current package + price snapshot.
// 2. Subtracts amountPaid from current balanceDue.
// 3. If new balance <= 0 (fully paid or overpaid):
//    - Marks paymentType = FULL
//    - Renews billing cycle: new cycleStartDate = today, new expiryDate =
//      today + package.durationDays
//    - Sets new balanceDue = next cycle's package price (carry forward
//      any credit as negative balance / deduction)
// 4. If new balance > 0 (partial payment):
//    - Marks paymentType = PARTIAL
//    - Does NOT renew billing cycle yet
//    - Updates balanceDue to remaining amount
// 5. Saves a Payment record with the price snapshot frozen.
// 6. Runs cleanup: deletes Payment records older than 3 months.
// ---------------------------------------------------------------------
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body.");
  }

  // Extract customDate alongside your existing parameters
  const { customerId, amountPaid, recordedBy, note, customDate } = body;

  // Validate inputs
  if (!customerId || customerId.trim().length === 0) {
    return badRequestResponse("Customer ID is required.");
  }
  if (
    amountPaid === undefined ||
    amountPaid === null ||
    isNaN(Number(amountPaid)) ||
    Number(amountPaid) <= 0
  ) {
    return badRequestResponse("A valid positive amount paid (₹) is required.");
  }

  const validRecordedBy = ["COLLECTOR", "ADMIN"].includes(recordedBy)
    ? recordedBy
    : "COLLECTOR";

  try {
    // Fetch customer with their current package
    const customer = await prisma.customer.findUnique({
      where: { customerId: customerId.trim().toUpperCase() },
      include: { package: true },
    });

    if (!customer) {
      return Response.json(
        { success: false, error: "Customer not found." },
        { status: 404 }
      );
    }

    if (customer.status !== "ACTIVE") {
      return badRequestResponse(
        `Customer ${customer.customerId} is ${customer.status}. Cannot record payment.`
      );
    }

    const paid = Number(amountPaid);
    const currentBalance = Number(customer.balanceDue);
    const packagePrice = Number(customer.package.price);

    // Snapshot the package price at the time of this payment
    const priceSnapshot = packagePrice;

    // Calculate new balance after this payment
    const newBalance = currentBalance - paid;

    // Determine payment type
    const paymentType = newBalance <= 0 ? "FULL" : "PARTIAL";

    // Determine the payment timestamp base:
    // If customDate is passed from the admin tools layout, backdate it. Otherwise use the current runtime.
    const paymentDate = customDate ? new Date(customDate) : new Date();

    let updatedCustomerData = {};

    if (paymentType === "FULL") {
      // Fully paid (or overpaid) — renew billing cycle using the determined paymentDate structure
      const newCycleStart = new Date(
        paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate(), 0, 0, 0, 0
      );
      const newExpiry = new Date(newCycleStart);
      newExpiry.setDate(newExpiry.getDate() + customer.package.durationDays);

      // Next cycle balance = package price minus any credit (overpayment)
      const nextBalance = packagePrice + newBalance; // newBalance is negative if overpaid
      const finalNextBalance = nextBalance < 0 ? 0 : nextBalance;

      updatedCustomerData = {
        cycleStartDate: newCycleStart,
        expiryDate: newExpiry,
        balanceDue: finalNextBalance,
      };
    } else {
      // Partial payment — just update the remaining balance
      updatedCustomerData = {
        balanceDue: newBalance,
      };
    }

    // Prisma transactional layer ensures integrity across operations
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          customerId: customer.id,
          packageId: customer.packageId,
          packagePriceSnapshot: priceSnapshot,
          amountPaid: paid,
          balanceAfterPayment: newBalance,
          paymentType,
          recordedBy: validRecordedBy,
          note: note ? note.trim() : null,
          paidAt: paymentDate, // <--- Correctly commits the custom date or default current time
        },
        include: {
          customer: { select: { customerId: true, name: true } },
          package: { select: { name: true } },
        },
      }),
      prisma.customer.update({
        where: { id: customer.id },
        data: updatedCustomerData,
      }),
    ]);

    // ------------------------------------------------------------------
    // CLEANUP: Delete payment records older than 3 months.
    // Wrapped in its own block so cleanups don't threaten execution.
    // ------------------------------------------------------------------
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      await prisma.payment.deleteMany({
        where: { paidAt: { lt: threeMonthsAgo } },
      });
    } catch (cleanupErr) {
      console.warn("[CLEANUP] Failed to delete old payments:", cleanupErr);
    }

    return successResponse({
      payment: serializePayment(payment),
      message:
        paymentType === "FULL"
          ? `Payment recorded. Billing cycle renewed for ${customer.package.durationDays} days.`
          : `Partial payment recorded. Remaining balance: ₹${newBalance.toFixed(2)}`,
    });
  } catch (err) {
    return serverErrorResponse("Failed to record payment.", err);
  }
}
// ADD THIS DELETE METHOD:
export async function DELETE(request) {
  try {
    // 1. Password Verification
    const adminPassword = request.headers.get("x-admin-password");
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. Extract targeted payment ID
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing log identifier ID" }, { status: 400 });
    }

    // 3. Find the payment record first
    const existingPayment = await prisma.payment.findUnique({
      where: { id: id },
    });

    if (!existingPayment) {
      return NextResponse.json({ success: false, error: "Payment record not found" }, { status: 404 });
    }

    // 4. Safely execute reversal using updateMany to avoid strict unique constraints
    await prisma.$transaction([
      // A) Safely revert balance tracking using updateMany
      prisma.customer.updateMany({
        where: { customerId: existingPayment.customerId },
        data: {
          balanceDue: {
            increment: existingPayment.amountPaid,
          },
        },
      }),
      // B) Delete the payment record
      prisma.payment.delete({
        where: { id: id },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Payment tracking successfully reversed" });
  } catch (error) {
    // We pass back the actual error message here so you can see exactly what failed in the network response
    console.error("Deletion Error:", error);
    return NextResponse.json({
      success: false,
      error: "Database transaction failed",
      details: error.message
    }, { status: 500 });
  }
}
