import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

const dbUrl = "libsql://peakprep-eaoszurek.aws-us-east-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzIxNDg5ODgsImlkIjoiMDE5YzljNGItOTkwMS03ZTM1LWFhZGQtOTZkNzM1NTIwMjMwIiwicmlkIjoiNTQ3YzhjMTYtMzQ0Yy00YTUxLTg3NzctOGJmOTY1MmY2ZjEwIn0.J8IamMd7SBnDlGjAIHcPy5lYSOlmLLBALzSNWnrjIjW-Bj-l0sHb4oe9X1HyiLwzQhje73haxbXihfeixnO4BA";

const client = createClient({
  url: dbUrl,
  authToken: authToken,
});

async function run() {
  const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory() && e.name !== 'migration_lock.toml').map(e => e.name).sort();
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" TEXT PRIMARY KEY,
        "checksum" TEXT NOT NULL,
        "finished_at" DATETIME,
        "migration_name" TEXT NOT NULL,
        "logs" TEXT,
        "rolled_back_at" DATETIME,
        "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `);

  for (const dir of dirs) {
    console.log(`Checking migration: ${dir}`);
    const res = await client.execute({
      sql: 'SELECT * FROM _prisma_migrations WHERE migration_name = ?',
      args: [dir]
    });
    
    if (res.rows.length === 0) {
      console.log(`Applying ${dir}...`);
      const sqlPath = path.join(migrationsDir, dir, 'migration.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      try {
        await client.executeMultiple(sql);
      } catch(e) {
        console.error(`Error executing migration ${dir}`);
        console.error(e);
        throw e;
      }
      
      await client.execute({
        sql: `INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [
          Math.random().toString(36).substring(2) + Date.now().toString(36),
          "manual-checksum",
          dir
        ]
      });
      console.log(`Applied ${dir} successfully.`);
    } else {
      console.log(`${dir} already applied.`);
    }
  }
  console.log("All migrations applied successfully.");
}

run().catch(e => {
  fs.writeFileSync('turso.log', e.stack || e.toString());
  console.error("Failed, check turso.log");
  process.exit(1);
});
