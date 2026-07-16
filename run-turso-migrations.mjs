/**
 * Compatibility wrapper for applying Prisma migrations to Turso.
 *
 * Required environment:
 *   DATABASE_URL=libsql://your-db.turso.io
 *   TURSO_AUTH_TOKEN=your-token
 */
import "./scripts/apply-turso-migrations.mjs";
