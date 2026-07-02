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

function resolveLibSqlConfig(): { url: string; authToken?: string } {
  const rawUrl = process.env.DATABASE_URL || "file:./dev.db";
  const envToken = process.env.TURSO_AUTH_TOKEN?.trim();

  // Support authToken embedded in DATABASE_URL (documented in DATABASE_SETUP.md)
  // as well as a separate TURSO_AUTH_TOKEN env var (README / Vercel convention).
  if (rawUrl.startsWith("libsql://")) {
    try {
      const parsed = new URL(rawUrl);
      const queryToken = parsed.searchParams.get("authToken")?.trim();
      if (queryToken) {
        parsed.searchParams.delete("authToken");
        const cleaned = parsed.toString();
        return {
          url: cleaned,
          authToken: envToken || queryToken,
        };
      }
    } catch {
      // Fall through to raw URL if parsing fails
    }
    if (envToken) {
      return { url: rawUrl, authToken: envToken };
    }
  }

  return { url: rawUrl, authToken: envToken || undefined };
}

const adapterConfig = resolveLibSqlConfig();
const adapter = new PrismaLibSql(adapterConfig);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

