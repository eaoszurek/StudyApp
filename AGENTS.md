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
- **OpenAI API key optional for basic navigation:** AI-powered features (practice test generation, flashcards, study plans, lessons) require `OPENAI_API_KEY`, but the app boots and non-AI pages work without it.
- **`npm run build` has a pre-existing TS error** in `src/app/api/generate-question/route.ts` (variable used before declaration). The dev server (`npm run dev`) works fine despite this.
- **Prisma postinstall:** `npm install` automatically runs `prisma generate` via the postinstall script. No separate generate step needed after install.
- **SQLite DB file:** A `dev.db` file is committed to the repo with migrations already applied. `npx prisma migrate dev` confirms "already in sync" on a fresh checkout.
