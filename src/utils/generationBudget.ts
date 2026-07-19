type RetryBudgetOptions = {
  deadlineAt: number;
  requestedTimeoutMs: number;
  attempts: number;
  now?: number;
  minimumRemainingMs?: number;
};

/**
 * Limits each retry so one model candidate cannot run past the request budget.
 * Returns null when there is not enough time left to start another request.
 */
export function getBudgetedRetryTimeout({
  deadlineAt,
  requestedTimeoutMs,
  attempts,
  now = Date.now(),
  minimumRemainingMs = 5_000,
}: RetryBudgetOptions): number | null {
  const remainingMs = deadlineAt - now;
  if (remainingMs <= minimumRemainingMs) return null;

  const safeAttempts = Math.max(1, Math.floor(attempts));
  const budgetPerAttempt = Math.floor(
    (remainingMs - minimumRemainingMs) / safeAttempts
  );

  return Math.max(1, Math.min(requestedTimeoutMs, budgetPerAttempt));
}
