# AGENTS.md

## Cursor Cloud specific instructions

### Overview

PeakPrep is an AI-powered SAT preparation app built with Next.js 16 (App Router), Prisma/SQLite, and Tailwind CSS 4. It is a single-service application (no Docker, no external databases).

### Standard commands

See `package.json` scripts and the README for full details:

- **Dev server:** `npm run dev` (port 3000, uses Turbopack)
- **Lint:** `npm run lint`
- **Build:** `npm run build`
- **DB migrations:** `npx prisma migrate dev`
- **DB studio:** `npx prisma studio`

### Non-obvious caveats

- **`.env` file required:** The repo does not include a `.env` or `.env.example` in version control. At minimum, create `.env` with `DATABASE_URL="file:./dev.db"` and `NEXT_PUBLIC_APP_URL="http://localhost:3000"`. The Prisma config (`prisma.config.ts`) reads `DATABASE_URL` via dotenv.
- **Stripe gracefully degrades:** If `STRIPE_SECRET_KEY` is not set, the Stripe client initializes to `null` and the app runs without payment features. No dummy key needed.
- **OpenAI API key optional for basic navigation:** AI-powered features (practice test generation, flashcards, study plans, lessons) require `OPENAI_API_KEY`, but the app boots and non-AI pages work without it. The OpenAI client is lazily initialized (`src/lib/openai.ts`) so the build succeeds even without the key.
- **Prisma postinstall:** `npm install` automatically runs `prisma generate` via the postinstall script. No separate generate step needed after install.
- **SQLite DB file:** `dev.db` is gitignored. On a fresh checkout, run `npx prisma migrate dev` to create it.
- **Middleware (CSRF):** `src/middleware.ts` enforces origin checking on all mutating API requests. Stripe webhooks are excluded (they use signature verification). Next.js 16 shows a deprecation warning about middleware→proxy; this is cosmetic and does not affect functionality.
- **Rate limiting:** Auth routes (`/api/auth/login`, `/api/auth/register`) use an in-memory rate limiter (`src/lib/rate-limit.ts`). Limits reset on cold starts in serverless; for production use Vercel Edge Config or @upstash/ratelimit.
- **Security headers:** Configured globally in `next.config.ts` `headers()` — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Free tier enforcement:** Server-side via `src/utils/premiumGate.ts`, which counts DB records per user/session per month. The client-side `src/utils/premiumCheck.ts` is dead code (not imported anywhere).
