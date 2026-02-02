/**
 * Spaced Repetition Algorithm (SM-2 inspired)
 * Calculates next review date based on user performance
 */

export interface FlashcardData {
  front: string;
  back: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tag: string;
  category?: string;
  // Spaced repetition fields
  easeFactor: number; // Starting at 2.5, adjusts based on performance
  interval: number; // Days until next review
  repetitions: number; // Number of successful reviews
  lastReviewed?: string; // ISO date string
  nextReview?: string; // ISO date string
  rating?: "got-it" | "almost" | "no-idea"; // Last rating
  sessionId?: string; // Anonymous session ID for backend migration
}

/**
 * Calculate next review date based on rating
 */
export function calculateNextReview(
  card: FlashcardData,
  rating: "got-it" | "almost" | "no-idea"
): FlashcardData {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  let newEaseFactor = card.easeFactor || 2.5;
  let newInterval = card.interval || 0;
  let newRepetitions = card.repetitions || 0;

  if (rating === "got-it") {
    // Successful recall
    if (newRepetitions === 0) {
      newInterval = 1; // First review: tomorrow
    } else if (newRepetitions === 1) {
      newInterval = 3; // Second review: 3 days
    } else {
      newInterval = Math.round(newInterval * newEaseFactor);
    }
    newRepetitions += 1;
    newEaseFactor = Math.max(1.3, newEaseFactor + 0.1); // Increase ease factor slightly
  } else if (rating === "almost") {
    // Partial recall
    newRepetitions = Math.max(0, newRepetitions - 1);
    newInterval = Math.max(1, Math.round(newInterval * 0.5)); // Reduce interval
    newEaseFactor = Math.max(1.3, newEaseFactor - 0.15); // Decrease ease factor
  } else {
    // No idea - reset
    newRepetitions = 0;
    newInterval = 1; // Review again tomorrow
    newEaseFactor = Math.max(1.3, newEaseFactor - 0.2); // Decrease ease factor more
  }

  // Calculate next review date
  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  const nextReview = nextReviewDate.toISOString().split("T")[0];

  return {
    ...card,
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    lastReviewed: today,
    nextReview: nextReview,
    rating: rating,
  };
}

/**
 * Check if a card is due for review
 */
export function isDueForReview(card: FlashcardData): boolean {
  if (!card.nextReview) return true; // Never reviewed, so due
  const today = new Date().toISOString().split("T")[0];
  return card.nextReview <= today;
}

/**
 * Get cards due for review
 */
export function getCardsDueForReview(cards: FlashcardData[]): FlashcardData[] {
  return cards.filter(isDueForReview);
}

/**
 * Get review intervals as human-readable strings
 */
export function getReviewIntervalText(interval: number): string {
  if (interval === 0) return "again-today";
  if (interval === 1) return "1 day";
  if (interval < 7) return `${interval} days`;
  if (interval < 30) return `${Math.round(interval / 7)} weeks`;
  return `${Math.round(interval / 30)} months`;
}

