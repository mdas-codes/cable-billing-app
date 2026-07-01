// lib/auth.js
// ---------------------------------------------------------------------
// Lightweight admin authentication helper.
//
// There is no login system or JWT — just a single password stored in
// the .env file as ADMIN_PASSWORD. This is intentional: the app is
// used by two known people (admin + collector) on trusted devices.
//
// HOW IT WORKS:
// - The collector page (/) is fully public — no password needed.
// - The admin page (/admin) asks for a password in the browser.
// - That password is sent as a header "x-admin-password" with every
//   admin API request.
// - Every protected API route calls verifyAdminPassword(request) first
//   and returns 401 immediately if it doesn't match.
// - The password is also stored in sessionStorage on the browser side
//   so the admin doesn't have to re-enter it every time they tap a button.
// ---------------------------------------------------------------------

/**
 * Verifies the admin password from an incoming Next.js API request.
 * Reads the password from the "x-admin-password" request header and
 * compares it against the ADMIN_PASSWORD environment variable.
 *
 * @param {Request} request - The incoming Next.js App Router request object.
 * @returns {{ ok: boolean, error?: string }} Result object.
 */
export function verifyAdminPassword(request) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error(
      "CRITICAL: ADMIN_PASSWORD is not set in environment variables."
    );
    return {
      ok: false,
      error: "Server misconfiguration: admin password not set.",
    };
  }

  const providedPassword = request.headers.get("x-admin-password");

  if (!providedPassword) {
    return {
      ok: false,
      error: "No password provided.",
    };
  }

  if (providedPassword !== adminPassword) {
    return {
      ok: false,
      error: "Incorrect password.",
    };
  }

  return { ok: true };
}

/**
 * Builds a standard 401 Unauthorized JSON response.
 * Used by API routes when verifyAdminPassword returns ok: false.
 *
 * @param {string} message - Human-readable error message.
 * @returns {Response} Next.js Response object with 401 status.
 */
export function unauthorizedResponse(message = "Unauthorized.") {
  return Response.json(
    { success: false, error: message },
    { status: 401 }
  );
}

/**
 * Builds a standard 500 Internal Server Error JSON response.
 * Used by API routes to return a clean error when something goes wrong
 * on the server so the app never crashes silently.
 *
 * @param {string} message - Human-readable error message.
 * @param {Error} [err] - Optional original error for server-side logging.
 * @returns {Response} Next.js Response object with 500 status.
 */
export function serverErrorResponse(message = "Internal server error.", err) {
  if (err) {
    console.error(`[SERVER ERROR] ${message}`, err);
  }
  return Response.json(
    { success: false, error: message },
    { status: 500 }
  );
}

/**
 * Builds a standard 400 Bad Request JSON response.
 * Used when the client sends missing or invalid data.
 *
 * @param {string} message - Human-readable error message.
 * @returns {Response} Next.js Response object with 400 status.
 */
export function badRequestResponse(message = "Bad request.") {
  return Response.json(
    { success: false, error: message },
    { status: 400 }
  );
}

/**
 * Builds a standard 200 OK JSON response with a data payload.
 *
 * @param {object} data - The payload to return to the client.
 * @returns {Response} Next.js Response object with 200 status.
 */
export function successResponse(data) {
  return Response.json(
    { success: true, ...data },
    { status: 200 }
  );
}
