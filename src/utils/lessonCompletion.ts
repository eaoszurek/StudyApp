/**
 * Lightweight client-side tracking of completed micro-lessons.
 *
 * A lesson is "completed" when the student answers at least one of the inline
 * practice questions at the end of the lesson. We store a record keyed by the
 * topic name → ISO date string, capped to MAX_ENTRIES newest entries.
 */

const STORAGE_KEY = "peakprep_completed_lessons";
const MAX_ENTRIES = 100;

export type CompletedLessonsMap = Record<string, string>;

function safeParse(raw: string | null): CompletedLessonsMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as CompletedLessonsMap;
    }
  } catch {
    // ignore
  }
  return {};
}

export function getCompletedLessons(): CompletedLessonsMap {
  if (typeof window === "undefined") return {};
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function isLessonCompleted(topic: string): boolean {
  if (!topic) return false;
  const map = getCompletedLessons();
  return Boolean(map[topic.trim()]);
}

export function markLessonCompleted(topic: string): void {
  if (typeof window === "undefined") return;
  const trimmed = (topic || "").trim();
  if (!trimmed) return;
  const map = getCompletedLessons();
  map[trimmed] = new Date().toISOString();
  // Keep only the newest MAX_ENTRIES by ISO date
  const entries = Object.entries(map)
    .sort(([, a], [, b]) => (a < b ? 1 : -1))
    .slice(0, MAX_ENTRIES);
  const compact: CompletedLessonsMap = {};
  for (const [k, v] of entries) compact[k] = v;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
  } catch {
    // ignore quota errors
  }
}
