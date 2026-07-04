import prisma from "@/lib/prisma";
import {
  verifyAdminPassword,
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successResponse,
} from "@/lib/auth";

function serializeCustomer(c) {
  return {
    id: c.id,
    customerId: c.customerId,
    name: c.name,
    address: c.address ?? "",
    status: c.status,
    packageId: c.packageId,
    packageName: c.package?.name ?? "",
    packagePrice: c.package ? Number(c.package.price) : 0,
    cycleStartDate: c.cycleStartDate.toISOString(),
    expiryDate: c.expiryDate.toISOString(),
    balanceDue: Number(c.balanceDue),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------
// GET: Fetch Walklist (Shows all customers who owe money, past or present)
// ---------------------------------------------------------------------
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const search = searchParams.get("search");
  const customerIdParam = searchParams.get("customerId");

  try {
    if (customerIdParam) {
      const customer = await prisma.customer.findUnique({
        where: { customerId: customerIdParam.trim().toUpperCase() },
        include: { package: true },
      });
      if (!customer) return Response.json({ success: false, error: "Customer not found" }, { status: 404 });
      return successResponse({ customer: serializeCustomer(customer) });
    }

    if (search) {
      const customers = await prisma.customer.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { customerId: { contains: search.trim(), mode: "insensitive" } },
            { name: { contains: search.trim(), mode: "insensitive" } },
          ],
        },
        include: { package: true },
        orderBy: { customerId: "asc" },
        take: 20,
      });
      return successResponse({ customers: customers.map(serializeCustomer) });
    }

    // CHANGED LOGIC: Persistent walklist until cleared off (balanceDue > 0 or overdue)
    if (mode === "walklist") {
      const now = new Date();
      const customers = await prisma.customer.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { balanceDue: { gt: 0 } }, // Has any pending debt
            { expiryDate: { lte: now } } // Or cycle has expired
          ]
        },
        include: { package: true },
        orderBy: [
          { balanceDue: "desc" },
          { customerId: "asc" }
        ],
      });
      return successResponse({ customers: customers.map(serializeCustomer) });
    }

    // Admin overview mode (all active)
    const customers = await prisma.customer.findMany({
      where: { status: "ACTIVE" },
      include: { package: true },
      orderBy: { customerId: "asc" },
    });
    return successResponse({ customers: customers.map(serializeCustomer) });
  } catch (err) {
    return serverErrorResponse("Failed to fetch customers.", err);
  }
}

// ---------------------------------------------------------------------
// POST: Register New Customer (Supports Custom Expiry Date & Flexible 'OTHER' plan)
// ---------------------------------------------------------------------
export async function POST(request) {
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  let body;
  try { body = await request.json(); } catch { return badRequestResponse("Invalid JSON body."); }

  const { customerId, name, address, packageId, cycleStartDate, customExpiryDate, customPrice } = body;

  if (!customerId || !name || !packageId) {
    return badRequestResponse("Missing required fields (ID, Name, or Package).");
  }

  try {
    const existing = await prisma.customer.findUnique({
      where: { customerId: customerId.trim().toUpperCase() },
    });
    if (existing) return badRequestResponse(`Customer ID "${customerId.toUpperCase()}" already exists.`);

    const pkg = await prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) return badRequestResponse("Selected package not found.");

    const startDate = cycleStartDate ? new Date(cycleStartDate) : new Date();

    // Set expiry date: explicitly chosen custom expiry date or fallback to default duration
    let expiry = customExpiryDate ? new Date(customExpiryDate) : new Date(startDate);
    if (!customExpiryDate) {
      expiry.setDate(expiry.getDate() + pkg.durationDays);
    }

    // Determine initial rates (Use package price, or allow absolute custom dynamic override for "OTHER" packages)
    const initialPrice = pkg.name.toUpperCase() === "OTHER" && customPrice !== undefined
      ? Number(customPrice)
      : Number(pkg.price);

    const customer = await prisma.customer.create({
      data: {
        customerId: customerId.trim().toUpperCase(),
        name: name.trim(),
        address: address ? address.trim() : null,
        packageId,
        cycleStartDate: startDate,
        expiryDate: expiry,
        balanceDue: initialPrice, // Instantly reflects current plan rates + any balance
        status: "ACTIVE",
      },
      include: { package: true },
    });

    return successResponse({ customer: serializeCustomer(customer) });
  } catch (err) {
    return serverErrorResponse("Failed to register customer.", err);
  }
}

// ---------------------------------------------------------------------
// PUT: Update Customer Logic (Plan Swaps, Mid-month Cancellations, Manual Prorating)
// ---------------------------------------------------------------------
export async function PUT(request) {
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  let body;
  try { body = await request.json(); } catch { return badRequestResponse("Invalid JSON."); }

  const { id, name, address, packageId, customExpiryDate, manualBalanceAdjust, status } = body;

  if (!id) return badRequestResponse("Customer record database ID is required.");

  try {
    const currentCustomer = await prisma.customer.findUnique({
      where: { id },
      include: { package: true }
    });
    if (!currentCustomer) return badRequestResponse("Customer record not found.");

    let updatedData = {
      name: name ? name.trim() : currentCustomer.name,
      address: address !== undefined ? address.trim() : currentCustomer.address,
      status: status || currentCustomer.status,
    };

    // If swapping packages instantly:
    if (packageId && packageId !== currentCustomer.packageId) {
      const newPkg = await prisma.package.findUnique({ where: { id: packageId } });
      if (!newPkg) return badRequestResponse("New package target does not exist.");

      updatedData.packageId = packageId;

      // Instantly modify balance to new package structure keeping previous due adjustments intact
      const previousDue = Number(currentCustomer.balanceDue) - Number(currentCustomer.package?.price || 0);
      updatedData.balanceDue = (previousDue < 0 ? 0 : previousDue) + Number(newPkg.price);

      // Reset cycle windows automatically if no explicit custom override date is attached
      if (!customExpiryDate) {
        const now = new Date();
        updatedData.cycleStartDate = now;
        const nextExpiry = new Date(now);
        nextExpiry.setDate(nextExpiry.getDate() + newPkg.durationDays);
        updatedData.expiryDate = nextExpiry;
      }
    }

    // Handle custom manual overrides (like charging for only 10 days usage mid-month)
    if (customExpiryDate) {
      updatedData.expiryDate = new Date(customExpiryDate);
    }

    if (manualBalanceAdjust !== undefined) {
      // Direct assignment override by admin for absolute control
      updatedData.balanceDue = Number(manualBalanceAdjust);
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updatedData,
      include: { package: true }
    });

    return successResponse({ customer: serializeCustomer(updatedCustomer), message: "Customer profile updated successfully." });
  } catch (err) {
    return serverErrorResponse("Failed updating customer context.", err);
  }
}

// ---------------------------------------------------------------------
// DELETE: Permanent Cascade Customer Purge
// ---------------------------------------------------------------------
export async function DELETE(request) {
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return badRequestResponse("Database ID param required for deletion execution.");

  try {
    // Cascade delete automatically triggered across prisma mapping schema
    await prisma.customer.delete({ where: { id } });
    return successResponse({ message: "Customer and all associated records permanently purged." });
  } catch (err) {
    return serverErrorResponse("Failed executing permanent clean deletion action.", err);
  }
}
