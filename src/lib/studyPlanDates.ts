/**
 * Date helpers for the personalized study plan. All Y-M-D strings are calendar
 * dates in the user's intended timezone (we use the client to send
 * "today" and compare using UTC on the date parts to avoid local parsing bugs).
 */

/** e.g. 2025-04-15 from a Date in local time */
export function getLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse Y-M-D to a local Date at noon (avoids midnight DST / UTC edge issues). */
export function parseYmdLocalNoon(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Inclusive of both start and end (same calendar as YMD strings, UTC). */
export function inclusiveDayCount(ymdStart: string, ymdEnd: string): number {
  const [ys, ms, ds] = ymdStart.split("-").map((x) => parseInt(x, 10));
  const [ye, me, de] = ymdEnd.split("-").map((x) => parseInt(x, 10));
  if (
    [ys, ms, ds, ye, me, de].some((n) => Number.isNaN(n)) ||
    ymdStart.length < 8 ||
    ymdEnd.length < 8
  ) {
    return 1;
  }
  const t0 = Date.UTC(ys, ms - 1, ds);
  const t1 = Date.UTC(ye, me - 1, de);
  const diff = Math.floor((t1 - t0) / 864e5) + 1;
  return Math.max(1, diff);
}

export function weeksToFitInclusiveDays(n: number): number {
  if (n <= 0) return 1;
  return Math.max(1, Math.ceil(n / 7));
}

/** Max weeks the LLM generates per request; longer calendars are extended server-side. */
export const MAX_AI_GENERATED_WEEKS = 6;
export const MAX_AI_GENERATED_DAYS = MAX_AI_GENERATED_WEEKS * 7;

export function capAiGenerationWeeks(totalWeeks: number): number {
  return Math.min(Math.max(1, totalWeeks), MAX_AI_GENERATED_WEEKS);
}

export type WeeklyPlanTemplate = {
  week: number;
  focus: string;
  tasks: string[];
  taskMeta?: unknown[];
};

/** Repeat AI-generated weekly blocks to fill the full calendar through test day. */
export function extendWeeklyPlan<T extends WeeklyPlanTemplate>(
  sourceWeeks: T[],
  targetWeekCount: number
): T[] {
  if (targetWeekCount <= 0) return [];
  if (sourceWeeks.length === 0) return [];
  if (sourceWeeks.length >= targetWeekCount) {
    return sourceWeeks.slice(0, targetWeekCount).map((week, index) => ({
      ...week,
      week: index + 1,
      tasks: [...week.tasks],
      ...(week.taskMeta ? { taskMeta: [...week.taskMeta] } : {}),
    }));
  }

  const template = sourceWeeks;
  const result: T[] = [];
  for (let index = 0; index < targetWeekCount; index += 1) {
    const source = template[index % template.length];
    result.push({
      ...source,
      week: index + 1,
      focus: source.focus,
      tasks: [...source.tasks],
      ...(source.taskMeta ? { taskMeta: [...source.taskMeta] } : {}),
    });
  }
  return result;
}

/**
 * Remove unmatched trailing ( or ) left by AI or duration-stripping (e.g. "… (algebra)" vs stray ")").
 */
export function balanceStripLooseParens(s: string): string {
  let t = s.trim();
  for (let k = 0; k < 5; k += 1) {
    const open = (t.match(/\(/g) || []).length;
    const close = (t.match(/\)/g) || []).length;
    if (close > open && t.endsWith(")")) t = t.slice(0, -1).trim();
    else if (open > close && t.endsWith("(")) t = t.slice(0, -1).trim();
    else break;
  }
  return t;
}
