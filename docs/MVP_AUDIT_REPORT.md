# PeakPrep MVP Audit Report

**Date:** 2026-07-02  
**Auditor:** Cloud Agent  
**Branch:** `cursor/mvp-audit-2026-07-02-ef97`  
**Verdict:** NOT READY

## Executive Summary

PeakPrep’s non-AI surfaces are in good shape locally: auth, CSRF protection, static/SEO pages, navigation, and flashcard removal all pass. Build and lint succeed (0 errors; 200 pre-existing warnings). However, this audit **cannot certify MVP readiness** because (1) `OPENAI_API_KEY` was not available in Cloud Agent secrets, blocking the full practice-generation matrix and all AI smoke tests locally, and (2) **production auth is broken** — `POST /api/auth/register` and `POST /api/auth/login` return HTTP 500 on https://study-app-nu-two.vercel.app, preventing sign-up and sign-in in production. A fix was applied in this PR for Turso `authToken` embedded in `DATABASE_URL` (documented in `DATABASE_SETUP.md` but previously ignored by `src/lib/prisma.ts`). Production must be redeployed and verified after merge.

## Test Environment

- **Node:** v22.14.0
- **Commit SHA:** `f8913c8058f6dc615234ab4566a8d0a78bdffd6a` (base) + audit branch fixes
- **Local URL:** `http://localhost:3000`
- **Production URL (smoke only):** `https://study-app-nu-two.vercel.app`
- **Secrets configured:** `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `BYPASS_PREMIUM_GATE` (local `.env`)
- **Secrets missing:** `OPENAI_API_KEY` (required for AI audit), `TURSO_AUTH_TOKEN` (not injected; may exist only inside Vercel `DATABASE_URL`)

## Results Summary Table

| Area | Pass | Warn | Fail |
|------|------|------|------|
| Build & lint | 2 | 0 | 0 |
| Auth (local API) | 7 | 0 | 0 |
| Security (CSRF) | 1 | 0 | 0 |
| IDOR (practice score/append) | 0 | 2 | 0 |
| Pages / SEO / flashcard removal | 9 | 0 | 0 |
| Premium gate | 0 | 1 | 1 |
| AI smoke (`ai-smoke.mjs`) | 0 | 0 | 5 |
| Practice quality scripts | 0 | 0 | 3 |
| Practice matrix (M1–R9, progressive) | 0 | 0 | 26 |
| Browser UI (local) | 7 | 1 | 0 |
| Production smoke | 2 | 0 | 2 |

## Practice Matrix Results

| ID | Label | Status | Time(ms) | Issues |
|----|-------|--------|----------|--------|
| M1 | 5Q Mixed | **SKIP** | — | `OPENAI_API_KEY` not configured locally |
| M2 | 5Q Easy | **SKIP** | — | same |
| M3 | 5Q Medium | **SKIP** | — | same |
| M4 | 5Q Hard | **SKIP** | — | same |
| M5 | 5Q Linear Equations | **SKIP** | — | same |
| M6 | 5Q Quadratics Hard | **SKIP** | — | same |
| M7 | 5Q Statistics | **SKIP** | — | same |
| M8 | 5Q Trigonometry | **SKIP** | — | same |
| M9 | 10Q Mixed | **SKIP** | — | same |
| M10 | 15Q Mixed | **SKIP** | — | same |
| M11 | 20Q Mixed | **SKIP** | — | same |
| M12 | 25Q Mixed | **SKIP** | — | same |
| M13 | 20Q Systems | **SKIP** | — | same |
| R1 | 5Q R&W Mixed | **SKIP** | — | same |
| R2E/R2H | 5Q R&W Easy/Hard | **SKIP** | — | same |
| R3 | Words in Context | **SKIP** | — | same |
| R4 | Command of Evidence | **SKIP** | — | same |
| R5 | Transitions | **SKIP** | — | same |
| R6 | Sentence Boundaries | **SKIP** | — | same |
| R7 | 10Q R&W Mixed | **SKIP** | — | same |
| R8 | 20Q R&W Mixed | **SKIP** | — | same |
| R9 | legacy `writing` section | **SKIP** | — | same |
| P1-MATH | Progressive 20Q math | **SKIP** | — | same |
| P1-RW | Progressive 20Q R&W | **SKIP** | — | same |
| REP1 | Cross-session repetition | **SKIP** | — | same |

**Note:** `scripts/mvp-audit-practice-matrix.mjs` was added for reproducibility. Re-run after setting `OPENAI_API_KEY` and `BYPASS_PREMIUM_GATE=true`:

```bash
BASE_URL=http://localhost:3000 node scripts/mvp-audit-practice-matrix.mjs
```

## Phase 1 Automated Baseline

| Script | Result | Notes |
|--------|--------|-------|
| `npm run build` | **PASS** | 0 errors |
| `npm run lint` | **PASS** | 0 errors, 200 warnings (pre-existing) |
| `node scripts/ai-smoke.mjs` | **FAIL** | All 5 endpoints HTTP 500 — missing OpenAI key |
| `SMOKE_ISOLATE_USERS=true node scripts/ai-smoke.mjs` | **FAIL** | same |
| `node scripts/test-practice-quality.mjs` | **FAIL** | cannot generate without OpenAI key |
| `node scripts/test-long-generation.mjs` | **FAIL** | cannot generate without OpenAI key |
| `node scripts/mvp-audit-non-ai.mjs` | **PASS** | 20/21 (gate test flaky under register rate limit) |

`ai-smoke.mjs` still uses `section: "writing"` for practice — UI uses `reading-writing`; R9 in matrix covers legacy compat.

## Browser Test Log

| Step | Result | Notes |
|------|--------|-------|
| Landing `/` loads, no flashcards | **PASS** | CTAs work |
| Sign up → dashboard | **PASS** | `test-browser-*@example.com` |
| Sidebar nav (4 tools + dashboard) | **PASS** | No Flashcards link |
| Practice 5Q Math start | **PASS** | Expected error: OpenAI key not configured |
| Session recovery banner | **SKIP** | Requires generated test |
| Dark mode toggle | **PASS** | Settings panel |
| `/privacy`, `/terms`, `/support` | **PASS** | |
| Mobile 390px layout | **WARN** | Desktop OK; DevTools resize inconclusive |

## Issues Found

### P0

- [ ] **PROD-AUTH-500** — Production register/login return HTTP 500 (`An unexpected error occurred`). Likely Turso DB auth misconfiguration: `DATABASE_URL` may embed `?authToken=` while `src/lib/prisma.ts` only read `TURSO_AUTH_TOKEN`. **Fix applied** in `src/lib/prisma.ts` to parse embedded token. Requires deploy + verify.
- [ ] **AUDIT-BLOCKED-AI** — `OPENAI_API_KEY` not present in Cloud Agent secrets; full practice matrix unrunnable. Set secret and re-run matrix before merge.

### P1

- [ ] **RATE-LIMIT-REGISTER** — Auth register rate limit (5/min/IP) causes audit script flakes when creating many users sequentially. Consider `MATRIX_FILTER` batches or brief delays in `mvp-audit-practice-matrix.mjs`.
- [ ] **IDOR-UNVERIFIED** — IDOR tests for score PATCH and progressive `existingTestId` append were skipped locally (no practice generation). Code review shows ownership checks present in `practice-tests/[id]/score` and `generate-practice` routes; needs live verification with OpenAI key.

### P2

- [ ] **MOBILE-390** — Full iPhone-width practice layout not verified in browser automation.
- [ ] **LINT-WARNINGS** — 200 ESLint warnings (mostly `@typescript-eslint/no-explicit-any`, `react-hooks/set-state-in-effect`).
- [ ] **HARDCODED-TURSO-TOKENS** — `migrate.mjs` and `run-turso-migrations.mjs` contain embedded Turso credentials in repo (security hygiene; rotate tokens).

### P3

- [ ] **PREMIUM-GATE-BYPASS-DOC** — `BYPASS_PREMIUM_GATE` must be set for audit env; document in Cloud Agent onboarding.

## Fixes Applied in PR

- **`src/lib/prisma.ts`** — Parse `authToken` from `DATABASE_URL` query string when `TURSO_AUTH_TOKEN` is unset; supports documented Turso connection format.
- **`scripts/mvp-audit-practice-matrix.mjs`** — Full Section 3 matrix (M1–M13, R1–R9, progressive, repetition) with per-case fresh users.
- **`scripts/mvp-audit-non-ai.mjs`** — Auth, CSRF, pages, flashcard checks, IDOR/gate spot-checks.

## Known MVP Limitations (acceptable)

- Free tier: 1 AI generation/month across practice + study plan + lessons (enforced server-side).
- Short tests show raw score / ranges, not point-precise 1600-scale estimates.
- Stripe optional locally; payment features degrade gracefully.
- `writing` section alias retained for API backward compat (`ai-smoke.mjs`).

## Recommended Post-MVP Backlog

- Rotate/remove hardcoded Turso tokens from `migrate.mjs` / `run-turso-migrations.mjs`.
- Add CI job: `mvp-audit-non-ai.mjs` on every PR; matrix on nightly with secrets.
- Reduce ESLint warning count (target &lt; 50).
- Physical device pass at 390px for practice bottom bar and R&W split layout.
- Session recovery E2E test once OpenAI key available in CI.

## Production Smoke Results

| Check | Result |
|-------|--------|
| Landing `/` HTTP 200 | **PASS** |
| Sitemap no `/flashcards` | **PASS** |
| `POST /api/auth/register` | **FAIL** — HTTP 500 |
| `POST /api/auth/login` | **FAIL** — HTTP 500 |
| `GET /api/auth/me` (anon) | **PASS** — `{ user: null }` |
| `POST /api/generate-practice` (anon) | **PASS** — 401 Sign in required |
| Full 5Q practice on production | **NOT RUN** — auth blocked |

## Reproduce

```bash
npm install
# .env: DATABASE_URL, NEXT_PUBLIC_APP_URL, BYPASS_PREMIUM_GATE=true, OPENAI_API_KEY=sk-...
npx prisma migrate dev
npm run dev

node scripts/mvp-audit-non-ai.mjs
node scripts/ai-smoke.mjs
node scripts/mvp-audit-practice-matrix.mjs
```

## Verdict Rationale

Per Section 8 criteria: **open P0** (production auth broken; AI audit incomplete) → **NOT READY**. After merging the Prisma Turso fix, redeploying, configuring `OPENAI_API_KEY` in Cloud Agent secrets, and re-running the practice matrix with ≥90% pass rate, reassess for SHIP or SHIP WITH CAVEATS.
