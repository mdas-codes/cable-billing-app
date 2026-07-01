// app/api/packages/route.js
// ---------------------------------------------------------------------
// Handles Cable TV Package management.
//
// GET  /api/packages        — Public. Returns all active packages.
//                             Used by the collector page dropdown and
//                             the admin dashboard package list.
//
// POST /api/packages        — Admin only. Creates a new package.
//                             Requires x-admin-password header.
//
// A Package defines:
//   - name:         Display name (e.g. "Silver HD", "Gold Sports")
//   - price:        Monthly/cycle price in ₹ (e.g. 299.00)
//   - durationDays: How many days one billing cycle lasts (e.g. 28, 84)
//   - isActive:     Whether this package is available for new customers
// ---------------------------------------------------------------------

import prisma from "@/lib/prisma";
import {
  verifyAdminPassword,
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successResponse,
} from "@/lib/auth";

// ---------------------------------------------------------------------
// GET /api/packages
// Public — no password required.
// Returns all active packages sorted by price ascending.
// ---------------------------------------------------------------------
export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        durationDays: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Convert Decimal fields to plain numbers for JSON serialization.
    // Prisma returns Decimal objects which don't serialize cleanly by default.
    const serialized = packages.map((pkg) => ({
      ...pkg,
      price: Number(pkg.price),
    }));

    return successResponse({ packages: serialized });
  } catch (err) {
    return serverErrorResponse("Failed to fetch packages.", err);
  }
}

// ---------------------------------------------------------------------
// POST /api/packages
// Admin only — requires x-admin-password header.
// Creates a new cable TV package.
//
// Request body (JSON):
// {
//   "name":         "Gold Sports HD",   // required, must be unique
//   "price":        499,                // required, in ₹
//   "durationDays": 28                  // required, billing cycle length
// }
// ---------------------------------------------------------------------
export async function POST(request) {
  // Verify admin password before doing anything.
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body.");
  }

  const { name, price, durationDays } = body;

  // Validate required fields.
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return badRequestResponse("Package name is required.");
  }
  if (price === undefined || price === null || isNaN(Number(price)) || Number(price) <= 0) {
    return badRequestResponse("A valid positive price (₹) is required.");
  }
  if (
    !durationDays ||
    isNaN(Number(durationDays)) ||
    Number(durationDays) < 1
  ) {
    return badRequestResponse("A valid durationDays (number of days) is required.");
  }

  try {
    // Check for duplicate package name (case-insensitive).
    const existing = await prisma.package.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return badRequestResponse(
        `A package named "${name.trim()}" already exists.`
      );
    }

    const newPackage = await prisma.package.create({
      data: {
        name: name.trim(),
        price: Number(price),
        durationDays: Number(durationDays),
        isActive: true,
      },
    });

    return successResponse({
      package: {
        ...newPackage,
        price: Number(newPackage.price),
      },
    });
  } catch (err) {
    return serverErrorResponse("Failed to create package.", err);
  }
}
