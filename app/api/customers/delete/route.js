// app/api/customers/delete/route.js
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

  // 2. Extract customerId from JSON Body instead of URL
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
      return Response.json(
        { success: false, error: `Customer "${formattedCustomerId}" not found.` },
        { status: 404 }
      );
    }

    // 4. Delete customer record
    await prisma.customer.delete({
      where: { customerId: formattedCustomerId },
    });

    return successResponse({
      message: `Customer "${formattedCustomerId}" successfully deleted.`,
    });
  } catch (err) {
    if (err.code === "P2003") {
      return badRequestResponse(
        "Cannot delete customer because they have linked transaction history. Consider changing status to INACTIVE instead."
      );
    }
    return serverErrorResponse("Failed to delete customer.", err);
  }
}
