/**
 * Score Tracking Utilities
 * Handles persistence of SAT scores and progress using backend API
 * Falls back to localStorage for anonymous users or when backend is unavailable
 */

import { SATScore } from "./satScoring";

export interface PracticeSession {
  id: string;
  date: string;
  section: "math" | "reading" | "writing";
  score: SATScore | { scaled: number; raw: number; maxRaw: number };
  correct: number;
  total: number;
  timeSpent?: number; // in minutes
  difficulty?: "Easy" | "Medium" | "Hard" | "Mixed";
  skillDomains?: string[]; // Array of skill domains tested in this session
  topic?: string; // Specific topic if provided
  sessionId?: string; // Anonymous session ID for backend migration
}

export interface ScoreHistory {
  sessions: PracticeSession[];
  bestScore: number;
  averageScore: number;
  lastUpdated: string;
}

const STORAGE_KEY = "sat_score_history";
export const MIN_ESTIMATE_QUESTIONS = 15;

/**
 * Fetch score history from backend API
 */
export async function fetchScoreHistory(): Promise<ScoreHistory | null> {
  try {
    const response = await fetch("/api/scores/history");
    if (response.ok) {
      const data = await response.json();
      return data as ScoreHistory;
    }
  } catch (error) {
    console.error("Failed to fetch score history from backend:", error);
  }
  return null;
}

/**
 * Get all score history (from backend if available, otherwise localStorage)
 */
export async function getScoreHistory(): Promise<ScoreHistory> {
  // Try backend first
  const backendHistory = await fetchScoreHistory();
  if (backendHistory) {
    return backendHistory;
  }

  // Fallback to localStorage
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error("Failed to read score history from localStorage:", error);
  }
  
  return {
    sessions: [],
    bestScore: 0,
    averageScore: 0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get score history synchronously from localStorage (for backwards compatibility)
 * Use getScoreHistory() for new code that supports async
 */
export function getScoreHistorySync(): ScoreHistory {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error("Failed to read score history:", error);
  }
  
  return {
    sessions: [],
    bestScore: 0,
    averageScore: 0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Save a practice session to localStorage (fallback for anonymous users)
 * Note: Authenticated users should save scores via the backend API
 */
export function savePracticeSession(session: PracticeSession): void {
  try {
    if (typeof window === "undefined") return;
    
    const history = getScoreHistorySync();
    history.sessions.push(session);
    
    // Update best and average scores
    if (session.total >= MIN_ESTIMATE_QUESTIONS) {
      if (session.score && typeof session.score === 'object' && 'total' in session.score) {
        const totalScore = session.score.total;
        if (totalScore > history.bestScore) {
          history.bestScore = totalScore;
        }
      } else if (session.score && typeof session.score === 'object' && 'scaled' in session.score) {
        // For section-only scores, estimate total (multiply by 2 as rough estimate)
        const estimatedTotal = session.score.scaled * 2;
        if (estimatedTotal > history.bestScore) {
          history.bestScore = estimatedTotal;
        }
      }
    }
    
    // Recalculate average
    const totalScores = history.sessions
      .filter(s => s.total >= MIN_ESTIMATE_QUESTIONS)
      .map(s => {
        if (s.score && typeof s.score === 'object' && 'total' in s.score) {
          return s.score.total;
        } else if (s.score && typeof s.score === 'object' && 'scaled' in s.score) {
          return s.score.scaled * 2; // Estimate
        }
        return 0;
      })
      .filter(s => s > 0);
    
    history.averageScore = totalScores.length > 0
      ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length)
      : 0;
    
    history.lastUpdated = new Date().toISOString();
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to save practice session to localStorage:", error);
  }
}

/**
 * Get recent sessions (last N sessions)
 */
export async function getRecentSessions(count: number = 10): Promise<PracticeSession[]> {
  const history = await getScoreHistory();
  return history.sessions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count);
}

/**
 * Get recent sessions synchronously (for backwards compatibility)
 */
export function getRecentSessionsSync(count: number = 10): PracticeSession[] {
  const history = getScoreHistorySync();
  return history.sessions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count);
}

/**
 * Get score trend (last N sessions)
 */
export async function getScoreTrend(count: number = 10): Promise<number[]> {
  const recent = await getRecentSessions(count);
  return recent
    .filter(session => session.total >= MIN_ESTIMATE_QUESTIONS)
    .map(session => {
    if (session.score && typeof session.score === 'object' && 'total' in session.score) {
      return session.score.total;
    } else if (session.score && typeof session.score === 'object' && 'scaled' in session.score) {
      return session.score.scaled * 2; // Estimate
    }
    return 0;
  }).filter(s => s > 0);
}

/**
 * Get score trend synchronously (for backwards compatibility)
 */
export function getScoreTrendSync(count: number = 10): number[] {
  const recent = getRecentSessionsSync(count);
  return recent
    .filter(session => session.total >= MIN_ESTIMATE_QUESTIONS)
    .map(session => {
    if (session.score && typeof session.score === 'object' && 'total' in session.score) {
      return session.score.total;
    } else if (session.score && typeof session.score === 'object' && 'scaled' in session.score) {
      return session.score.scaled * 2; // Estimate
    }
    return 0;
  }).filter(s => s > 0);
}

/**
 * Get performance by section
 */
