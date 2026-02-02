/**
 * Data Export/Import Utilities
 * Allows users to backup and restore their progress data
 */

import { getScoreHistory, ScoreHistory } from "./scoreTracking";
import { getTargetGoal, GoalData } from "./goalTracking";

export interface ExportData {
  version: string;
  exportDate: string;
  scoreHistory: ScoreHistory;
  goal: GoalData | null;
  flashcards?: any; // Flashcard data from localStorage
  studyPlan?: any; // Study plan data from localStorage
}

const EXPORT_VERSION = "1.0.0";

/**
 * Export all user data to JSON
 */
export async function exportUserData(): Promise<string> {
  try {
    const scoreHistory = await getScoreHistory();
    const goal = getTargetGoal();
    
    // Get flashcards if available
    let flashcards = null;
    try {
      const flashcardData = localStorage.getItem("sat_flashcards");
      if (flashcardData) {
        flashcards = JSON.parse(flashcardData);
      }
    } catch (error) {
      console.error("Failed to export flashcards:", error);
    }

    // Get study plan if available
    let studyPlan = null;
    try {
      const planData = localStorage.getItem("sat_study_plan");
      if (planData) {
        studyPlan = JSON.parse(planData);
      }
    } catch (error) {
      console.error("Failed to export study plan:", error);
    }

    const exportData: ExportData = {
      version: EXPORT_VERSION,
      exportDate: new Date().toISOString(),
      scoreHistory,
      goal,
      flashcards,
      studyPlan,
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error("Failed to export data:", error);
    throw new Error("Failed to export data");
  }
}

/**
 * Download export data as JSON file
 */
export async function downloadExport(): Promise<void> {
  try {
    const data = await exportUserData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sat-prep-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download export:", error);
    throw error;
  }
}

/**
 * Import user data from JSON
 */
export async function importUserData(jsonData: string, options?: { merge?: boolean }): Promise<void> {
  try {
    const data = JSON.parse(jsonData) as ExportData;

    // Validate version (for future compatibility)
    if (data.version && data.version !== EXPORT_VERSION) {
      console.warn(`Import version ${data.version} may not be compatible with current version ${EXPORT_VERSION}`);
    }

    const merge = options?.merge ?? false;

    // Import score history
    if (data.scoreHistory) {
      if (merge) {
        // Merge with existing data
        const existing = await getScoreHistory();
        const mergedSessions = [...existing.sessions, ...data.scoreHistory.sessions];
        // Remove duplicates by ID
        const uniqueSessions = mergedSessions.filter((session, index, self) =>
          index === self.findIndex((s) => s.id === session.id)
        );
        const mergedHistory: ScoreHistory = {
          sessions: uniqueSessions,
          bestScore: Math.max(existing.bestScore, data.scoreHistory.bestScore),
          averageScore: mergedSessions.length > 0
            ? Math.round(
                mergedSessions
                  .map((s) => {
                    if (s.score && typeof s.score === "object" && "total" in s.score) {
                      return s.score.total;
                    } else if (s.score && typeof s.score === "object" && "scaled" in s.score) {
                      return s.score.scaled * 2;
                    }
                    return 0;
                  })
                  .filter((s) => s > 0)
                  .reduce((a, b) => a + b, 0) / mergedSessions.length
              )
            : 0,
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem("sat_score_history", JSON.stringify(mergedHistory));
      } else {
        // Replace existing data
        localStorage.setItem("sat_score_history", JSON.stringify(data.scoreHistory));
      }
    }

    // Import goal
    if (data.goal) {
      if (merge && getTargetGoal()) {
        // Keep existing goal if merging
        console.log("Keeping existing goal during merge");
      } else {
        localStorage.setItem("sat_target_goal", JSON.stringify(data.goal));
      }
    }

    // Import flashcards
    if (data.flashcards) {
      if (merge) {
        // Merge flashcards
        try {
          const existing = localStorage.getItem("sat_flashcards");
          if (existing) {
            const existingCards = JSON.parse(existing);
            const merged = [...existingCards, ...data.flashcards];
            // Remove duplicates by front text
            const unique = merged.filter((card: any, index: number, self: any[]) =>
              index === self.findIndex((c) => c.front === card.front)
            );
            localStorage.setItem("sat_flashcards", JSON.stringify(unique));
          } else {
            localStorage.setItem("sat_flashcards", JSON.stringify(data.flashcards));
          }
        } catch (error) {
          console.error("Failed to merge flashcards:", error);
          localStorage.setItem("sat_flashcards", JSON.stringify(data.flashcards));
        }
      } else {
        localStorage.setItem("sat_flashcards", JSON.stringify(data.flashcards));
      }
    }

    // Import study plan
    if (data.studyPlan) {
      if (merge && localStorage.getItem("sat_study_plan")) {
        // Keep existing plan if merging
        console.log("Keeping existing study plan during merge");
      } else {
        localStorage.setItem("sat_study_plan", JSON.stringify(data.studyPlan));
      }
    }

    // Reload page to reflect changes
    window.location.reload();
  } catch (error) {
    console.error("Failed to import data:", error);
    throw new Error("Failed to import data. Please check the file format.");
  }
}

/**
 * Handle file upload for import
 */
export function handleFileImport(file: File, options?: { merge?: boolean }): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        importUserData(content, options);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

