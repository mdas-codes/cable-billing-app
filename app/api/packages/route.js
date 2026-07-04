import prisma from "@/lib/prisma";
import {
  verifyAdminPassword,
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successResponse,
} from "@/lib/auth";

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    const serialized = packages.map((pkg) => ({
      ...pkg,
      price: Number(pkg.price),
    }));

    return successResponse({ packages: serialized });
  } catch (err) {
    return serverErrorResponse("Failed to fetch packages.", err);
  }
}

export async function POST(request) {
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  let body;
  try { body = await request.json(); } catch { return badRequestResponse("Invalid JSON."); }

  const { name, price, durationDays } = body;

  if (!name) return badRequestResponse("Package designation name required.");

  try {
    const existing = await prisma.package.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" } },
    });
    if (existing) return badRequestResponse(`Package "${name}" already exists.`);

    const newPackage = await prisma.package.create({
      data: {
        name: name.trim(),
        price: Number(price || 0), // Can be 0 for "OTHER" packages
        durationDays: Number(durationDays || 30),
        isActive: true,
      },
    });

    return successResponse({ package: { ...newPackage, price: Number(newPackage.price) } });
  } catch (err) {
    return serverErrorResponse("Failed to create package configuration profile.", err);
  }
}

// ---------------------------------------------------------------------
// DELETE: Soft Delete Package Strategy
// ---------------------------------------------------------------------
export async function DELETE(request) {
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return badRequestResponse("Package Identification ID parameter is required.");

  try {
    // Instead of completely dropping historical links from tables, flag out of view bounds
    await prisma.package.update({
      where: { id },
      data: { isActive: false }
    });
    return successResponse({ message: "Package removed and isolated into historical archive safely." });
  } catch (err) {
    return serverErrorResponse("Failed modifying package archive visibility metadata status.", err);
  }
}
