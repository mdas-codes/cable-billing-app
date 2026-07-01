// app/api/customers/route.js
// ---------------------------------------------------------------------
// Handles Customer listing and creation.
//
// GET  /api/customers                    — Public. Returns customers for
//                                         the walk-list (due today +
//                                         overdue) or a search query.
//
// POST /api/customers                    — Admin only. Creates a single
//                                         new customer record.
//
// Query params for GET:
//   ?mode=walklist     Returns customers due today + all overdue ones.
//                      This powers the collector's daily checklist.
//   ?mode=all          Returns all active customers (for admin view).
//   ?search=QUERY      Searches by customerId or name (for payment form).
//   ?customerId=ID     Returns a single customer by their human-facing ID.
// ---------------------------------------------------------------------

import prisma from "@/lib/prisma";
import {
  verifyAdminPassword,
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successResponse,
} from "@/lib/auth";

// Helper: serialize a customer object — converts Decimal fields to numbers
// and formats dates as ISO strings so they travel cleanly over JSON.
function serializeCustomer(c) {
  return {
    id: c.id,
    customerId: c.customerId,
    name: c.name,
    address: c.address ?? "",
    status: c.status,
    packageId: c.packageId,
    package: c.package
      ? {
          id: c.package.id,
          name: c.package.name,
          price: Number(c.package.price),
          durationDays: c.package.durationDays,
        }
      : null,
    cycleStartDate: c.cycleStartDate.toISOString(),
    expiryDate: c.expiryDate.toISOString(),
    balanceDue: Number(c.balanceDue),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------
// GET /api/customers
// ---------------------------------------------------------------------
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const search = searchParams.get("search");
  const customerIdParam = searchParams.get("customerId");

  try {
    // ------------------------------------------------------------------
    // Mode: single customer lookup by human-facing customerId
    // Used by the payment form to auto-fill customer details.
    // ------------------------------------------------------------------
    if (customerIdParam) {
      const customer = await prisma.customer.findUnique({
        where: { customerId: customerIdParam.trim().toUpperCase() },
        include: { package: true },
      });

      if (!customer) {
        return Response.json(
          { success: false, error: "Customer not found." },
          { status: 404 }
        );
      }

      return successResponse({ customer: serializeCustomer(customer) });
    }

    // ------------------------------------------------------------------
    // Mode: search by name or customerId (partial match)
    // Used by the collector's payment form live search.
    // ------------------------------------------------------------------
    if (search) {
      const customers = await prisma.customer.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            {
              customerId: {
                contains: search.trim(),
                mode: "insensitive",
              },
            },
            {
              name: {
                contains: search.trim(),
                mode: "insensitive",
              },
            },
          ],
        },
        include: { package: true },
        orderBy: { customerId: "asc" },
        take: 20,
      });

      return successResponse({
        customers: customers.map(serializeCustomer),
      });
    }

    // ------------------------------------------------------------------
    // Mode: walklist — customers due today + all overdue customers
    // "Due today" = expiryDate falls on today's date (any time today).
    // "Overdue"   = expiryDate is before today (missed renewal).
    // Both groups are shown together on the collector's checklist.
    // ------------------------------------------------------------------
    if (mode === "walklist") {
      const now = new Date();

      // Start of today (00:00:00) in local time
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0, 0, 0, 0
      );

      // End of today (23:59:59)
      const todayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23, 59, 59, 999
      );

      const customers = await prisma.customer.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            // Due today
            {
              expiryDate: {
                gte: todayStart,
                lte: todayEnd,
              },
            },
            // Overdue (past due, not yet renewed)
            {
              expiryDate: { lt: todayStart },
              balanceDue: { gt: 0 },
            },
          ],
        },
        include: { package: true },
        orderBy: [
          { expiryDate: "asc" }, // overdue first, then due today
          { customerId: "asc" },
        ],
      });

      return successResponse({
        customers: customers.map(serializeCustomer),
      });
    }

    // ------------------------------------------------------------------
    // Mode: all — every active customer for admin view
    // ------------------------------------------------------------------
    if (mode === "all") {
      const customers = await prisma.customer.findMany({
        where: { status: "ACTIVE" },
        include: { package: true },
        orderBy: { customerId: "asc" },
      });

      return successResponse({
        customers: customers.map(serializeCustomer),
      });
    }

    // Default: return all active customers
    const customers = await prisma.customer.findMany({
      where: { status: "ACTIVE" },
      include: { package: true },
      orderBy: { customerId: "asc" },
    });

    return successResponse({
      customers: customers.map(serializeCustomer),
    });
  } catch (err) {
    return serverErrorResponse("Failed to fetch customers.", err);
  }
}

// ---------------------------------------------------------------------
// POST /api/customers
// Admin only — requires x-admin-password header.
// Creates a single new customer.
//
// Request body (JSON):
// {
//   "customerId":  "C001",         // required, unique human-facing ID
//   "name":        "Ramesh Kumar", // required
//   "address":     "Ward 5, ...",  // optional
//   "packageId":   "cld...",       // required, Prisma package ID
//   "cycleStartDate": "2024-01-01" // optional, defaults to today
// }
// ---------------------------------------------------------------------
export async function POST(request) {
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body.");
  }

  const { customerId, name, address, packageId, cycleStartDate } = body;

  // Validate required fields
  if (!customerId || customerId.trim().length === 0) {
    return badRequestResponse("Customer ID is required.");
  }
  if (!name || name.trim().length === 0) {
    return badRequestResponse("Customer name is required.");
  }
  if (!packageId) {
    return badRequestResponse("Package selection is required.");
  }

  try {
    // Check for duplicate customerId
    const existing = await prisma.customer.findUnique({
      where: { customerId: customerId.trim().toUpperCase() },
    });
    if (existing) {
      return badRequestResponse(
        `Customer ID "${customerId.trim().toUpperCase()}" already exists.`
      );
    }

    // Fetch the selected package to calculate expiry date
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
    });
    if (!pkg) {
      return badRequestResponse("Selected package not found.");
    }

    // Calculate cycle start and expiry dates
    const startDate = cycleStartDate
      ? new Date(cycleStartDate)
      : new Date();

    const expiry = new Date(startDate);
    expiry.setDate(expiry.getDate() + pkg.durationDays);

    const customer = await prisma.customer.create({
      data: {
        customerId: customerId.trim().toUpperCase(),
        name: name.trim(),
        address: address ? address.trim() : null,
        packageId,
        cycleStartDate: startDate,
        expiryDate: expiry,
        balanceDue: Number(pkg.price), // first cycle is immediately due
        status: "ACTIVE",
      },
      include: { package: true },
    });

    return successResponse({ customer: serializeCustomer(customer) });
  } catch (err) {
    return serverErrorResponse("Failed to create customer.", err);
  }
}