export async function getSectionPerformance(): Promise<{
  math: { average: number; adjusted: number; count: number; questions: number };
  reading: { average: number; adjusted: number; count: number; questions: number };
  writing: { average: number; adjusted: number; count: number; questions: number };
}> {
  const history = await getScoreHistory();
  const mathSessions = history.sessions.filter(s => s.section === "math");
  const readingSessions = history.sessions.filter(s => s.section === "reading");
  const writingSessions = history.sessions.filter(s => s.section === "writing");
  
  const getStats = (sessions: PracticeSession[]) => {
    if (sessions.length === 0) return { average: 0, adjusted: 0, count: 0, questions: 0 };
    let totalWeighted = 0;
    let totalQuestions = 0;
    let count = 0;
    sessions.forEach((s) => {
      if (s.score && typeof s.score === "object" && "scaled" in s.score) {
        const questions = Math.max(1, s.total || 0);
        totalWeighted += s.score.scaled * questions;
        totalQuestions += questions;
        count += 1;
      }
    });
    if (totalQuestions === 0) return { average: 0, adjusted: 0, count: 0, questions: 0 };
    const average = Math.round(totalWeighted / totalQuestions);
    const smoothingQuestions = MIN_ESTIMATE_QUESTIONS;
    const baseline = 500;
    const adjusted = Math.round(
      (average * totalQuestions + baseline * smoothingQuestions) / (totalQuestions + smoothingQuestions)
    );
    return { average, adjusted, count, questions: totalQuestions };
  };
  
  return {
    math: getStats(mathSessions),
    reading: getStats(readingSessions),
    writing: getStats(writingSessions),
  };
}

/**
 * Get performance by section synchronously (for backwards compatibility)
 */
export function getSectionPerformanceSync(): {
  math: { average: number; adjusted: number; count: number; questions: number };
  reading: { average: number; adjusted: number; count: number; questions: number };
  writing: { average: number; adjusted: number; count: number; questions: number };
} {
  const history = getScoreHistorySync();
  const mathSessions = history.sessions.filter(s => s.section === "math");
  const readingSessions = history.sessions.filter(s => s.section === "reading");
  const writingSessions = history.sessions.filter(s => s.section === "writing");
  
  const getStats = (sessions: PracticeSession[]) => {
    if (sessions.length === 0) return { average: 0, adjusted: 0, count: 0, questions: 0 };
    let totalWeighted = 0;
    let totalQuestions = 0;
    let count = 0;
    sessions.forEach((s) => {
      if (s.score && typeof s.score === "object" && "scaled" in s.score) {
        const questions = Math.max(1, s.total || 0);
        totalWeighted += s.score.scaled * questions;
        totalQuestions += questions;
        count += 1;
      }
    });
    if (totalQuestions === 0) return { average: 0, adjusted: 0, count: 0, questions: 0 };
    const average = Math.round(totalWeighted / totalQuestions);
    const smoothingQuestions = MIN_ESTIMATE_QUESTIONS;
    const baseline = 500;
    const adjusted = Math.round(
      (average * totalQuestions + baseline * smoothingQuestions) / (totalQuestions + smoothingQuestions)
    );
    return { average, adjusted, count, questions: totalQuestions };
  };
  
  return {
    math: getStats(mathSessions),
    reading: getStats(readingSessions),
    writing: getStats(writingSessions),
  };
}

/**
 * Get performance by skill domain
 */
export async function getSkillDomainPerformance(): Promise<Record<string, { average: number; count: number }>> {
  const history = await getScoreHistory();
  const skillStats: Record<string, { total: number; count: number }> = {};

  history.sessions.forEach((session) => {
    if (session.skillDomains && session.skillDomains.length > 0) {
      const score = session.score && typeof session.score === 'object' && 'scaled' in session.score
        ? session.score.scaled
        : 0;

      session.skillDomains.forEach((domain) => {
        if (!skillStats[domain]) {
          skillStats[domain] = { total: 0, count: 0 };
        }
        skillStats[domain].total += score;
        skillStats[domain].count += 1;
      });
    }
  });

  const result: Record<string, { average: number; count: number }> = {};
  Object.entries(skillStats).forEach(([domain, stats]) => {
    result[domain] = {
      average: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
      count: stats.count,
    };
  });

  return result;
}

/**
 * Get performance by skill domain synchronously (for backwards compatibility)
 */
export function getSkillDomainPerformanceSync(): Record<string, { average: number; count: number }> {
  const history = getScoreHistorySync();
  const skillStats: Record<string, { total: number; count: number }> = {};

  history.sessions.forEach((session) => {
    if (session.skillDomains && session.skillDomains.length > 0) {
      const score = session.score && typeof session.score === 'object' && 'scaled' in session.score
        ? session.score.scaled
        : 0;

      session.skillDomains.forEach((domain) => {
        if (!skillStats[domain]) {
          skillStats[domain] = { total: 0, count: 0 };
        }
        skillStats[domain].total += score;
        skillStats[domain].count += 1;
      });
    }
  });

  const result: Record<string, { average: number; count: number }> = {};
  Object.entries(skillStats).forEach(([domain, stats]) => {
    result[domain] = {
      average: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
      count: stats.count,
    };
  });

  return result;
}

/**
 * Clear all score history (for testing/reset)
 */
export function clearScoreHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
