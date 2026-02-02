/**
 * Shared Type Definitions
 * Central location for common types used across the application
 */

// Practice Test Types
export type SectionType = "math" | "reading" | "writing";
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
  relatedFlashcards: string[];
}

// Flashcard Types
export interface Flashcard {
  front: string;
  back: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tag: string;
  category?: string;
}

export interface ReviewIntervals {
  "got-it": string;
  "almost": string;
  "no-idea": string;
}

// Study Plan Types
export interface QuestionnaireAnswer {
  targetScore?: string;
  testDate?: string;
  weakestSection?: string;
  hoursPerDay?: string;
  studyStyle?: string;
  notes?: string;
}

export interface PersonalizedPlan {
  overview: string;
  weeklyPlan?: {
    week: number;
    focus: string;
    tasks: string[];
  }[];
  dailyPlan?: {
    day: string;
    tasks: string[];
  }[];
  practiceTests?: string[];
  strategies?: string[];
  // Legacy format for compatibility
  timeframe?: "daily" | "weekly";
  days?: {
    day: string;
    tasks: string[];
  }[];
}

