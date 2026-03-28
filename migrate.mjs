import { execSync } from 'child_process';
import fs from 'fs';

try { fs.renameSync('prisma.config.ts', 'prisma.config.ts.bak'); } catch(e) {}

try {
  console.log("Running prisma migrate deploy...");
  const out = execSync('npx prisma migrate deploy', {
    env: { 
      ...process.env, 
      DATABASE_URL: "libsql://peakprep-eaoszurek.aws-us-east-1.turso.io?authToken=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzIxNDg5ODgsImlkIjoiMDE5YzljNGItOTkwMS03ZTM1LWFhZGQtOTZkNzM1NTIwMjMwIiwicmlkIjoiNTQ3YzhjMTYtMzQ0Yy00YTUxLTg3NzctOGJmOTY1MmY2ZjEwIn0.J8IamMd7SBnDlGjAIHcPy5lYSOlmLLBALzSNWnrjIjW-Bj-l0sHb4oe9X1HyiLwzQhje73haxbXihfeixnO4BA"
    },
    encoding: 'utf-8'
  });
  fs.writeFileSync('migrate.log', out);
} catch(e) {
  fs.writeFileSync('migrate.log', e.stdout + '\n' + e.stderr);
  console.error("Migration failed");
}

try { fs.renameSync('prisma.config.ts.bak', 'prisma.config.ts'); } catch(e) {}
