/**
 * Shared Type Definitions
 * Central location for common types used across the application
 */

// Practice Test Types
export type SectionType = "math" | "reading" | "writing";
/** Practice-test-only section (Digital SAT combines Reading & Writing). */
export type PracticeSectionType = "math" | "reading-writing";
export type OptionLetter = "A" | "B" | "C" | "D";
export type Difficulty = "Easy" | "Medium" | "Hard" | "Mixed";

export interface PracticeQuestion {
  id: number;
  question: string;
  options: Record<OptionLetter, string>;
  correctAnswer: OptionLetter;
  explanation?: string; // Legacy support
  explanation_correct?: string;
  explanation_incorrect?: Record<string, string>;
  strategy_tip?: string;
  difficulty: Difficulty;
  skillFocus: string;
}

export interface PracticeSet {
  section: SectionType;
  passage?: string;
  questions: PracticeQuestion[];
}

export interface TestConfig {
  questionCount: number;
  topic?: string;
  difficulty?: Difficulty;
}

// Lesson Types
export interface Lesson {
  title: string;
  goal: string;
  explanation: string[];
  example: string;
  practice: {
    question: string;
    options: string[];
    correctAnswer: "A" | "B" | "C" | "D";
    explanation?: string;
    explanation_incorrect?: Record<string, string>;
  }[];
}

// Study Plan Types
export interface QuestionnaireAnswer {
  targetScore?: string;
  testDate?: string;
  weakestSection?: string;
  hoursPerDay?: string;
  studyStyle?: string;
  workloadPreference?: string;
  confidenceLevel?: string;
  notes?: string;
}

/**
 * Structured per-task metadata emitted by the AI planner alongside the
 * existing string `tasks`. When present, the calendar uses this to build
 * deep links instead of regexing the task text. Optional / additive — old
 * plans without `taskMeta` continue to work via heuristics.
 */
export interface StudyPlanTaskMeta {
  type: StudyTaskType;
  /** Practice section, when applicable. */
  section?: "math" | "reading-writing";
  /** Specific SAT skill (e.g. "Linear Equations", "Transitions"). */
  topic?: string;
  difficulty?: "Easy" | "Medium" | "Hard" | "Mixed";
  /** Estimated duration in minutes. */
  minutes?: number;
}

export interface PersonalizedPlan {
  overview: string;
  /** YYYY-MM-DD: first day of the on-screen calendar (usually the day the plan was created). */
  planStartDate?: string;
  /** YYYY-MM-DD: SAT / goal test date. */
  testDate?: string;
  /** Inclusive day count from plan start through test (when test is set). */
  calendarDayCount?: number;
  /** Number of 7-day rows on the schedule (ceiling of day count / 7). */
  calendarWeekCount?: number;
  /** Weeks with day-by-day AI detail; later weeks follow the weekly rhythm. */
  generatedDetailWeekCount?: number;
  weeklyPlan?: {
    week: number;
    focus: string;
    tasks: string[];
    taskMeta?: StudyPlanTaskMeta[];
  }[];
  dailyPlan?: {
    day: string;
    tasks: string[];
    taskMeta?: StudyPlanTaskMeta[];
  }[];
  practiceTests?: string[];
  strategies?: string[];
  // Legacy format for compatibility
  timeframe?: "daily" | "weekly";
  days?: {
    day: string;
    tasks: string[];
    taskMeta?: StudyPlanTaskMeta[];
  }[];
  calendarWeeks?: StudyCalendarWeek[];
}

export type StudyTaskType = "practice" | "lesson" | "review";

export interface StudyTaskLaunchTarget {
  path: "/practice" | "/lessons" | "/progress";
  params?: Record<string, string>;
}

export interface StudyCalendarTask {
  id: string;
  type: StudyTaskType;
  skillFocus: string;
  estimatedMinutes: number;
  rawText: string;
  launchTarget: StudyTaskLaunchTarget;
  /** When the AI plan provided structured metadata, surface it for UI pills. */
  meta?: StudyPlanTaskMeta;
}

export interface StudyCalendarDay {
  id: string;
  dayName: string;
  dayNumber: number;
  dateISO: string;
  accentClass: string;
  tasks: StudyCalendarTask[];
}

export interface StudyCalendarWeek {
  weekIndex: number;
  label: string;
  focus?: string;
  days: StudyCalendarDay[];
}

