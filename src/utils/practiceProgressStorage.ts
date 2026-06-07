const LEGACY_PRACTICE_PROGRESS_KEY = "sat_practice_in_progress_v1";
const PRACTICE_PROGRESS_KEY_PREFIX = `${LEGACY_PRACTICE_PROGRESS_KEY}:`;

export function getPracticeProgressKey(userId: string): string {
  return `${PRACTICE_PROGRESS_KEY_PREFIX}${userId}`;
}

export function clearLegacyPracticeProgress(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_PRACTICE_PROGRESS_KEY);
}

export function clearPracticeProgressForUser(userId: string): void {
  if (typeof window === "undefined") return;
  clearLegacyPracticeProgress();
  window.localStorage.removeItem(getPracticeProgressKey(userId));
}

export function clearAllPracticeProgress(): void {
  if (typeof window === "undefined") return;
  clearLegacyPracticeProgress();
  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(PRACTICE_PROGRESS_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}
