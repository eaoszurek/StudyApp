import { execSync } from 'child_process';
import fs from 'fs';

try { fs.renameSync('prisma.config.ts', 'prisma.config.ts.bak'); } catch {}

try {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run Prisma migrations.');
  }

  console.log("Running prisma migrate deploy...");
  const out = execSync('npx prisma migrate deploy', {
    env: { 
      ...process.env, 
      DATABASE_URL: databaseUrl
    },
    encoding: 'utf-8'
  });
  fs.writeFileSync('migrate.log', out);
} catch(e) {
  const stdout = e && typeof e === 'object' && 'stdout' in e ? String(e.stdout ?? '') : '';
  const stderr = e && typeof e === 'object' && 'stderr' in e ? String(e.stderr ?? '') : '';
  const message = e instanceof Error ? e.stack || e.message : String(e);
  fs.writeFileSync('migrate.log', `${stdout}\n${stderr}\n${message}`);
  console.error("Migration failed");
  process.exitCode = 1;
}

try { fs.renameSync('prisma.config.ts.bak', 'prisma.config.ts'); } catch {}
