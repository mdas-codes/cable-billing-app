// lib/prisma.js
// ---------------------------------------------------------------------
// Shared Prisma Client instance for the entire application.
//
// WHY THIS FILE EXISTS:
// In development, Next.js hot-reloads constantly. Without this pattern,
// each reload creates a NEW database connection — eventually exhausting
// Supabase's connection limit and crashing the app with "too many clients"
// errors. This file solves that by saving one instance on the global object
// which survives hot-reloads in dev, while always creating a fresh single
// instance in production (Vercel serverless).
//
// Prisma 6 + @prisma/adapter-pg is required for Supabase's connection
// pooler (pgbouncer) to work correctly with prepared statements disabled.
// ---------------------------------------------------------------------

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
const { Pool } = pkg;

// Build the pg connection pool using Supabase's transaction pooler URL.
// pgbouncer=true in the URL tells Prisma to disable prepared statements,
// which are not supported in transaction pooling mode.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Maximum connections this serverless function will hold open.
  // Keep this low for Supabase free tier (max 15 total).
  max: 2,
  // Kill idle connections after 10 seconds to free up Supabase slots.
  idleTimeoutMillis: 10000,
  // Fail fast if a connection can't be established in 5 seconds.
  connectionTimeoutMillis: 5000,
});

// The driver adapter bridges Prisma's query engine to the pg Pool above.
const adapter = new PrismaPg(pool);

// ---------------------------------------------------------------------
// Singleton factory — the core of this file.
// In development:  reuse the instance cached on `global` across reloads.
// In production:   just create one fresh instance (no caching needed).
// ---------------------------------------------------------------------
function createPrismaClient() {
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });
}

// Use a global symbol so the instance survives Next.js hot-module reloads.
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
