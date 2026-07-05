import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // 🟢 NEEDED FOR DECIMAL FIELDS
import {
  verifyAdminPassword,
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successResponse,
} from "@/lib/auth";

function serializeCustomer(c) {
  const hasCustomPrice = c.customPrice !== undefined && c.customPrice !== null;
  const truePackagePrice = c.package?.name?.toUpperCase() === "OTHER" && hasCustomPrice
    ? Number(c.customPrice)
    : (c.package ? Number(c.package.price) : 0);

  return {
    id: c.id,
    customerId: c.customerId,
    name: c.name,
    address: c.address ?? "",
    status: c.status,
    packageId: c.packageId,
    packageName: c.package?.name ?? "",
    packagePrice: truePackagePrice,
    cycleStartDate: c.cycleStartDate.toISOString(),
    expiryDate: c.expiryDate.toISOString(),
    balanceDue: Number(c.balanceDue), // Safely returns numeric float to front-end
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

    // 🟢 UPDATED WALKLIST LOGIC
    if (mode === "walklist") {
      const customers = await prisma.customer.findMany({
        where: {
          status: "ACTIVE",
          // Pulls any active customer regardless of their current calendar day
          // so your collectors can process payments for current active cycles too
        },
        include: { package: true },
        orderBy: [
          { balanceDue: "desc" },
          { customerId: "asc" }
        ],
      });
      return successResponse({ customers: customers.map(serializeCustomer) });
    }

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

    let expiry = customExpiryDate ? new Date(customExpiryDate) : new Date(startDate);
    if (!customExpiryDate) {
      expiry.setDate(expiry.getDate() + pkg.durationDays);
    }

    const isPkgOther = pkg.name.toUpperCase() === "OTHER";
    const initialPrice = isPkgOther && customPrice !== undefined
      ? Number(customPrice)
      : Number(pkg.price);

    let insertData = {
      customerId: customerId.trim().toUpperCase(),
      name: name.trim(),
      address: address ? address.trim() : null,
      packageId,
      cycleStartDate: startDate,
      expiryDate: expiry,
      // 🟢 WRAPPED IN PRISMA.DECIMAL
      balanceDue: new Prisma.Decimal(initialPrice),
      status: "ACTIVE",
      // 🟢 WRAPPED IN PRISMA.DECIMAL
      customPrice: isPkgOther && customPrice !== undefined ? new Prisma.Decimal(customPrice) : null,
    };

    const customer = await prisma.customer.create({
      data: insertData,
      include: { package: true },
    });

    return successResponse({ customer: serializeCustomer(customer) });
  } catch (err) {
    return serverErrorResponse("Failed to register customer.", err);
  }
}

// ---------------------------------------------------------------------
// PUT: Update Customer Logic (Plan Swaps, Custom Price Rates & Manual Prorating)
// ---------------------------------------------------------------------
export async function PUT(request) {
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  let body;
  try { body = await request.json(); } catch { return badRequestResponse("Invalid JSON."); }

  const { id, name, address, packageId, customExpiryDate, manualBalanceAdjust, customPrice, status } = body;

  if (!id) return badRequestResponse("Customer record database ID is required.");

  try {
    const currentCustomer = await prisma.customer.findUnique({
      where: { id },
      include: { package: true }
    });
    if (!currentCustomer) return badRequestResponse("Customer record not found.");

    let updatedData = {
      name: name ? name.trim() : currentCustomer.name,
      address: address !== undefined && address !== null ? address.trim() : currentCustomer.address,
      status: status || currentCustomer.status,
    };

    // If changing packages or altering dynamic rates
    if (packageId) {
      const newPkg = await prisma.package.findUnique({ where: { id: packageId } });
      if (!newPkg) return badRequestResponse("New package target does not exist.");

      const isNewPkgOther = newPkg.name.toUpperCase() === "OTHER";
      const targetPlanRate = isNewPkgOther && customPrice !== undefined
        ? Number(customPrice)
        : Number(newPkg.price);

      updatedData.packageId = packageId;
      // 🟢 WRAPPED IN PRISMA.DECIMAL
      updatedData.customPrice = isNewPkgOther && customPrice !== undefined ? new Prisma.Decimal(customPrice) : null;

      if (packageId !== currentCustomer.packageId) {
        const hasPrevCustom = currentCustomer.customPrice !== undefined && currentCustomer.customPrice !== null;
        const previousPlanRate = currentCustomer.package?.name?.toUpperCase() === "OTHER" && hasPrevCustom
          ? Number(currentCustomer.customPrice)
          : Number(currentCustomer.package?.price || 0);

        const previousDue = Number(currentCustomer.balanceDue) - previousPlanRate;
        const finalCalculatedDue = (previousDue < 0 ? 0 : previousDue) + targetPlanRate;

        // 🟢 WRAPPED IN PRISMA.DECIMAL
        updatedData.balanceDue = new Prisma.Decimal(finalCalculatedDue);

        if (!customExpiryDate) {
          const now = new Date();
          updatedData.cycleStartDate = now;
          const nextExpiry = new Date(now);
          nextExpiry.setDate(nextExpiry.getDate() + newPkg.durationDays);
          updatedData.expiryDate = nextExpiry;
        }
      } else {
        // Same package structure adjustment override
        if (isNewPkgOther && customPrice !== undefined) {
          const hasCurrentCustom = currentCustomer.customPrice !== undefined && currentCustomer.customPrice !== null;
          const currentRateOnRecord = hasCurrentCustom
            ? Number(currentCustomer.customPrice)
            : Number(currentCustomer.package?.price || 0);

          const baselineDebt = Number(currentCustomer.balanceDue) - currentRateOnRecord;
          const finalCalculatedDue = (baselineDebt < 0 ? 0 : baselineDebt) + targetPlanRate;

          // 🟢 WRAPPED IN PRISMA.DECIMAL
          updatedData.balanceDue = new Prisma.Decimal(finalCalculatedDue);
        }
      }
    }

    if (customExpiryDate) {
      updatedData.expiryDate = new Date(customExpiryDate);
    }

    if (manualBalanceAdjust !== undefined) {
      // 🟢 WRAPPED IN PRISMA.DECIMAL
      updatedData.balanceDue = new Prisma.Decimal(manualBalanceAdjust);
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updatedData,
      include: { package: true }
    });

    return successResponse({ customer: serializeCustomer(updatedCustomer), message: "Customer profile updated successfully." });
  } catch (err) {
    console.error("PUT Error details:", err); // Safety console lookup
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
    await prisma.customer.delete({ where: { id } });
    return successResponse({ message: "Customer and all associated records permanently purged." });
  } catch (err) {
    return serverErrorResponse("Failed executing permanent clean deletion action.", err);
  }
}
