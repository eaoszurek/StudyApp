/**
 * Local-only practice streak tracking.
 *
 * On each completed practice session we call `recordPracticeDay()`. The streak
 * counts consecutive days. Same-day repeats are idempotent (no double-count).
 * Gap > 1 day resets the current streak to 1 (the new day still counts).
 */

const STORAGE_KEY = "peakprep_streak";

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  /** YYYY-MM-DD of the most recent practice day. */
  lastDateYmd: string | null;
}

const defaultState: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastDateYmd: null,
};

function getLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(aYmd: string, bYmd: string): number {
  const a = new Date(`${aYmd}T12:00:00`);
  const b = new Date(`${bYmd}T12:00:00`);
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function safeParse(raw: string | null): StreakState {
  if (!raw) return { ...defaultState };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        currentStreak: Number.isFinite(parsed.currentStreak) ? Number(parsed.currentStreak) : 0,
        longestStreak: Number.isFinite(parsed.longestStreak) ? Number(parsed.longestStreak) : 0,
        lastDateYmd: typeof parsed.lastDateYmd === "string" ? parsed.lastDateYmd : null,
      };
    }
  } catch {
    // ignore
  }
  return { ...defaultState };
}

export function getStreakState(): StreakState {
  if (typeof window === "undefined") return { ...defaultState };
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

/**
 * Mark today as a practice day and update streak. Returns the new state.
 * Idempotent within the same calendar day.
 */
export function recordPracticeDay(date: Date = new Date()): StreakState {
  if (typeof window === "undefined") return { ...defaultState };
  const todayYmd = getLocalYmd(date);
  const state = getStreakState();
  if (state.lastDateYmd === todayYmd) {
    return state; // already recorded today
  }

  let nextCurrent = 1;
  if (state.lastDateYmd) {
    const gap = daysBetween(state.lastDateYmd, todayYmd);
    if (gap === 1) {
      nextCurrent = state.currentStreak + 1;
    } else if (gap === 0) {
      nextCurrent = state.currentStreak; // shouldn't happen given idempotency, but keep safe
    } else {
      nextCurrent = 1;
    }
  }
  const next: StreakState = {
    currentStreak: nextCurrent,
    longestStreak: Math.max(state.longestStreak, nextCurrent),
    lastDateYmd: todayYmd,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota
  }
  return next;
}

/**
 * Whole-day gap between the last practice day and today. Returns null when no
 * prior practice exists. Used by the dashboard re-engagement nudge.
 */
export function getDaysSinceLastPractice(now: Date = new Date()): number | null {
  const state = getStreakState();
  if (!state.lastDateYmd) return null;
  return daysBetween(state.lastDateYmd, getLocalYmd(now));
}
