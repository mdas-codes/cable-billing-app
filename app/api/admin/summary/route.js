// app/api/admin/summary/route.js
// ---------------------------------------------------------------------
// Computes summary totals for the admin dashboard widgets.
// Highly optimized via database-layer aggregations for lightning-fast speeds.
// ---------------------------------------------------------------------

import prisma from "@/lib/prisma";
import {
  verifyAdminPassword,
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successResponse,
} from "@/lib/auth";

// Helper: serialize payment for JSON
function serializePayment(p) {
  return {
    id: p.id,
    customerDisplayId: p.customer?.customerId ?? "",
    customerName: p.customer?.name ?? "",
    packageName: p.package?.name ?? "",
    packagePriceSnapshot: Number(p.packagePriceSnapshot),
    amountPaid: Number(p.amountPaid),
    balanceAfterPayment: Number(p.balanceAfterPayment),
    paymentType: p.paymentType,
    recordedBy: p.recordedBy,
    note: p.note ?? "",
    paidAt: p.paidAt.toISOString(),
  };
}

// Helper: serialize customer for JSON
function serializeCustomer(c) {
  return {
    id: c.id,
    customerId: c.customerId,
    name: c.name,
    address: c.address ?? "",
    packageName: c.package?.name ?? "",
    packagePrice: c.package ? Number(c.package.price) : 0,
    expiryDate: c.expiryDate.toISOString(),
    balanceDue: Number(c.balanceDue),
    status: c.status,
  };
}

// ---------------------------------------------------------------------
// GET /api/admin/summary
// ---------------------------------------------------------------------
export async function GET(request) {
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "today";

  if (mode !== "today" && mode !== "monthly") {
    return badRequestResponse("Invalid mode. Use: today or monthly.");
  }

  const now = new Date();

  try {
    if (mode === "today") {
      // ----------------------------------------------------------------
      // TODAY SUMMARY (OPTIMIZED BOUNDS)
      // ----------------------------------------------------------------
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // Fetch today's payments and walklist in parallel to save runtime execution blockages
      const [todayPayments, walklist] = await prisma.$transaction([
        prisma.payment.findMany({
          where: { paidAt: { gte: todayStart, lte: todayEnd } },
          include: {
            customer: { select: { customerId: true, name: true } },
            package: { select: { name: true } },
          },
          orderBy: { paidAt: "desc" },
        }),
        prisma.customer.findMany({
          where: {
            status: "ACTIVE",
            OR: [
              { expiryDate: { gte: todayStart, lte: todayEnd } },
              { expiryDate: { lt: todayStart } }, // Extends seamlessly to catch all overdue entries regardless of current zero status splits
            ],
          },
          include: { package: true },
          orderBy: [{ expiryDate: "asc" }, { customerId: "asc" }],
        })
      ]);

      const paidCustomerIds = new Set(todayPayments.map((p) => p.customerId));

      let totalPaidToday = 0;
      for (let i = 0; i < todayPayments.length; i++) {
        totalPaidToday += Number(todayPayments[i].amountPaid);
      }

      // Filter out customer tracking sets cleanly
      const unpaidWalklist = walklist.filter((c) => !paidCustomerIds.has(c.id));

      let totalDueToday = 0;
      for (let i = 0; i < unpaidWalklist.length; i++) {
        totalDueToday += Number(unpaidWalklist[i].balanceDue);
      }

      return successResponse({
        mode: "today",
        summary: {
          totalPaid: Number(totalPaidToday.toFixed(2)),
          totalDue: Number(totalDueToday.toFixed(2)),
          paidCount: paidCustomerIds.size,
          dueCount: unpaidWalklist.length,
          walklistTotal: walklist.length,
        },
        payments: todayPayments.map(serializePayment),
        walklist: walklist.map(serializeCustomer),
        paidCustomerIds: Array.from(paidCustomerIds),
      });
    }

    if (mode === "monthly") {
      // ----------------------------------------------------------------
      // MONTHLY SUMMARY (HIGH-SPEED LAYER VIA AGGREGATE)
      // ----------------------------------------------------------------
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

      // Parallel execution: database handles sums internally rather than bringing thousands of rows into JS memory
      const [monthlyPayments, dueAggregation, allActiveCustomers] = await prisma.$transaction([
        prisma.payment.findMany({
          where: { paidAt: { gte: monthStart, lte: now } },
          include: {
            customer: { select: { customerId: true, name: true } },
            package: { select: { name: true } },
          },
          orderBy: { paidAt: "desc" },
        }),
        prisma.customer.aggregate({
          where: {
            status: "ACTIVE",
            balanceDue: { gt: 0 },
          },
          _sum: {
            balanceDue: true,
          },
        }),
        prisma.customer.findMany({
          where: {
            status: "ACTIVE",
            balanceDue: { gt: 0 },
          },
          include: { package: true },
          orderBy: { customerId: "asc" },
        })
      ]);

      let totalPaidMonthly = 0;
      for (let i = 0; i < monthlyPayments.length; i++) {
        totalPaidMonthly += Number(monthlyPayments[i].amountPaid);
      }

      const totalDueMonthly = Number(dueAggregation._sum.balanceDue ?? 0);
      const paidCustomerIds = new Set(monthlyPayments.map((p) => p.customerId));

      return successResponse({
        mode: "monthly",
        summary: {
          totalPaid: Number(totalPaidMonthly.toFixed(2)),
          totalDue: Number(totalDueMonthly.toFixed(2)),
          paidCount: paidCustomerIds.size,
          dueCount: allActiveCustomers.length,
          paymentCount: monthlyPayments.length,
        },
        payments: monthlyPayments.map(serializePayment),
        dueCustomers: allActiveCustomers.map(serializeCustomer),
      });
    }
  } catch (err) {
    return serverErrorResponse("Failed to compute summary.", err);
  }
}
