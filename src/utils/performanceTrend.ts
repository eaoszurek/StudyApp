import type { PracticeSession } from "./scoreTracking";

/**
 * Honest performance trend bands.
 *
 * Practice tests are usually short (≤25 questions), so a single number can be
 * misleading. We always present a range and require a few sessions before
 * showing anything. Combined-total estimates require recent sessions in BOTH
 * sections; otherwise we only show the per-section band.
 */

export interface PerformanceBand {
  /** Lower bound of the score range (rounded to nearest 10). */
  low: number;
  /** Upper bound of the score range (rounded to nearest 10). */
  high: number;
  /** Sessions used to compute the band. */
  sampleSize: number;
}

const SECTION_BAND_HALF_WIDTH = 25;
const TOTAL_FRESHNESS_DAYS = 7;
const MIN_SECTION_SAMPLES = 2;

function isMath(section: PracticeSession["section"]): boolean {
  return section === "math";
}

function isReadingWriting(section: PracticeSession["section"]): boolean {
  return section === "reading" || section === "writing" || section === "reading-writing";
}

function getScaled(session: PracticeSession): number | null {
  const score = session.score as { scaled?: number };
  if (typeof score?.scaled === "number" && Number.isFinite(score.scaled)) return score.scaled;
  return null;
}

function clampScaled(value: number): number {
  return Math.max(200, Math.min(800, Math.round(value)));
}

function roundToTen(value: number): number {
  return Math.round(value / 10) * 10;
}

function bandFromValue(scaled: number, halfWidth = SECTION_BAND_HALF_WIDTH): { low: number; high: number } {
  return {
    low: clampScaled(roundToTen(scaled - halfWidth)),
    high: clampScaled(roundToTen(scaled + halfWidth)),
  };
}

/**
 * Compute a per-section performance band from the most recent N same-section
 * sessions. Returns null if there aren't enough samples to be meaningful.
 */
export function computeSectionBand(
  sessions: PracticeSession[],
  section: "math" | "reading-writing",
  recentCount = 3
): PerformanceBand | null {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const filtered = sessions
    .filter((s) => (section === "math" ? isMath(s.section) : isReadingWriting(s.section)))
    .filter((s) => getScaled(s) !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, recentCount);
  if (filtered.length < MIN_SECTION_SAMPLES) return null;
  const avg = filtered.reduce((acc, s) => acc + (getScaled(s) || 0), 0) / filtered.length;
  const { low, high } = bandFromValue(avg);
  return { low, high, sampleSize: filtered.length };
}

/**
 * Compute a combined total-score band only when the user has recent sessions
 * in both sections (within TOTAL_FRESHNESS_DAYS). Returns null otherwise so
 * we never present a noisy or one-sided estimate.
 */
export function computeTotalBand(sessions: PracticeSession[]): PerformanceBand | null {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const cutoff = Date.now() - TOTAL_FRESHNESS_DAYS * 24 * 60 * 60 * 1000;
  const fresh = sessions.filter((s) => new Date(s.date).getTime() >= cutoff);
  const mathBand = computeSectionBand(fresh, "math");
  const rwBand = computeSectionBand(fresh, "reading-writing");
  if (!mathBand || !rwBand) return null;
  const low = Math.max(400, mathBand.low + rwBand.low);
  const high = Math.min(1600, mathBand.high + rwBand.high);
  return {
    low: roundToTen(low),
    high: roundToTen(high),
    sampleSize: mathBand.sampleSize + rwBand.sampleSize,
  };
}

/**
 * Find the user's most recent same-section session before "now" (i.e. excludes
 * the current run when called immediately after completion). Returns null when
 * no prior attempt exists.
 */
export function getPriorSectionSession(
  sessions: PracticeSession[],
  section: "math" | "reading-writing",
  excludeSessionId?: string
): PracticeSession | null {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const matchSection = (s: PracticeSession) =>
    section === "math" ? isMath(s.section) : isReadingWriting(s.section);
  const ordered = sessions
    .filter(matchSection)
    .filter((s) => (excludeSessionId ? s.id !== excludeSessionId : true))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return ordered[0] || null;
}
