/**
 * Prisma Client Singleton
 * Prevents multiple instances in development
 * 
 * Works with both local SQLite (file:./dev.db) and Turso (libsql://...)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

// Create Prisma adapter with LibSQL (works with both local SQLite and Turso)
// Turso requires TURSO_AUTH_TOKEN in env; local file:./dev.db does not
const adapterConfig: { url: string; authToken?: string } = { url: databaseUrl };
if (tursoAuthToken) {
  adapterConfig.authToken = tursoAuthToken;
}
const adapter = new PrismaLibSql(adapterConfig);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

