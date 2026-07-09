// app/api/customers/delete/route.js
// ---------------------------------------------------------------------
// Handles hard-deleting a customer profile along with their historical
// payment records atomically within a secure database transaction layer.
// ---------------------------------------------------------------------

import prisma from "@/lib/prisma";
import {
  verifyAdminPassword,
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successResponse,
} from "@/lib/auth";

export async function DELETE(request) {
  // 1. Authenticate Request
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  // 2. Extract customerId from JSON Body
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body.");
  }

  const { customerId } = body;

  if (!customerId || customerId.trim().length === 0) {
    return badRequestResponse("Customer ID parameter is required inside the JSON body.");
  }

  const formattedCustomerId = customerId.trim().toUpperCase();

  try {
    // 3. Confirm target customer exists
    const existing = await prisma.customer.findUnique({
      where: { customerId: formattedCustomerId },
    });

    if (!existing) {
      return badRequestResponse(`Customer "${formattedCustomerId}" not found.`);
    }

    // 4. Safely purge customer along with dependencies inside a transactional operation
    await prisma.$transaction([
      // A) Cascade clear all recorded payment rows linked to this internal profile ID
      prisma.payment.deleteMany({
        where: { customerId: existing.id },
      }),
      // B) Delete the parent customer record securely
      prisma.customer.delete({
        where: { id: existing.id },
      }),
    ]);

    return successResponse({
      message: `Customer "${formattedCustomerId}" and all linked transaction history successfully removed.`,
    });
  } catch (err) {
    console.error("[CUSTOMER_DELETE_ERROR]:", err);
    return serverErrorResponse("Failed to complete customer deletion pipeline.", err);
  }
}
