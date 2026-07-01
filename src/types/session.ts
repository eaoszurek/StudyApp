/**
 * Session Data Types
 * Type definitions for session-related data structures
 */

/**
 * Base session data structure
 */
export interface SessionData {
  sessionId: string;
  createdAt: string; // ISO string
  lastActivity: string; // ISO string
}

/**
 * Practice test with session ID
 */
export interface SessionTest {
  sessionId: string;
  testId: string;
  section: "math" | "reading" | "writing" | "reading-writing";
  score: number;
  date: string; // ISO string
}

/**
 * Study plan with session ID
 */
export interface SessionStudyPlan {
  sessionId: string;
  plan: any; // PersonalizedPlanWithTasks
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

