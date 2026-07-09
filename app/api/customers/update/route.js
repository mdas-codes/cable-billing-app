// app/api/customers/update/route.js
// ---------------------------------------------------------------------
// Handles Customer modifications.
// PATCH /api/customers/update — Admin only. Updates details or fields cleanly.
// ---------------------------------------------------------------------

import prisma from "@/lib/prisma";
import {
  verifyAdminPassword,
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successResponse,
} from "@/lib/auth";

export async function PATCH(request) {
  // 1. Authenticate Request
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  // 2. Parse Request Body
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body.");
  }

  const { customerId, name, address, packageId, cycleStartDate, status, balanceDue } = body;

  if (!customerId) return badRequestResponse("Customer ID is required.");
  const formattedCustomerId = customerId.trim().toUpperCase();

  try {
    // 3. Find existing customer
    const customer = await prisma.customer.findUnique({
      where: { customerId: formattedCustomerId },
      include: { package: true },
    });
    if (!customer) {
      return badRequestResponse(`Customer "${formattedCustomerId}" not found.`);
    }

    // 4. Build dynamic update data object
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (address !== undefined) updateData.address = address ? address.trim() : null;
    if (status !== undefined) updateData.status = status;
    if (balanceDue !== undefined) updateData.balanceDue = Number(balanceDue);

    // 5. Handle Package / Renewal recalculations (with secure timezone offsets)
    if (packageId && packageId !== customer.packageId) {
      const pkg = await prisma.package.findUnique({ where: { id: packageId } });
      if (!pkg) return badRequestResponse("Selected package not found.");

      updateData.packageId = packageId;

      // Normalize date boundaries cleanly to local context midnights
      let startDate = new Date();
      if (cycleStartDate) {
        const p = new Date(cycleStartDate);
        startDate = !isNaN(p.getTime()) ? new Date(p.getFullYear(), p.getMonth(), p.getDate(), 0, 0, 0, 0) : new Date();
      }

      const expiry = new Date(startDate);
      expiry.setDate(expiry.getDate() + pkg.durationDays);

      updateData.cycleStartDate = startDate;
      updateData.expiryDate = expiry;

      if (balanceDue === undefined) {
        updateData.balanceDue = Number(pkg.price);
      }
    } else if (cycleStartDate) {
      // Handle shifting timelines for existing matching packages
      const p = new Date(cycleStartDate);
      let startDate = !isNaN(p.getTime()) ? new Date(p.getFullYear(), p.getMonth(), p.getDate(), 0, 0, 0, 0) : new Date();

      const duration = customer.package?.durationDays ?? 30; // Clean fallback to prevent server crashes
      const expiry = new Date(startDate);
      expiry.setDate(expiry.getDate() + duration);

      updateData.cycleStartDate = startDate;
      updateData.expiryDate = expiry;
    }

    // 6. Execute update query
    const updated = await prisma.customer.update({
      where: { customerId: formattedCustomerId },
      data: updateData,
      include: { package: true },
    });

    // 7. Return serialized customer payload
    return successResponse({
      customer: {
        id: updated.id,
        customerId: updated.customerId,
        name: updated.name,
        address: updated.address ?? "",
        status: updated.status,
        packageId: updated.packageId,
        package: updated.package
          ? {
              id: updated.package.id,
              name: updated.package.name,
              price: Number(updated.package.price),
              durationDays: updated.package.durationDays,
            }
          : null,
        cycleStartDate: updated.cycleStartDate.toISOString(),
        expiryDate: updated.expiryDate.toISOString(),
        balanceDue: Number(updated.balanceDue),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[CUSTOMER_PATCH_ERROR]:", err);
    return serverErrorResponse("Failed to update customer details.", err);
  }
}
