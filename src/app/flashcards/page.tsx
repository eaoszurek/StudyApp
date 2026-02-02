"use client";

import React, { useState, useEffect } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import InputField from "@/components/ui/InputField";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlashcardData,
  calculateNextReview,
  getReviewIntervalText,
} from "@/utils/spacedRepetition";

interface Flashcard {
  front: string;
  back: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tag: string;
  category?: string; // Legacy support
}

interface ReviewIntervals {
  "got-it": string;
  "almost": string;
  "no-idea": string;
}

export default function Flashcards() {
  const [topic, setTopic] = useState("");
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [reviewIntervals, setReviewIntervals] = useState<ReviewIntervals | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRatings, setUserRatings] = useState<Record<number, "got-it" | "almost" | "no-idea">>({});
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscriptionStatus: string | null;
    hasSubscription: boolean;
  } | null>(null);
  const [freeUsageCount, setFreeUsageCount] = useState(0);

  const STORAGE_KEY = "sat_flashcards";

  // Check subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch("/api/stripe/subscription-status");
        if (response.ok) {
          const data = await response.json();
          setSubscriptionStatus({
            subscriptionStatus: data.subscriptionStatus,
            hasSubscription: data.hasSubscription,
          });
        }
      } catch (error) {
        console.error("Failed to fetch subscription status:", error);
      }
    };
    fetchSubscription();

    // Get free tier usage count
    const stored = localStorage.getItem("free_tier_usage");
    const count = stored ? parseInt(stored, 10) : 0;
    setFreeUsageCount(count);
  }, []);

  // Load flashcards from API on mount and check for URL topic param
  useEffect(() => {
    // Check for topic in URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const topicParam = urlParams.get("topic");
    
    if (topicParam) {
      // Set topic from URL and auto-generate
      setTopic(topicParam);
      // Auto-generate flashcards after a brief delay to ensure state is set
      setTimeout(() => {
        generateFlashcards(topicParam);
      }, 100);
      // Clean up URL
      window.history.replaceState({}, "", "/flashcards");
    } else {
      // Load saved flashcards from API
      const loadFlashcards = async () => {
        try {
          const response = await fetch("/api/flashcards");
          if (response.ok) {
            const data = await response.json();
            if (data.flashcardSets && data.flashcardSets.length > 0) {
              // Get the most recent set
              const latestSet = data.flashcardSets[0];
              setFlashcards(latestSet.cards);
              setTopic(latestSet.topic);
            }
          }
        } catch (error) {
          console.error("Failed to load flashcards from API:", error);
          // Fallback to localStorage during migration
          try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
              const savedCards = JSON.parse(stored) as FlashcardData[];
              if (savedCards.length > 0) {
                setFlashcards(savedCards);
                if (savedCards[0].tag) {
                  setTopic(savedCards[0].tag);
                }
              }
            }
          } catch (localError) {
            console.error("Failed to load flashcards from localStorage:", localError);
          }
        }
      };
      loadFlashcards();
    }
  }, []);


  // Save flashcards to localStorage as backup (generation routes now save to DB)
  useEffect(() => {
    if (flashcards.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(flashcards));
      } catch (error) {
        console.error("Failed to save flashcards to localStorage:", error);
      }
    }
  }, [flashcards]);

  // Add keyboard event listeners for arrow keys
  useEffect(() => {
    if (flashcards.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input field
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (currentIndex > 0) {
            setDirection("backward");
            setCurrentIndex(currentIndex - 1);
            setIsFlipped(false);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (currentIndex < flashcards.length - 1) {
            setDirection("forward");
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
          }
          break;
        case " ":
        case "ArrowUp":
        case "ArrowDown":
          e.preventDefault();
          setIsFlipped((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [flashcards.length, currentIndex]);

  const generateFlashcards = async (topicToGenerate?: string) => {
    const finalTopic = topicToGenerate || topic;
    if (!finalTopic.trim()) {
      setError("Please enter a topic first.");
      return;
    }

    // Check free tier limit (1 use total across all features)
    const FREE_TIER_LIMIT = 1;
    if (!subscriptionStatus?.hasSubscription && freeUsageCount >= FREE_TIER_LIMIT) {
      setError(
        `You've used your free feature access. Upgrade to Premium for unlimited access to all features!`
      );
      return;
    }

    setLoading(true);
    setError(null);
    setFlashcards([]);
    setCurrentIndex(0);
    setIsFlipped(false);

    try {
      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: finalTopic }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate flashcards.");
      }

      const data = await res.json();
      // Convert to FlashcardData with spaced repetition fields
      const cardsWithSR: FlashcardData[] = data.flashcards.map((card: Flashcard) => ({
        ...card,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
      }));
      setFlashcards(cardsWithSR);
      setReviewIntervals(data.reviewIntervals || null);
      // Update topic state if it was passed as parameter
      if (topicToGenerate) {
        setTopic(topicToGenerate);
      }

      // Increment free tier usage for free users
      if (!subscriptionStatus?.hasSubscription) {
        const newCount = freeUsageCount + 1;
        setFreeUsageCount(newCount);
        localStorage.setItem("free_tier_usage", newCount.toString());
        // Set reset date if not set
        const now = new Date();
        const lastReset = localStorage.getItem("free_tier_usage_reset");
        if (!lastReset) {
          localStorage.setItem("free_tier_usage_reset", now.toISOString());
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate flashcards.");
    } finally {
      setLoading(false);
    }
  };


  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setDirection("forward");
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setDirection("backward");
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const reset = () => {
    // Start a new pack
    setTopic("");
    setFlashcards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setUserRatings({});
    setReviewIntervals(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const clearAllFlashcards = () => {
    if (confirm("Are you sure you want to delete all saved flashcards? This cannot be undone.")) {
      setFlashcards([]);
      localStorage.removeItem(STORAGE_KEY);
      reset();
    }
  };

  const handleRating = (rating: "got-it" | "almost" | "no-idea") => {
    setUserRatings({ ...userRatings, [currentIndex]: rating });
    
    // Update card with spaced repetition data
    const updatedCards = [...flashcards];
    const currentCard = updatedCards[currentIndex];
    const updatedCard = calculateNextReview(currentCard, rating);
    updatedCards[currentIndex] = updatedCard;
    setFlashcards(updatedCards);

    if (rating === "no-idea") {
      // Show again in same session - don't advance
      setIsFlipped(false);
    } else {
      // Move to next card after a brief delay
      setTimeout(() => {
        if (currentIndex < flashcards.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setIsFlipped(false);
        }
      }, 500);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-[#4A90E2]/20 text-[#93c5fd] border-[#4A90E2]/30";
      case "Hard":
        return "bg-[#1E5532]/30 text-[#86efac] border-[#1E5532]/40";
      default:
        return "bg-[#F7E7D3]/20 text-[#F7E7D3] border-[#F7E7D3]/30";
    }
  };

  const currentCard = flashcards[currentIndex];

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-10 pb-6 sm:pb-8 md:pb-10 max-w-full overflow-x-hidden w-full">
      <PageHeader
        eyebrow="Flashcards"
        title="Essential knowledge packs for your climb."
        subtitle="Generate 10-15 card packs with SAT-accurate content and spaced repetition tracking."
      />

      {subscriptionStatus && !subscriptionStatus.hasSubscription && (
        <div className="premium-banner mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                {freeUsageCount >= 1 ? "Free Trial Used" : "Free Trial: 1 use remaining"}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 font-medium">
                Upgrade to Premium for unlimited access to all features
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  const response = await fetch("/api/stripe/create-checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ priceType: "monthly" }),
                  });
                  const data = await response.json();
                  if (data.url) {
                    window.location.href = data.url;
                  } else {
                    alert(data.error || "Failed to start checkout");
                  }
                } catch (error) {
                  console.error("Error creating checkout:", error);
                  alert("Failed to start checkout");
                }
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Upgrade
            </button>
          </div>
        </div>
      )}

      {flashcards.length === 0 ? (
        <>
          {loading ? (
            <GlassPanel className="text-center py-12">
              <div className="flex flex-col items-center justify-center min-h-[300px] w-full">
                <LoadingSpinner size="lg" message="Preparing your study materials…" />
              </div>
            </GlassPanel>
          ) : (
            <GlassPanel>
              <div className="space-y-3">
                <InputField
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Topic, concept, or passage (e.g., Exponential Functions, Grammar Rules)"
                  onKeyDown={(e) => e.key === "Enter" && generateFlashcards()}
                />
                <PrimaryButton onClick={() => generateFlashcards()} disabled={loading || !topic.trim()} fullWidth>
                  Pack Tools & Supplies
                </PrimaryButton>
                {error && (
                  <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-center font-semibold">
                    {error}
                  </p>
                )}
              </div>
            </GlassPanel>
          )}
        </>
      ) : (
        <div className="ai-output-scope">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-600 dark:text-slate-400 font-semibold">
                Pack
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-2 break-words">{topic}</h2>
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <PrimaryButton variant="secondary" onClick={reset}>
                New Pack
              </PrimaryButton>
            </div>
          </div>

          <GlassPanel className="mb-4" padding={false}>
            <div className="px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-slate-700 dark:text-slate-300 font-medium">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold">
                  Card {currentIndex + 1} / {flashcards.length}
                </span>
                {currentCard?.tag && (
                  <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 font-semibold">
                    {currentCard.tag}
                  </span>
                )}
                {currentCard?.difficulty && (
                  <span
                    className={`text-xs px-3 py-1 rounded-full border ${getDifficultyColor(
                      currentCard.difficulty
                    )}`}
                  >
                    {currentCard.difficulty}
                  </span>
                )}
                {currentCard?.category && (
                  <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 font-semibold">
                    {currentCard.category}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {flashcards.map((_, idx) => {
                  const rating = userRatings[idx];
                  return (
                    <span
                      key={idx}
                      className={`w-2.5 h-2.5 rounded-full ${
                        idx === currentIndex
                          ? "bg-sky-400"
                          : rating === "got-it"
                          ? "bg-emerald-400"
                          : rating === "almost"
                          ? "bg-amber-400"
                          : rating === "no-idea"
                          ? "bg-rose-400"
                          : "bg-white/20"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </GlassPanel>

          <div className="relative h-64 sm:h-72 md:h-80 mb-6 overflow-x-hidden" style={{ perspective: "1200px" }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentIndex}
                className="w-full h-full absolute inset-0"
                initial={{
                  x: direction === "backward" ? "-100%" : "100%",
                  rotateY: isFlipped ? 180 : 0,
                }}
                animate={{ 
                  x: 0,
                  rotateY: isFlipped ? 180 : 0 
                }}
                exit={{
                  x: direction === "backward" ? "100%" : "-100%",
                  rotateY: isFlipped ? 180 : 0,
                }}
                transition={{ 
                  x: { duration: 0.4, ease: "easeInOut" },
                  rotateY: { duration: 0.6, ease: "easeInOut" }
                }}
                style={{ transformStyle: "preserve-3d", cursor: "pointer" }}
                onClick={handleFlip}
              >
              <div
                className="absolute inset-0"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <div className="glass-panel-strong rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 h-full flex items-center justify-center border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed px-2">
                    {currentCard.front}
                  </p>
                </div>
              </div>

              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 h-full flex items-center justify-center border-2 border-sky-500 dark:border-sky-400 bg-sky-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                  <div className="text-lg sm:text-xl font-semibold leading-relaxed max-w-full px-2 overflow-y-auto w-full">
                    {(() => {
                      const raw = currentCard.back || "";
                      const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
                      const bulletLines = lines
                        .filter((line) => line.startsWith("•"))
                        .map((line) => line.replace(/^•\s*/, ""));
                      let definitionLine = lines.find((line) => line.includes("—")) || lines[0] || "";
                      if (bulletLines.length === 0 && raw.includes("•")) {
                        const parts = raw.split("•").map((line) => line.trim()).filter(Boolean);
                        definitionLine = parts[0] || definitionLine;
                        bulletLines.push(...parts.slice(1));
                      }
                      const renderBold = (text: string) =>
                        text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
                          if (part.startsWith("**") && part.endsWith("**")) {
                            return <strong key={idx} className="font-semibold">{part.slice(2, -2)}</strong>;
                          }
                          return <span key={idx}>{part}</span>;
                        });
                      return (
                        <div className="space-y-3">
                          {definitionLine && (
                            <p className="text-left font-semibold">
                              {renderBold(definitionLine)}
                            </p>
                          )}
                          {bulletLines.length > 0 && (
                            <ul className="list-disc list-inside text-left space-y-2 text-base sm:text-lg font-normal">
                              {bulletLines.map((line, idx) => (
                                <li key={`bullet-${idx}`}>{renderBold(line)}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="text-center text-slate-600 dark:text-slate-400 text-sm mb-6 font-medium">
            Tap to flip • Arrow keys: ↑↓ or Space to flip, ←→ to navigate
          </p>

          {isFlipped && (
            <GlassPanel className="mb-6">
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-900 dark:text-white text-center">
                  How well did you know this?
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleRating("got-it")}
                    className={`flex-1 px-4 py-3 rounded-xl border transition font-semibold ${
                      userRatings[currentIndex] === "got-it"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200"
                        : "border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800"
                    }`}
                  >
                    <span className="font-bold">✓ Got it</span>
                    {currentCard.interval > 0 && (
                      <span className="block text-xs text-slate-500 dark:text-slate-300 mt-1 font-medium">
                        Review in {getReviewIntervalText(currentCard.interval)}
                      </span>
                    )}
                    {!currentCard.interval && reviewIntervals && (
                      <span className="block text-xs text-slate-500 dark:text-slate-300 mt-1 font-medium">
                        Review in {reviewIntervals["got-it"]}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleRating("almost")}
                    className={`flex-1 px-4 py-3 rounded-xl border transition font-semibold ${
                      userRatings[currentIndex] === "almost"
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200"
                        : "border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800"
                    }`}
                  >
                    <span className="font-bold">~ Almost</span>
                    {currentCard.interval > 0 && (
                      <span className="block text-xs text-slate-500 dark:text-slate-300 mt-1 font-medium">
                        Review in {getReviewIntervalText(currentCard.interval)}
                      </span>
                    )}
                    {!currentCard.interval && reviewIntervals && (
                      <span className="block text-xs text-slate-500 dark:text-slate-300 mt-1 font-medium">
                        Review in {reviewIntervals["almost"]}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleRating("no-idea")}
                    className={`flex-1 px-4 py-3 rounded-xl border transition font-semibold ${
                      userRatings[currentIndex] === "no-idea"
                        ? "border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-900 dark:text-rose-200"
                        : "border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-500 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800"
                    }`}
                  >
                    <span className="font-bold">✗ No idea</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-300 mt-1 font-medium">
                      Review again today
                    </span>
                  </button>
                </div>
              </div>
            </GlassPanel>
          )}

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <PrimaryButton
              variant="secondary"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="w-full md:w-auto"
            >
              ← Previous
            </PrimaryButton>
            <PrimaryButton onClick={handleFlip} className="w-full md:w-auto">
              {isFlipped ? "Show question" : "Show answer"}
            </PrimaryButton>
            <PrimaryButton
              variant="secondary"
              onClick={handleNext}
              disabled={currentIndex === flashcards.length - 1}
              className="w-full md:w-auto"
            >
              Next →
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
