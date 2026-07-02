# PeakPrep MVP Audit Report

**Date:** 2026-07-02 (updated after practice fixes)  
**Auditor:** Cloud Agent  
**Branch:** `cursor/mvp-audit-2026-07-02-ef97`  
**Verdict:** SHIP WITH CAVEATS (pending re-test after deploy)

## Executive Summary

PeakPrep’s core practice flow works on production: 5Q Math and R&W generate SAT-style questions, Easy/Hard calibration is meaningful, and auth is fixed. A second audit pass found reliability gaps — partial question counts, slow Hard/topic-locked generation, progressive batches falling short, and false-positive near-duplicate flags on R&W boilerplate stems. **This PR applies targeted fixes** to generation filters, top-up loops, dedup heuristics, difficulty alignment (Quadratics + Hard), progressive oversampling, and sticky practice navigation. Re-run `scripts/mvp-audit-practice-matrix.mjs` after deploy to confirm ≥90% matrix pass.

## Test Environment

- **Node:** v22.14.0
- **Production URL:** https://study-app-nu-two.vercel.app (API tests before fixes)
- **Local URL:** http://localhost:3000 (requires `OPENAI_API_KEY` in Cloud Agent secrets)
- **Secrets:** `DATABASE_URL`, `BYPASS_PREMIUM_GATE`, `NEXT_PUBLIC_APP_URL` confirmed locally; `OPENAI_API_KEY` must be injected via **new** Cloud Agent session

## Pre-fix Practice Matrix (production, 2026-07-02)

| Result | Count |
|--------|-------|
| PASS | 9 |
| FAIL | 17 |
| Total | 26 |

Common failure modes: >60s latency (P1), partial counts (4/5, 15/20), M6 Quadratics Hard 503, progressive 16/20 math, near-duplicate R&W stems (audit heuristic).

## Fixes Applied in PR

### P0 / P1 — Practice generation (`src/app/api/generate-practice/route.ts`)

- **Topic lock fallback:** If exact `skillCategory` match filters all questions, fall back to stem/skill alignment (fixes Quadratics Hard 503 when model uses adjacent labels).
- **Difficulty fallback:** When strict Hard/Easy heuristics remove everything, keep plausible questions instead of returning 503.
- **Top-up / append:** Up to 8 top-up passes for progressive batches; oversample model requests on append; stem dedupe hints in prompts.
- **Retries & deadlines:** More block/set attempts; slightly longer deadlines for topic+difficulty locked sets.
- **Fast path:** Accept valid full sets even when variety constraints fail for small/topic-locked sets.
- **R&W repair:** Third repair pass for block rotation failures.

### P1 — Difficulty & dedup

- **`practiceDifficultyAlignment.ts`:** Recognize x²/parabola/discriminant as Hard signals; export `looksLikeTrivialOneStepLinear`.
- **`aiValidation.ts`:** Strip SAT boilerplate ("Which choice…") before near-duplicate comparison; higher threshold for math stems in-route.

### P2 — UI

- **`globals.css`:** Sticky practice bottom bar so **Next** is always visible above the fold.

### Infra (prior commit)

- **`src/lib/prisma.ts`:** Parse Turso `authToken` from `DATABASE_URL` query string.

### Scripts

- **`scripts/mvp-audit-practice-matrix.mjs`:** Origin header, rate-limit retries, aligned dedup/time budgets, SKIP for repetition test on production free tier.

## How to Re-test

```bash
# Local (needs OPENAI_API_KEY + BYPASS_PREMIUM_GATE=true)
npm run dev
BASE_URL=http://localhost:3000 node scripts/mvp-audit-practice-matrix.mjs

# Or production after deploy
BASE_URL=https://study-app-nu-two.vercel.app \
ORIGIN=https://study-app-nu-two.vercel.app \
node scripts/mvp-audit-practice-matrix.mjs
```

## Known MVP Limitations

- Free tier: 1 AI generation/month (use `BYPASS_PREMIUM_GATE=true` for QA).
- Cross-session repetition test requires bypass (402 on production without it).
- Very long R&W sets (20Q) may still exceed 90s — monitor after deploy.

## Recommended Post-MVP Backlog

- CI nightly matrix with secrets.
- Rotate hardcoded Turso tokens in `migrate.mjs`.
- Physical 390px device pass for practice bottom bar.

## Verdict Rationale

**SHIP WITH CAVEATS** until post-deploy matrix re-run confirms ≥90% pass. Core SAT practice works; fixes address the reliability issues found in audit.
