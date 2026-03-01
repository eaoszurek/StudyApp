/**
 * Apply Prisma migrations to Turso (libsql).
 * Prisma CLI does not accept libsql:// for migrate deploy, so we run the SQL here.
 *
 * Usage (PowerShell):
 *   $env:DATABASE_URL="libsql://your-db-username.turso.io"
 *   $env:TURSO_AUTH_TOKEN="your-token"
 *   node scripts/apply-turso-migrations.mjs
 */

import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "prisma", "migrations");

const databaseUrl = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl || !databaseUrl.startsWith("libsql://")) {
  console.error("Set DATABASE_URL to your Turso URL (libsql://...).");
  process.exit(1);
}
if (!authToken) {
  console.error("Set TURSO_AUTH_TOKEN to your Turso auth token.");
  process.exit(1);
}

const client = createClient({ url: databaseUrl, authToken: authToken });

// Migration folders sorted by name (timestamp)
const folders = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((name) => {
    try {
      return readdirSync(join(migrationsDir, name)).includes("migration.sql");
    } catch {
      return false;
    }
  })
  .sort();

console.log("Migrations to apply:", folders.join(", "));

for (const folder of folders) {
  const sqlPath = join(migrationsDir, folder, "migration.sql");
  const sql = readFileSync(sqlPath, "utf8");
  // Split by semicolon; strip leading comments from each segment
  const rawParts = sql.split(";");
  const statements = rawParts
    .map((part) =>
      part
        .replace(/^\s*\/\*[\s\S]*?\*\/\s*/g, "")
        .replace(/^\s*--[^\n]*\n/gm, "")
        .trim()
    )
    .filter((s) => s.length > 0);

  console.log("\nApplying", folder, "(" + statements.length + " statements)");
  for (const stmt of statements) {
    try {
      await client.execute(stmt + ";");
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("already exists") || msg.includes("duplicate column name")) {
        console.warn("  (skipped - already exists)");
      } else {
        console.error("  Failed:", stmt.slice(0, 80) + "...");
        throw e;
      }
    }
  }
}

console.log("\nDone. Turso schema is up to date.");
client.close();
