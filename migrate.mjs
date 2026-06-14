import { execSync } from 'child_process';
import fs from 'fs';

try { fs.renameSync('prisma.config.ts', 'prisma.config.ts.bak'); } catch(e) {}

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
  fs.writeFileSync('migrate.log', e.stdout + '\n' + e.stderr);
  console.error("Migration failed");
}

try { fs.renameSync('prisma.config.ts.bak', 'prisma.config.ts'); } catch(e) {}
