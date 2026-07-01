/**
 * Local-only weekly practice goal.
 *
 * Tracks how many practice sessions the student has completed in the current
 * week (Monday-anchored). Default target is 3 sessions/week. Resets the
 * counter automatically when the week changes.
 */

const STORAGE_KEY = "peakprep_weekly_goal";
const DEFAULT_TARGET = 3;

export interface WeeklyGoalState {
  targetSessionsPerWeek: number;
  /** YYYY-MM-DD of the Monday that anchors the current week. */
  weekStartYmd: string;
  sessionsThisWeek: number;
}

function getLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Find the Monday-anchored week start for the given date (Monday = day 1).
 * Sundays roll back 6 days; other days roll back to that week's Monday.
 */
export function getWeekStartYmd(date: Date = new Date()): string {
  const day = date.getDay(); // 0 (Sun) – 6 (Sat)
  const offsetToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(date.getDate() - offsetToMonday);
  return getLocalYmd(monday);
}

function safeParse(raw: string | null): WeeklyGoalState {
  const fallback: WeeklyGoalState = {
    targetSessionsPerWeek: DEFAULT_TARGET,
    weekStartYmd: getWeekStartYmd(),
    sessionsThisWeek: 0,
  };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      targetSessionsPerWeek:
        Number.isFinite(parsed.targetSessionsPerWeek) && Number(parsed.targetSessionsPerWeek) > 0
          ? Math.min(14, Math.max(1, Math.round(Number(parsed.targetSessionsPerWeek))))
          : DEFAULT_TARGET,
      weekStartYmd:
        typeof parsed.weekStartYmd === "string" && parsed.weekStartYmd.length >= 10
          ? parsed.weekStartYmd.slice(0, 10)
          : fallback.weekStartYmd,
      sessionsThisWeek:
        Number.isFinite(parsed.sessionsThisWeek) && Number(parsed.sessionsThisWeek) >= 0
          ? Math.min(99, Math.round(Number(parsed.sessionsThisWeek)))
          : 0,
    };
  } catch {
    return fallback;
  }
}

function persist(state: WeeklyGoalState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota
  }
}

/**
 * Read the current weekly goal state. If the stored week is stale (a new
 * Monday has passed), this resets the counter and persists the new week.
 */
export function getWeeklyGoalState(now: Date = new Date()): WeeklyGoalState {
  if (typeof window === "undefined") {
    return {
      targetSessionsPerWeek: DEFAULT_TARGET,
      weekStartYmd: getWeekStartYmd(now),
      sessionsThisWeek: 0,
    };
  }
  const state = safeParse(window.localStorage.getItem(STORAGE_KEY));
  const currentWeekStart = getWeekStartYmd(now);
  if (state.weekStartYmd !== currentWeekStart) {
    const reset: WeeklyGoalState = {
      targetSessionsPerWeek: state.targetSessionsPerWeek,
      weekStartYmd: currentWeekStart,
      sessionsThisWeek: 0,
    };
    persist(reset);
    return reset;
  }
  return state;
}

/**
 * Increment the weekly counter by one (called from the practice page on
 * completion). Returns the updated state.
 */
export function recordWeeklyPractice(now: Date = new Date()): WeeklyGoalState {
  const state = getWeeklyGoalState(now);
  const next: WeeklyGoalState = {
    ...state,
    sessionsThisWeek: state.sessionsThisWeek + 1,
  };
  persist(next);
  return next;
}

export function setWeeklyGoalTarget(target: number, now: Date = new Date()): WeeklyGoalState {
  const safeTarget = Math.min(14, Math.max(1, Math.round(target)));
  const state = getWeeklyGoalState(now);
  const next: WeeklyGoalState = { ...state, targetSessionsPerWeek: safeTarget };
  persist(next);
  return next;
}
