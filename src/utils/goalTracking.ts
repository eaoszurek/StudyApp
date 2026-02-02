/**
 * Goal Tracking Utilities
 * Handles target score and goal progress tracking
 */

const GOAL_STORAGE_KEY = "sat_target_goal";

export interface GoalData {
  targetScore: number;
  testDate?: string; // ISO date string
  createdAt: string; // ISO date string
}

/**
 * Get target goal from localStorage
 */
export function getTargetGoal(): GoalData | null {
  try {
    const stored = localStorage.getItem(GOAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as GoalData;
    }
  } catch (error) {
    console.error("Failed to read goal:", error);
  }
  return null;
}

/**
 * Set target goal
 */
export function setTargetGoal(targetScore: number, testDate?: string): void {
  try {
    const goal: GoalData = {
      targetScore,
      testDate,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(goal));
  } catch (error) {
    console.error("Failed to save goal:", error);
  }
}

/**
 * Calculate progress toward goal
 */
export function getGoalProgress(currentScore: number, targetScore: number): {
  percentage: number;
  pointsRemaining: number;
  isAchieved: boolean;
} {
  if (targetScore <= 0) {
    return { percentage: 0, pointsRemaining: targetScore, isAchieved: false };
  }

  const isAchieved = currentScore >= targetScore;
  const pointsRemaining = Math.max(0, targetScore - currentScore);
  const percentage = Math.min(100, Math.round((currentScore / targetScore) * 100));

  return { percentage, pointsRemaining, isAchieved };
}

/**
 * Get days until test date
 */
export function getDaysUntilTest(testDate?: string): number | null {
  if (!testDate) return null;
  try {
    const test = new Date(testDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    test.setHours(0, 0, 0, 0);
    const diffTime = test.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : null;
  } catch (error) {
    return null;
  }
}

