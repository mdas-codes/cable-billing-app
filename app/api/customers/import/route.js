// app/api/customers/import/route.js
// ---------------------------------------------------------------------
// Handles high-performance batch customer imports from CSV or XLSX files.
// Optimized via bulk transactions to prevent system timeout lockups.
// ---------------------------------------------------------------------

import prisma from "@/lib/prisma";
import {
  verifyAdminPassword,
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successResponse,
} from "@/lib/auth";
import * as XLSX from "xlsx";

export async function POST(request) {
  const auth = verifyAdminPassword(request);
  if (!auth.ok) return unauthorizedResponse(auth.error);

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return badRequestResponse("Could not parse form data. Send as multipart/form-data.");
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return badRequestResponse("No file uploaded. Include a 'file' field.");
  }

  const fileName = file.name ?? "";
  const isCSV = fileName.toLowerCase().endsWith(".csv");
  const isXLSX =
    fileName.toLowerCase().endsWith(".xlsx") ||
    fileName.toLowerCase().endsWith(".xls");

  if (!isCSV && !isXLSX) {
    return badRequestResponse("Only .csv and .xlsx files are supported.");
  }

  let buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch {
    return badRequestResponse("Could not read file contents.");
  }

  let rows;
  try {
    // raw: true + cellDates: true allows SheetJS to preserve robust date parsing formats
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  } catch (err) {
    return serverErrorResponse("Failed to parse the uploaded file.", err);
  }

  if (!rows || rows.length === 0) {
    return badRequestResponse("The uploaded file is empty or has no data rows.");
  }

  // Optimize column key translation mapping
  const normalizedRows = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const keys = Object.keys(row);
    const normalized = {};
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j];
      normalized[key.toLowerCase().replace(/\s+/g, "")] = row[key];
    }
    normalizedRows[i] = normalized;
  }

  let packageMap;
  let existingCustomerIds;
  try {
    const [packages, existingCustomers] = await prisma.$transaction([
      prisma.package.findMany({ where: { isActive: true } }),
      prisma.customer.findMany({ select: { customerId: true } })
    ]);

    packageMap = new Map(packages.map((p) => [p.name.toLowerCase().trim(), p]));
    existingCustomerIds = new Set(existingCustomers.map((c) => c.customerId.toUpperCase()));
  } catch (err) {
    return serverErrorResponse("Failed to load schema prerequisites for import.", err);
  }

  const results = { created: [], skipped: [], failed: [] };
  const recordsToInsert = [];

  for (let i = 0; i < normalizedRows.length; i++) {
    const row = normalizedRows[i];
    const rowNum = i + 2;

    const rawCustomerId = row["customerid"] || row["customer_id"] || row["id"] || "";
    const rawName = row["name"] || row["customername"] || row["customer_name"] || "";
    const rawPackage = row["package"] || row["packagename"] || row["package_name"] || "";
    const rawAddress = row["address"] || row["addr"] || "";
    const rawStartDate = row["startdate"] || row["start_date"] || row["cyclestart"] || "";

    const customerId = String(rawCustomerId).trim().toUpperCase();
    const name = String(rawName).trim();
    const packageName = String(rawPackage).trim().toLowerCase();
    const address = String(rawAddress).trim();

    if (!customerId) {
      results.failed.push({ row: rowNum, reason: "Missing Customer ID." });
      continue;
    }
    if (!name) {
      results.failed.push({ row: rowNum, customerId, reason: "Missing customer name." });
      continue;
    }
    if (!packageName) {
      results.failed.push({ row: rowNum, customerId, reason: "Missing package name." });
      continue;
    }

    if (existingCustomerIds.has(customerId)) {
      results.skipped.push({ row: rowNum, customerId, reason: "Customer ID already exists." });
      continue;
    }

    const pkg = packageMap.get(packageName);
    if (!pkg) {
      results.failed.push({
        row: rowNum,
        customerId,
        reason: `Package "${rawPackage}" not found.`,
      });
      continue;
    }

    // Secure timezone normalization parsing structure
    let cycleStart;
    if (rawStartDate) {
      const parsed = new Date(rawStartDate);
      if (!isNaN(parsed.getTime())) {
        cycleStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
      } else {
        const today = new Date();
        cycleStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      }
    } else {
      const today = new Date();
      cycleStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    }

    const expiry = new Date(cycleStart);
    expiry.setDate(expiry.getDate() + pkg.durationDays);

    // Stage record for high-speed single bulk injection batching
    recordsToInsert.push({
      customerId,
      name,
      address: address || null,
      packageId: pkg.id,
      cycleStartDate: cycleStart,
      expiryDate: expiry,
      balanceDue: Number(pkg.price),
      status: "ACTIVE",
    });

    existingCustomerIds.add(customerId);
    results.created.push({ row: rowNum, customerId, name });
  }

  // Execute single lightning-fast bulk creation query
  if (recordsToInsert.length > 0) {
    try {
      await prisma.customer.createMany({
        data: recordsToInsert,
        skipDuplicates: true,
      });
    } catch (err) {
      return serverErrorResponse("Bulk allocation block writing phase failed.", err);
    }
  }

  return successResponse({
    message: `Import complete. Created: ${results.created.length}, Skipped: ${results.skipped.length}, Failed: ${results.failed.length}.`,
    results,
  });
}
