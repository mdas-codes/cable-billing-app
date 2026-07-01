// app/api/customers/import/route.js
// ---------------------------------------------------------------------
// Handles bulk customer import from a CSV or XLSX file.
//
// POST /api/customers/import  — Admin only.
//                               Accepts a multipart/form-data upload
//                               with a file field named "file".
//                               Supports .csv and .xlsx formats.
//                               Skips duplicate customerIds silently.
//
// Expected columns in the file (case-insensitive, any order):
//   customerid  — Human-facing unique ID (e.g. C001, 101, CUST-5)
//   name        — Customer full name
//   package     — Package name (must exactly match an existing package)
//   address     — (optional) Customer address
//   startdate   — (optional) Cycle start date (YYYY-MM-DD). Defaults today.
//
// The importer:
//   1. Reads and parses the uploaded file in memory (no disk writes).
//   2. Looks up all existing packages by name (case-insensitive).
//   3. For each row: validates fields, skips duplicates, creates customer.
//   4. Returns a detailed report: created, skipped, and failed rows.
// ---------------------------------------------------------------------

import prisma from "@/lib/prisma";
import {
  verifyAdminPassword,
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successResponse,
} from "@/lib/auth";

// We use the 'xlsx' package (SheetJS) which handles both .csv and .xlsx.
// Install: npm install xlsx
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------
// POST /api/customers/import
// ---------------------------------------------------------------------
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

  // Read file bytes into a buffer
  let buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch {
    return badRequestResponse("Could not read file contents.");
  }

  // Parse the file using SheetJS
  let rows;
  try {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",       // empty cells become empty string, not undefined
      raw: false,       // format dates as strings
    });
  } catch (err) {
    return serverErrorResponse("Failed to parse the uploaded file.", err);
  }

  if (!rows || rows.length === 0) {
    return badRequestResponse("The uploaded file is empty or has no data rows.");
  }

  // Normalize column headers to lowercase with no spaces for flexible matching
  const normalizedRows = rows.map((row) => {
    const normalized = {};
    for (const key of Object.keys(row)) {
      normalized[key.toLowerCase().replace(/\s+/g, "")] = row[key];
    }
    return normalized;
  });

  // ------------------------------------------------------------------
  // Pre-fetch all existing packages (name → package object map)
  // and all existing customerIds to detect duplicates efficiently.
  // ------------------------------------------------------------------
  let packageMap;
  let existingCustomerIds;
  try {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
    });
    packageMap = new Map(
      packages.map((p) => [p.name.toLowerCase().trim(), p])
    );

    const existingCustomers = await prisma.customer.findMany({
      select: { customerId: true },
    });
    existingCustomerIds = new Set(
      existingCustomers.map((c) => c.customerId.toUpperCase())
    );
  } catch (err) {
    return serverErrorResponse("Failed to load existing data for import.", err);
  }

  // ------------------------------------------------------------------
  // Process each row
  // ------------------------------------------------------------------
  const results = {
    created: [],
    skipped: [],
    failed: [],
  };

  for (let i = 0; i < normalizedRows.length; i++) {
    const row = normalizedRows[i];
    const rowNum = i + 2; // +2 because row 1 is the header in the file

    // Extract fields (try multiple common column name variants)
    const rawCustomerId =
      row["customerid"] || row["customer_id"] || row["id"] || "";
    const rawName = row["name"] || row["customername"] || row["customer_name"] || "";
    const rawPackage = row["package"] || row["packagename"] || row["package_name"] || "";
    const rawAddress = row["address"] || row["addr"] || "";
    const rawStartDate = row["startdate"] || row["start_date"] || row["cyclestart"] || "";

    const customerId = String(rawCustomerId).trim().toUpperCase();
    const name = String(rawName).trim();
    const packageName = String(rawPackage).trim().toLowerCase();
    const address = String(rawAddress).trim();

    // Validate required fields
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

    // Skip duplicates
    if (existingCustomerIds.has(customerId)) {
      results.skipped.push({ row: rowNum, customerId, reason: "Customer ID already exists." });
      continue;
    }

    // Look up the package
    const pkg = packageMap.get(packageName);
    if (!pkg) {
      results.failed.push({
        row: rowNum,
        customerId,
        reason: `Package "${rawPackage}" not found. Create it first in the admin panel.`,
      });
      continue;
    }

    // Parse start date
    let cycleStart;
    if (rawStartDate) {
      const parsed = new Date(rawStartDate);
      cycleStart = isNaN(parsed.getTime()) ? new Date() : parsed;
    } else {
      cycleStart = new Date();
    }

    // Calculate expiry
    const expiry = new Date(cycleStart);
    expiry.setDate(expiry.getDate() + pkg.durationDays);

    // Create the customer
    try {
      await prisma.customer.create({
        data: {
          customerId,
          name,
          address: address || null,
          packageId: pkg.id,
          cycleStartDate: cycleStart,
          expiryDate: expiry,
          balanceDue: Number(pkg.price),
          status: "ACTIVE",
        },
      });

      // Add to the in-memory set so subsequent rows in the same file
      // don't try to create the same customer twice.
      existingCustomerIds.add(customerId);

      results.created.push({ row: rowNum, customerId, name });
    } catch (err) {
      results.failed.push({
        row: rowNum,
        customerId,
        reason: `Database error: ${err.message}`,
      });
    }
  }

  return successResponse({
    message: `Import complete. Created: ${results.created.length}, Skipped: ${results.skipped.length}, Failed: ${results.failed.length}.`,
    results,
  });
}
