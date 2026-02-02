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

// Create Prisma adapter with LibSQL (works with both local SQLite and Turso)
// PrismaLibSql accepts the config directly, not a client instance
const adapter = new PrismaLibSql({
  url: databaseUrl,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

