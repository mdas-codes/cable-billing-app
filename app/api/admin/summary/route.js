// app/api/admin/summary/route.js
// ---------------------------------------------------------------------
// Computes summary totals for the admin dashboard widgets.
//
// GET /api/admin/summary?mode=today    — Admin only.
//   Returns:
//     - totalPaid today (sum of all payments made today)
//     - totalDue today (sum of balanceDue for customers on today's walklist)
//     - count of customers paid today
//     - count of customers still due today
//     - list of today's transactions
//
// GET /api/admin/summary?mode=monthly  — Admin only.
//   Returns:
//     - totalPaid this month
//     - totalDue across ALL active customers right now
//     - full payment list for the month
//
// These power the large widget cards at the top of the admin dashboard.
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
      // TODAY SUMMARY
      // ----------------------------------------------------------------
      const todayStart = new Date(
        now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0
      );
      const todayEnd = new Date(
        now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999
      );

      // All payments recorded today
      const todayPayments = await prisma.payment.findMany({
        where: { paidAt: { gte: todayStart, lte: todayEnd } },
        include: {
          customer: { select: { customerId: true, name: true } },
          package: { select: { name: true } },
        },
        orderBy: { paidAt: "desc" },
      });

      // Customers on today's walklist (due today + overdue with balance)
      const walklist = await prisma.customer.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { expiryDate: { gte: todayStart, lte: todayEnd } },
            {
              expiryDate: { lt: todayStart },
              balanceDue: { gt: 0 },
            },
          ],
        },
        include: { package: true },
        orderBy: [{ expiryDate: "asc" }, { customerId: "asc" }],
      });

      // Customers who paid today (by customer internal id)
      const paidCustomerIds = new Set(
        todayPayments.map((p) => p.customerId)
      );

      const totalPaidToday = todayPayments.reduce(
        (sum, p) => sum + Number(p.amountPaid), 0
      );

      // Total due = sum of balanceDue for walklist customers who
      // have NOT made any payment today
      const unpaidWalklist = walklist.filter(
        (c) => !paidCustomerIds.has(c.id)
      );
      const totalDueToday = unpaidWalklist.reduce(
        (sum, c) => sum + Number(c.balanceDue), 0
      );

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
      // MONTHLY SUMMARY
      // ----------------------------------------------------------------
      const monthStart = new Date(
        now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0
      );

      // All payments this month
      const monthlyPayments = await prisma.payment.findMany({
        where: { paidAt: { gte: monthStart, lte: now } },
        include: {
          customer: { select: { customerId: true, name: true } },
          package: { select: { name: true } },
        },
        orderBy: { paidAt: "desc" },
      });

      const totalPaidMonthly = monthlyPayments.reduce(
        (sum, p) => sum + Number(p.amountPaid), 0
      );

      // Total due = sum of ALL active customers' current balanceDue
      const allActiveCustomers = await prisma.customer.findMany({
        where: {
          status: "ACTIVE",
          balanceDue: { gt: 0 },
        },
        include: { package: true },
        orderBy: { customerId: "asc" },
      });

      const totalDueMonthly = allActiveCustomers.reduce(
        (sum, c) => sum + Number(c.balanceDue), 0
      );

      // Monthly breakdown: unique customers who paid this month
      const paidCustomerIds = new Set(
        monthlyPayments.map((p) => p.customerId)
      );

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
