"use client";

import React, { useState, useEffect, useRef } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import InputField from "@/components/ui/InputField";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { SAT_TOPICS } from "@/data/topics";

interface Lesson {
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

const splitIntoBullets = (text: string): string[] => {
  if (!text) return [];
  const byLine = text.split(/\n|•/).map((line) => line.trim()).filter(Boolean);
  if (byLine.length > 1) return byLine;
  return text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const renderBoldText = (text: string) => {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={idx}>{part}</span>;
  });
};

const renderFormattedText = (text: string) => {
  const bullets = splitIntoBullets(text);
  if (bullets.length <= 1) {
    return <p className="text-slate-600 dark:text-slate-300 font-normal">{renderBoldText(text)}</p>;
  }
  return (
    <ul className="space-y-2">
      {bullets.map((line, idx) => (
        <li key={idx} className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
          <span className="text-sky-500 dark:text-sky-400 font-bold text-base leading-none mt-0.5 shrink-0">•</span>
          <span className="font-normal leading-relaxed">{renderBoldText(line)}</span>
        </li>
      ))}
    </ul>
  );
};

export default function Lessons() {
  const [topic, setTopic] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, "A" | "B" | "C" | "D" | null>>({});
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});
  const [openDropdown, setOpenDropdown] = useState<"Math" | "Reading" | "Writing" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const router = useRouter();
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscriptionStatus: string | null;
    hasSubscription: boolean;
  } | null>(null);
  const [freeUsageCount, setFreeUsageCount] = useState(0);

  const handleRelatedFlashcardClick = (flashcardTopic: string) => {
    // Navigate to flashcards page with topic in URL
    router.push(`/flashcards?topic=${encodeURIComponent(flashcardTopic)}`);
  };

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  useEffect(() => {
    if (!openDropdown || !dropdownRef.current) return;
    const dropdownEl = dropdownRef.current.querySelector(".lessons-dropdown") as HTMLElement | null;
    if (!dropdownEl) return;
    window.getComputedStyle(dropdownEl);
  }, [openDropdown]);

  const generateLesson = async (topicInput?: string) => {
    const finalTopic = topicInput || topic;
    if (!finalTopic.trim()) {
      setError("Please enter or select a topic first.");
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
    setLesson(null);
    setSelectedAnswers({});
    setShowAnswers({});

    try {
      const res = await fetch("/api/ai/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: finalTopic }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate lesson.");
      }

      const data = await res.json();
      setLesson(data);

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
      setError(err.message || "Failed to generate lesson.");
    } finally {
      setLoading(false);
    }
  };

  const handleTopicSelect = (topicName: string) => {
    setSelectedTopic(topicName);
    setTopic(topicName);
  };

  const handleAnswerSelect = (questionIndex: number, answer: "A" | "B" | "C" | "D") => {
    setSelectedAnswers({ ...selectedAnswers, [questionIndex]: answer });
    // Automatically show answer when selected
    setShowAnswers({ ...showAnswers, [questionIndex]: true });
  };

  const toggleAnswer = (questionIndex: number) => {
    setShowAnswers({ ...showAnswers, [questionIndex]: !showAnswers[questionIndex] });
  };

  const generateMorePractice = async () => {
    if (!topic.trim() || !lesson) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate more practice.");
      }

      const data = await res.json();
      // Only update practice questions, keep the rest of the lesson
      if (data.practice && Array.isArray(data.practice)) {
        setLesson({ ...lesson, practice: data.practice });
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate more practice.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLesson(null);
    setTopic("");
    setSelectedTopic(null);
    setSelectedAnswers({});
    setShowAnswers({});
    setError(null);
  };

  return (
    <div className="px-3 sm:px-4 md:px-6 pb-6 sm:pb-8 md:pb-10 max-w-4xl mx-auto overflow-x-hidden">
      {!loading && !lesson && (
        <PageHeader
          eyebrow="Micro-Lessons"
          title="Quick knowledge checkpoints for your climb."
          subtitle="Generate 1–2 minute SAT lessons with explanations, examples, and practice questions."
        />
      )}

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
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-600 dark:from-amber-400 dark:to-amber-500 dark:hover:from-amber-400 dark:hover:to-amber-600 text-slate-900 dark:text-slate-900 text-sm font-bold transition-all border-2 border-amber-600 dark:border-amber-600 shadow-[0_4px_0_rgba(217,119,6,0.3)] hover:shadow-[0_5px_0_rgba(217,119,6,0.4)] active:shadow-[0_2px_0_rgba(217,119,6,0.4)] hover:-translate-y-0.5 active:translate-y-1 whitespace-nowrap"
            >
              Upgrade
            </button>
          </div>
        </div>
      )}

      {!lesson ? (
        <>
          {loading ? (
            <GlassPanel className="text-center py-12">
              <div className="flex flex-col items-center justify-center min-h-[300px] w-full">
                <LoadingSpinner size="lg" message="Charting your route…" />
              </div>
            </GlassPanel>
          ) : (
            <>
              <GlassPanel overflow="visible" className="relative z-20">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                      Enter a topic or select from suggestions
                    </label>
                    <InputField
                      value={topic}
                      onChange={(e) => {
                        setTopic(e.target.value);
                        setSelectedTopic(null);
                      }}
                      placeholder="e.g., Quadratic Equations, Grammar Rules, Main Idea"
                      onKeyDown={(e) => e.key === "Enter" && generateLesson()}
                    />
                  </div>

                  {/* Suggested Topics - Dropdowns */}
                  <div ref={dropdownRef} className="relative" style={{ zIndex: 9999 }}>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                      Suggested Topics
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(["Math", "Reading", "Writing"] as const).map((category) => (
                        <div key={category} className="relative">
                          <button
                            ref={(el) => { buttonRefs.current[category] = el; }}
                            onClick={() => setOpenDropdown(openDropdown === category ? null : category)}
                            className={`lessons-dropdown-trigger w-full px-4 py-2.5 rounded-xl border transition text-sm font-medium text-left flex items-center justify-between ${
                              selectedTopic && SAT_TOPICS[category as keyof typeof SAT_TOPICS].includes(selectedTopic)
                                ? "border-sky-500 dark:border-sky-400 bg-sky-50 dark:bg-sky-900/50 text-sky-900 dark:text-slate-100"
                                : "border-slate-200 dark:border-slate-600 hover:border-sky-300 dark:hover:border-sky-500 text-slate-600 dark:text-slate-100 bg-white dark:bg-slate-950"
                            }`}
                          >
                            <span>{category}</span>
                            <svg
                              className={`w-4 h-4 transition-transform ${
                                openDropdown === category ? "rotate-180" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                          {openDropdown === category && (
                            <div className="lessons-dropdown absolute w-full mt-1 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-600 rounded-lg shadow-xl dark:shadow-black/50 max-h-60 overflow-hidden" style={{ zIndex: 10000 }}>
                              <div className="dropdown-scroll h-full max-h-60">
                                {SAT_TOPICS[category as keyof typeof SAT_TOPICS].map((topicName) => (
                                  <button
                                    key={topicName}
                                    onClick={() => {
                                      handleTopicSelect(topicName);
                                      setOpenDropdown(null);
                                    }}
                                    className={`lessons-dropdown-item w-full px-4 py-2.5 text-left text-sm font-medium transition ${
                                      selectedTopic === topicName
                                        ? "bg-sky-50 dark:bg-sky-900/50 text-sky-900 dark:text-slate-100"
                                        : "text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    {topicName}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                    <PrimaryButton onClick={() => generateLesson()} disabled={loading || !topic.trim()} fullWidth>
                      Generate Lesson
                    </PrimaryButton>
                    {error && (
                      <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-center font-semibold dark:bg-rose-900/30 dark:border-rose-500/50 dark:text-rose-300">
                        {error}
                      </p>
                    )}
                </div>
              </GlassPanel>
            </>
          )}
        </>
      ) : (
        <div className="ai-output-scope">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-600 dark:text-slate-400 font-semibold">
                Lesson
              </p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{lesson.title}</h2>
            </div>
            <PrimaryButton variant="secondary" onClick={reset}>
              New Lesson
            </PrimaryButton>
          </div>

          {/* Goal */}
          <GlassPanel className="mb-6">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Learning Goal</h3>
            {renderFormattedText(lesson.goal)}
          </GlassPanel>

          {/* Explanation */}
          <GlassPanel className="mb-6">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Explanation</h3>
            <ul className="space-y-3">
              {lesson.explanation.map((point, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-3 text-slate-700 dark:text-slate-200"
                >
                  <span className="text-sky-500 dark:text-sky-400 font-bold text-base leading-none mt-0.5 shrink-0">•</span>
                  <span className="font-medium leading-relaxed">{renderBoldText(point)}</span>
                </motion.li>
              ))}
            </ul>
          </GlassPanel>

          {/* Example */}
          <GlassPanel className="mb-6">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Example</h3>
            <div className="border-2 border-sky-300 dark:border-sky-500 rounded-xl bg-sky-50 dark:bg-slate-900/70 p-5 shadow-sm">
              {renderFormattedText(lesson.example)}
            </div>
          </GlassPanel>

          {/* Practice Questions */}
          <GlassPanel className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Practice Questions</h3>
              <PrimaryButton variant="secondary" onClick={generateMorePractice} disabled={loading}>
                {loading ? "Generating..." : "Generate More Practice"}
              </PrimaryButton>
            </div>
            <div className="space-y-6">
              {lesson.practice.map((q, idx) => {
                const selectedAnswer = selectedAnswers[idx] || null;
                const isCorrect = selectedAnswer === q.correctAnswer;
                const showAnswer = showAnswers[idx];

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 bg-slate-100 dark:bg-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                          Question {idx + 1}
                        </span>
                        {selectedAnswer && (
                          <span
                            className={`text-sm font-semibold px-3 py-1 rounded-full w-fit ${
                              isCorrect
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                            }`}
                          >
                            {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                          </span>
                        )}
                      </div>
                      <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-white mb-4 leading-relaxed whitespace-pre-line">{q.question}</p>
                      <div className="space-y-3 mb-4">
                        {q.options.map((option, optIdx) => {
                          const optionLetter = String.fromCharCode(65 + optIdx) as "A" | "B" | "C" | "D";
                          const isSelected = selectedAnswer === optionLetter;
                          const isCorrectOption = optionLetter === q.correctAnswer;

                          return (
                            <button
                              key={optIdx}
                              onClick={() => handleAnswerSelect(idx, optionLetter)}
                              disabled={showAnswer}
                              className={`w-full text-left p-3 sm:p-4 rounded-2xl border-2 transition-all font-medium ${
                                showAnswer && isCorrectOption
                                  ? "border-green-400 dark:border-green-400 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-900/30 text-green-900 dark:text-green-100 shadow-[0_4px_0_rgba(34,197,94,0.15),0_6px_16px_rgba(34,197,94,0.1)] scale-[1.02]"
                                  : isSelected
                                  ? "border-sky-400 dark:border-sky-400 bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-900/40 dark:to-sky-900/30 text-sky-900 dark:text-sky-100 shadow-[0_4px_0_rgba(14,165,233,0.15),0_6px_16px_rgba(14,165,233,0.1)] scale-[1.02]"
                                  : "border-slate-200 dark:border-slate-600 hover:border-sky-300 dark:hover:border-sky-500 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/90 hover:shadow-[0_3px_0_rgba(14,165,233,0.1),0_4px_12px_rgba(14,165,233,0.08)] hover:-translate-y-0.5 active:translate-y-0.5"
                              }`}
                            >
                              <span className="font-bold mr-3">{optionLetter})</span>
                              <span className="break-words">{option}</span>
                            </button>
                          );
                        })}
                      </div>
                      <PrimaryButton
                        variant="secondary"
                        onClick={() => toggleAnswer(idx)}
                        className="w-full"
                      >
                        {showAnswer ? "Hide Answer" : "Show Answer"}
                      </PrimaryButton>
                      {showAnswer && (
                        <div className="mt-4 space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                              Correct Answer: {q.correctAnswer}
                            </p>
                            {q.explanation && (
                              <div className="mt-3">
                                <p className="text-xs font-bold text-green-700 dark:text-green-400 mb-1.5 uppercase tracking-wide">
                                  ✓ Explanation
                                </p>
                                {renderFormattedText(q.explanation)}
                              </div>
                            )}
                            {q.explanation_incorrect && Object.keys(q.explanation_incorrect).length > 0 && (
                              <div className="mt-4">
                                <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-1.5 uppercase tracking-wide">
                                  ✗ Why Other Answers Are Wrong
                                </p>
                                <div className="space-y-1.5">
                                  {Object.entries(q.explanation_incorrect).map(([letter, reason]) => (
                                    <div key={letter} className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                      <span className="font-semibold text-red-700 dark:text-red-400">Option {letter}:</span>{" "}
                                      {renderFormattedText(reason)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlassPanel>

          {/* Related Flashcards */}
          {lesson.relatedFlashcards && lesson.relatedFlashcards.length > 0 && (
            <GlassPanel>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Related Flashcards</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 font-medium">
                Click on any topic to generate flashcards for practice
              </p>
              <div className="flex flex-wrap gap-2">
                {lesson.relatedFlashcards.map((flashcard, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRelatedFlashcardClick(flashcard)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 hover:border-sky-400 dark:hover:border-sky-500 transition-colors cursor-pointer"
                  >
                    {flashcard} →
                  </button>
                ))}
              </div>
            </GlassPanel>
          )}

          {error && (
            <GlassPanel className="mt-6 border border-rose-500/30 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-900/30">
              <p className="text-sm text-rose-700 dark:text-rose-300 text-center font-semibold">{error}</p>
            </GlassPanel>
          )}
        </div>
      )}
    </div>
  );
}

