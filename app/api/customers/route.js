// app/api/customers/route.js
// ---------------------------------------------------------------------
// Handles high-performance operations for listing, creating, updating,
// and deleting customer entities with complete relational accuracy.
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

// Helper: safe date-boundary serializer removing trailing timezone offsets
function normalizeLocalMidnight(inputString) {
  if (!inputString) return new Date();
  const d = new Date(inputString);
  if (isNaN(d.getTime())) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function serializeCustomer(c) {
  const hasCustomPrice = c.customPrice !== undefined && c.customPrice !== null;
  const isOtherPkg = c.package?.name?.toUpperCase() === "OTHER";

  // High-visibility structural fix: ensure truePackagePrice falls back to package price if customPrice isn't set yet
  const truePackagePrice = isOtherPkg
    ? (hasCustomPrice ? Number(c.customPrice) : Number(c.package?.price ?? 0))
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
    balanceDue: Number(c.balanceDue),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------
// GET: Fetch Walklist, Individual Profiles, or Real-time Search Pools
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
      if (!customer) return badRequestResponse("Customer profile not found on server record registries.");
      return successResponse({ customer: serializeCustomer(customer) });
    }

    if (search) {
      const query = search.trim();
      const customers = await prisma.customer.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { customerId: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ],
        },
        include: { package: true },
        orderBy: { customerId: "asc" },
        take: 20,
      });
      return successResponse({ customers: customers.map(serializeCustomer) });
    }

    if (mode === "walklist") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Outdoor field Optimization: Only return customers who actually owe money or have already expired
      const customers = await prisma.customer.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { balanceDue: { gt: 0 } },
            { expiryDate: { lte: today } }
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
    const formattedId = customerId.trim().toUpperCase();
    const existing = await prisma.customer.findUnique({
      where: { customerId: formattedId },
    });
    if (existing) return badRequestResponse(`Customer ID "${formattedId}" already exists.`);

    const pkg = await prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) return badRequestResponse("Selected package template not found.");

    const startDate = normalizeLocalMidnight(cycleStartDate);

    let expiry;
    if (customExpiryDate) {
      expiry = normalizeLocalMidnight(customExpiryDate);
    } else {
      expiry = new Date(startDate);
      expiry.setDate(expiry.getDate() + pkg.durationDays);
    }

    const isPkgOther = pkg.name.toUpperCase() === "OTHER";
    const initialPrice = isPkgOther && customPrice !== undefined && customPrice !== null
      ? Number(customPrice)
      : Number(pkg.price);

    const customer = await prisma.customer.create({
      data: {
        customerId: formattedId,
        name: name.trim(),
        address: address ? address.trim() : null,
        packageId,
        cycleStartDate: startDate,
        expiryDate: expiry,
        balanceDue: new Prisma.Decimal(initialPrice),
        status: "ACTIVE",
        customPrice: isPkgOther && customPrice !== undefined && customPrice !== null ? new Prisma.Decimal(customPrice) : null,
      },
      include: { package: true },
    });

    return successResponse({ customer: serializeCustomer(customer) });
  } catch (err) {
    return serverErrorResponse("Failed to register customer entry.", err);
  }
}

// ---------------------------------------------------------------------
// PUT: Update Customer Logic (Plan Swaps, Custom Price Rates & Manual Prorating)
// ---------------------------------------------------------------------
export async function PUT(request) {
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  let body;
  try { body = await request.json(); } catch { return badRequestResponse("Invalid JSON formatting configuration."); }

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

    if (packageId) {
      const newPkg = await prisma.package.findUnique({ where: { id: packageId } });
      if (!newPkg) return badRequestResponse("New package target does not exist.");

      const isNewPkgOther = newPkg.name.toUpperCase() === "OTHER";
      const targetPlanRate = isNewPkgOther && customPrice !== undefined && customPrice !== null
        ? Number(customPrice)
        : Number(newPkg.price);

      updatedData.packageId = packageId;
      updatedData.customPrice = isNewPkgOther && customPrice !== undefined && customPrice !== null ? new Prisma.Decimal(customPrice) : null;

      if (packageId !== currentCustomer.packageId) {
        const hasPrevCustom = currentCustomer.customPrice !== undefined && currentCustomer.customPrice !== null;
        const previousPlanRate = currentCustomer.package?.name?.toUpperCase() === "OTHER" && hasPrevCustom
          ? Number(currentCustomer.customPrice)
          : Number(currentCustomer.package?.price || 0);

        const previousDue = Number(currentCustomer.balanceDue) - previousPlanRate;
        const finalCalculatedDue = (previousDue < 0 ? 0 : previousDue) + targetPlanRate;

        updatedData.balanceDue = new Prisma.Decimal(finalCalculatedDue);

        if (!customExpiryDate) {
          const now = new Date();
          const midStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          updatedData.cycleStartDate = midStart;

          const nextExpiry = new Date(midStart);
          nextExpiry.setDate(nextExpiry.getDate() + newPkg.durationDays);
          updatedData.expiryDate = nextExpiry;
        }
      } else {
        if (isNewPkgOther && customPrice !== undefined && customPrice !== null) {
          const hasCurrentCustom = currentCustomer.customPrice !== undefined && currentCustomer.customPrice !== null;
          const currentRateOnRecord = hasCurrentCustom
            ? Number(currentCustomer.customPrice)
            : Number(currentCustomer.package?.price || 0);

          const baselineDebt = Number(currentCustomer.balanceDue) - currentRateOnRecord;
          const finalCalculatedDue = (baselineDebt < 0 ? 0 : baselineDebt) + targetPlanRate;

          updatedData.balanceDue = new Prisma.Decimal(finalCalculatedDue);
        }
      }
    }

    if (customExpiryDate) {
      updatedData.expiryDate = normalizeLocalMidnight(customExpiryDate);
    }

    if (manualBalanceAdjust !== undefined && manualBalanceAdjust !== null) {
      updatedData.balanceDue = new Prisma.Decimal(manualBalanceAdjust);
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updatedData,
      include: { package: true }
    });

    return successResponse({ customer: serializeCustomer(updatedCustomer), message: "Customer profile updated successfully." });
  } catch (err) {
    console.error("[CUSTOMER_ROUTE_PUT_ERROR]:", err);
    return serverErrorResponse("Failed updating customer context records.", err);
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
    // Atomic cascade deletion to prevent constraint crashes
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { customerId: id } }),
      prisma.customer.delete({ where: { id } })
    ]);

    return successResponse({ message: "Customer and all associated transaction records permanently purged." });
  } catch (err) {
    return serverErrorResponse("Failed executing permanent clean deletion action.", err);
  }
}
