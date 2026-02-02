"use client";

import React, { useState, useEffect } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import InputField from "@/components/ui/InputField";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { motion } from "framer-motion";
import { getScoreHistory, getSectionPerformance } from "@/utils/scoreTracking";

const STORAGE_KEY = "sat_study_plan";

interface QuestionnaireAnswer {
  targetScore?: string;
  testDate?: string;
  weakestSection?: string;
  hoursPerDay?: string;
  studyStyle?: string;
  notes?: string;
}

interface PersonalizedPlan {
  // New format
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
  sessionId?: string; // Anonymous session ID for backend migration
}

const questionnaire = [
  {
    type: "button",
    id: "targetScore",
    question: "What's your target peak elevation (SAT score)?",
    options: ["1200", "1300", "1400", "1500+"],
  },
  {
    type: "button",
    id: "testDate",
    question: "How long until your peak attempt?",
    options: ["1 month", "2 months", "3+ months"],
  },
  {
    type: "button",
    id: "weakestSection",
    question: "Which trail section needs the most training?",
    options: ["Reading & Writing", "Math No Calculator", "Math Calculator"],
  },
  {
    type: "button",
    id: "hoursPerDay",
    question: "How many hours can you train per day?",
    options: ["30 min", "1 hour", "2 hours", "3+ hours"],
  },
  {
    type: "button",
    id: "studyStyle",
    question: "What's your preferred training style?",
    options: ["Short daily sessions", "Longer weekly sessions"],
  },
  {
    type: "text",
    id: "notes",
    question: "Any special trail conditions or constraints? (optional)",
  },
];

const renderBoldText = (text: string) => {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={idx}>{part}</span>;
  });
};

