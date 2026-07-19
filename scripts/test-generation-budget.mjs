/* eslint-disable no-console */
import assert from "node:assert/strict";
import { getBudgetedRetryTimeout } from "../src/utils/generationBudget.ts";

const now = 1_000_000;

assert.equal(
  getBudgetedRetryTimeout({
    now,
    deadlineAt: now + 200_000,
    requestedTimeoutMs: 60_000,
    attempts: 3,
  }),
  60_000,
  "keeps the requested timeout when the request has ample time"
);

assert.equal(
  getBudgetedRetryTimeout({
    now,
    deadlineAt: now + 40_000,
    requestedTimeoutMs: 60_000,
    attempts: 3,
  }),
  11_666,
  "divides the remaining request budget across retries"
);

assert.equal(
  getBudgetedRetryTimeout({
    now,
    deadlineAt: now + 5_000,
    requestedTimeoutMs: 60_000,
    attempts: 3,
  }),
  null,
  "does not start another model request without the minimum reserve"
);

const remainingMs = 25_000;
const attempts = 3;
const timeoutMs = getBudgetedRetryTimeout({
  now,
  deadlineAt: now + remainingMs,
  requestedTimeoutMs: 60_000,
  attempts,
});

assert.notEqual(timeoutMs, null);
assert.ok(
  timeoutMs * attempts <= remainingMs - 5_000,
  "all retries fit inside the remaining request budget"
);

console.log("Generation budget tests passed.");