export default function StudyPlanPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswer>({});
  const [plan, setPlan] = useState<PersonalizedPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscriptionStatus: string | null;
    hasSubscription: boolean;
  } | null>(null);
  const [freeUsageCount, setFreeUsageCount] = useState(0);
  const [performanceData, setPerformanceData] = useState<{
    weakestSection: string | null;
    averageScore: number;
    hasData: boolean;
  }>({ weakestSection: null, averageScore: 0, hasData: false });

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

  // Load saved plan and completed tasks from localStorage
  useEffect(() => {
    try {
      const savedPlan = localStorage.getItem(STORAGE_KEY);
      const savedTasks = localStorage.getItem(`${STORAGE_KEY}_tasks`);
      if (savedPlan) {
        const parsedPlan = JSON.parse(savedPlan) as PersonalizedPlan;
        setPlan(parsedPlan);
      }
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks) as string[];
        setCompletedTasks(new Set(parsedTasks));
      }
    } catch (error) {
      console.error("Failed to load study plan:", error);
    }
  }, []);

  // Save plan and tasks to localStorage whenever they change
  useEffect(() => {
    if (plan) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      } catch (error) {
        console.error("Failed to save study plan:", error);
      }
    }
  }, [plan]);

  useEffect(() => {
    if (completedTasks.size > 0) {
      try {
        localStorage.setItem(`${STORAGE_KEY}_tasks`, JSON.stringify(Array.from(completedTasks)));
      } catch (error) {
        console.error("Failed to save completed tasks:", error);
      }
    }
  }, [completedTasks]);

  // Load performance data to inform study plan
  useEffect(() => {
    const loadPerformanceData = async () => {
      const history = await getScoreHistory();
      const sectionPerf = await getSectionPerformance();
      
      if (history.sessions.length > 0) {
        // Find weakest section
        const sections = [
          { name: "Math", avg: sectionPerf.math.average, count: sectionPerf.math.count },
          { name: "Reading", avg: sectionPerf.reading.average, count: sectionPerf.reading.count },
          { name: "Writing", avg: sectionPerf.writing.average, count: sectionPerf.writing.count },
        ];
        
        // Only consider sections with at least 1 practice session
        const sectionsWithData = sections.filter(s => s.count > 0);
        
        if (sectionsWithData.length > 0) {
          const weakest = sectionsWithData.reduce((min, section) => 
            section.avg < min.avg ? section : min
          );
          
          setPerformanceData({
            weakestSection: weakest.name,
            averageScore: history.averageScore,
            hasData: true,
          });
          
          // Pre-fill weakest section if not already answered
          if (!answers.weakestSection && weakest.name) {
            const sectionMap: Record<string, string> = {
              "Math": "Math Calculator",
              "Reading": "Reading & Writing",
              "Writing": "Reading & Writing",
            };
            setAnswers(prev => ({ ...prev, weakestSection: sectionMap[weakest.name] || weakest.name }));
          }
        }
      }
    };
    
    loadPerformanceData();
  }, []);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleNext = () => {
    if (currentQuestion < questionnaire.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      generatePlan();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const canProceed = () => {
    const currentQ = questionnaire[currentQuestion];
    if (currentQ.type === "text") return true; // Text is optional
    return answers[currentQ.id as keyof QuestionnaireAnswer] !== undefined;
  };

  const generatePlan = async () => {
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
    setPlan(null);

    try {
      const history = await getScoreHistory();
      const requestBody: {
        answers: QuestionnaireAnswer;
        performanceData?: {
          weakestSection: string | null;
          averageScore: number;
          totalSessions: number;
        };
      } = {
        answers,
      };

      // Only include performanceData if we have actual data
      if (performanceData.hasData && performanceData.averageScore > 0) {
        requestBody.performanceData = {
          weakestSection: performanceData.weakestSection,
          averageScore: performanceData.averageScore,
          totalSessions: history.sessions.length,
        };
      }

      const res = await fetch("/api/generate-personalized-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate study plan.");
      }

      const data = await res.json();
      setPlan(data);
      // Reset completed tasks when generating new plan
      setCompletedTasks(new Set());

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
      setError(err.message || "Error generating plan.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setPlan(null);
    setError(null);
    setCompletedTasks(new Set());
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}_tasks`);
  };

  const toggleTask = (taskId: string) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);
  };

  const getTaskId = (
    type: "weekly" | "daily" | "practice" | "strategy",
    index: number,
    taskIndex?: number
  ): string => {
    if (taskIndex !== undefined) return `${type}-${index}-task-${taskIndex}`;
    if (type === "weekly") return `week-${index}`;
    if (type === "daily") return `day-${index}`;
    if (type === "practice") return `practice-${index}`;
    if (type === "strategy") return `strategy-${index}`;
    return `${type}-${index}`;
  };

  const getCompletionStats = () => {
    if (!plan) return { total: 0, completed: 0, percentage: 0 };
    
    let total = 0;
    let completed = 0;

    // Count weekly plan tasks
    if (plan.weeklyPlan) {
      plan.weeklyPlan.forEach((week, idx) => {
        week.tasks.forEach((_, taskIdx) => {
          total++;
          const taskId = getTaskId("weekly", idx, taskIdx);
          if (completedTasks.has(taskId)) completed++;
        });
      });
    }

    // Count daily plan tasks
    (plan.dailyPlan || plan.days || []).forEach((day, idx) => {
      day.tasks.forEach((_, taskIdx) => {
        total++;
        const taskId = getTaskId("daily", idx, taskIdx);
        if (completedTasks.has(taskId)) completed++;
      });
    });

    // Count practice tests
    if (plan.practiceTests) {
      plan.practiceTests.forEach((_, idx) => {
        total++;
        const taskId = getTaskId("practice", idx);
        if (completedTasks.has(taskId)) completed++;
      });
    }

    // Count strategies
    if (plan.strategies) {
      plan.strategies.forEach((_, idx) => {
        total++;
        const taskId = getTaskId("strategy", idx);
        if (completedTasks.has(taskId)) completed++;
      });
    }

    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  const currentQ = questionnaire[currentQuestion];
  const progress = ((currentQuestion + 1) / questionnaire.length) * 100;

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-10 pb-6 sm:pb-8 md:pb-10 max-w-full overflow-x-hidden w-full">
      <PageHeader
        eyebrow="Study Plans"
        title="Chart your path to the peak."
        subtitle="Answer a few questions to get a personalized expedition route with waypoints and milestones."
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

      {!plan ? (
        <>
          {/* Progress Bar */}
          <GlassPanel className="mb-6">
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300 mb-3 font-semibold">
              <span>
                Question {currentQuestion + 1} of {questionnaire.length}
              </span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full brand-gradient"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </GlassPanel>

          {/* Question */}
          <GlassPanel>
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                  {currentQ.question}
                </h2>
                {currentQ.type === "text" && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">This field is optional</p>
                )}
              </div>

              {currentQ.type === "button" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQ.options?.map((option) => {
                    const isSelected =
                      answers[currentQ.id as keyof QuestionnaireAnswer] === option;
                    return (
                      <button
                        key={option}
                        onClick={() => handleAnswer(currentQ.id, option)}
                        className={`p-4 rounded-xl border transition text-left ${
                          isSelected
                            ? "border-sky-500 dark:border-sky-400 bg-sky-50 dark:bg-sky-900/30 text-sky-900 dark:text-sky-100"
                            : "ai-config-option border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500 text-slate-600 dark:text-slate-100 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <span className="font-medium">{option}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <InputField
                  value={answers.notes || ""}
                  onChange={(e) => handleAnswer("notes", e.target.value)}
                  placeholder="Enter any additional notes or constraints..."
                  onKeyDown={(e) => e.key === "Enter" && canProceed() && handleNext()}
                />
              )}

              {/* Navigation */}
              <div className="flex justify-between gap-3 pt-4">
                <PrimaryButton
                  variant="secondary"
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                >
                  ← Previous
                </PrimaryButton>
                <PrimaryButton
                  onClick={handleNext}
                  disabled={!canProceed() || loading}
                >
                  {currentQuestion === questionnaire.length - 1
                    ? loading
                      ? "Charting Route..."
                      : "Generate Route Map"
                    : "Next →"}
                </PrimaryButton>
              </div>
            </motion.div>
          </GlassPanel>

          {error && (
            <GlassPanel className="mt-6 border border-rose-500/30 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-900/30">
              <p className="text-sm text-rose-700 dark:text-rose-300 text-center font-semibold">{error}</p>
            </GlassPanel>
          )}

          {loading && (
            <GlassPanel className="mt-6 text-center py-12">
              <div className="flex flex-col items-center justify-center min-h-[300px]">
                <LoadingSpinner size="lg" message="Charting your route map…" />
              </div>
            </GlassPanel>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <GlassPanel>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Your Expedition Route Map</h2>
                <p className="text-slate-600 dark:text-slate-300 mt-2">{renderBoldText(plan.overview)}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">
                  Your Study Plans are ready. Focus on the next task, and the momentum will follow.
                </p>
                {(() => {
                  const stats = getCompletionStats();
                  return stats.total > 0 ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">
                      Progress: {stats.completed} of {stats.total} tasks completed ({stats.percentage}%)
                    </p>
                  ) : null;
                })()}
              </div>
                <PrimaryButton variant="secondary" onClick={reset}>
                Plan New Route
              </PrimaryButton>
            </div>

            {/* Weekly Plan */}
            {plan.weeklyPlan && plan.weeklyPlan.length > 0 && (
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">Weekly Plan</h3>
                <div className="space-y-4">
                  {plan.weeklyPlan.map((week, idx) => (
                    <motion.div
                      key={week.week}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="ai-output-card border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="text-xl font-semibold text-slate-900 dark:text-white">Week {week.week}</h4>
                          <span className="text-sm text-sky-700 dark:text-sky-200 px-3 py-1 rounded-full bg-sky-100/80 dark:bg-sky-900/50 border border-sky-200 dark:border-sky-600">
                            {renderBoldText(week.focus)}
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {week.tasks.map((task, taskIdx) => {
                            const taskId = getTaskId("weekly", idx, taskIdx);
                            const isCompleted = completedTasks.has(taskId);
                            return (
                              <li
                                key={taskIdx}
                                className="flex items-start gap-3 text-slate-600 dark:text-slate-300"
                              >
                                <input
                                  type="checkbox"
                                  checked={isCompleted}
                                  onChange={() => toggleTask(taskId)}
                                  className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-500 text-sky-600 focus:ring-sky-500 dark:bg-slate-900"
                                />
                                <span className={isCompleted ? "line-through opacity-60" : ""}>{renderBoldText(task)}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Plan */}
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                {(plan.timeframe === "daily" || !plan.timeframe) ? "Daily Trail Log" : "Daily Schedule"}
              </h3>
              <div className="space-y-4">
                {(plan.dailyPlan || plan.days || []).map((day, idx) => (
                  <motion.div
                    key={day.day}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="ai-output-card border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-5">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">{renderBoldText(day.day)}</h3>
                    <ul className="space-y-2">
                      {day.tasks.map((task, taskIdx) => {
                        const taskId = getTaskId("daily", idx, taskIdx);
                        const isCompleted = completedTasks.has(taskId);
                        return (
                          <li
                            key={taskIdx}
                            className="flex items-start gap-3 text-slate-600 dark:text-slate-300"
                          >
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => toggleTask(taskId)}
                              className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-500 text-sky-600 focus:ring-sky-500 dark:bg-slate-900"
                            />
                            <span className={isCompleted ? "line-through opacity-60" : ""}>{renderBoldText(task)}</span>
                          </li>
                        );
                      })}
                    </ul>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Practice Tests */}
            {plan.practiceTests && plan.practiceTests.length > 0 && (
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">Practice Test Schedule</h3>
                <div className="ai-output-card border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-5">
                  <ul className="space-y-2">
                    {plan.practiceTests.map((test, idx) => {
                      const taskId = getTaskId("practice", idx);
                      const isCompleted = completedTasks.has(taskId);
                      return (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-slate-600 dark:text-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => toggleTask(taskId)}
                            className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-500 text-sky-600 focus:ring-sky-500 dark:bg-slate-900"
                          />
                          <span className={isCompleted ? "line-through opacity-60" : ""}>{renderBoldText(test)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}

            {/* Strategies */}
            {plan.strategies && plan.strategies.length > 0 && (
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">Improvement Strategies</h3>
                <div className="ai-output-card border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-5">
                  <ul className="space-y-2">
                    {plan.strategies.map((strategy, idx) => {
                      const taskId = getTaskId("strategy", idx);
                      const isCompleted = completedTasks.has(taskId);
                      return (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-slate-600 dark:text-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => toggleTask(taskId)}
                            className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-500 text-sky-600 focus:ring-sky-500 dark:bg-slate-900"
                          />
                          <span className={isCompleted ? "line-through opacity-60" : ""}>{renderBoldText(strategy)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
