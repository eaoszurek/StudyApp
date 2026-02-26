"use client";

import React, { useState, useEffect } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import InputField from "@/components/ui/InputField";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SubtleProgressCircle from "@/components/ui/SubtleProgressCircle";
import { motion } from "framer-motion";
import { getScoreHistory, getSectionPerformance } from "@/utils/scoreTracking";

const STORAGE_KEY = "sat_study_plan";
const REMAINING_WEEKS_KEY = "sat_study_plan_remaining_weeks";

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
    options: ["Reading & Writing", "Math", "Math + Reading & Writing"],
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

const groupTasksBySection = (tasks: string[]) => {
  const groups = {
    reading: [] as { task: string; index: number }[],
    math: [] as { task: string; index: number }[],
    other: [] as { task: string; index: number }[],
  };

  tasks.forEach((task, index) => {
    const lower = task.toLowerCase();
    if (lower.startsWith("reading & writing:") || lower.startsWith("reading:") || lower.startsWith("writing:")) {
      groups.reading.push({ task, index });
      return;
    }
    if (lower.startsWith("math:")) {
      groups.math.push({ task, index });
      return;
    }
    if (/reading|writing|grammar|punctuation|transition|evidence|vocabulary|syntax|boundary|rhetorical|concision|agreement|modifier/i.test(lower)) {
      groups.reading.push({ task, index });
      return;
    }
    if (/math|algebra|equation|linear|quadratic|function|geometry|percent|ratio|statistics|probability|graph|slope|circle|inequal|exponent|radical|system/i.test(lower)) {
      groups.math.push({ task, index });
      return;
    }
    groups.other.push({ task, index });
  });

  return groups;
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
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const [showRemainingWeeks, setShowRemainingWeeks] = useState(false);
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
      const savedRemainingWeeks = localStorage.getItem(REMAINING_WEEKS_KEY);
      if (savedPlan) {
        const parsedPlan = JSON.parse(savedPlan) as PersonalizedPlan;
        setPlan(parsedPlan);
      }
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks) as string[];
        setCompletedTasks(new Set(parsedTasks));
      }
      if (savedRemainingWeeks) {
        setShowRemainingWeeks(savedRemainingWeeks === "true");
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

  useEffect(() => {
    try {
      localStorage.setItem(REMAINING_WEEKS_KEY, String(showRemainingWeeks));
    } catch (error) {
      console.error("Failed to save remaining weeks state:", error);
    }
  }, [showRemainingWeeks]);

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
              "Math": "Math",
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
    setShowRemainingWeeks(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}_tasks`);
    localStorage.removeItem(REMAINING_WEEKS_KEY);
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

    // Count daily plan tasks
    (plan.dailyPlan || plan.days || []).forEach((day, idx) => {
      day.tasks.forEach((_, taskIdx) => {
        total++;
        const taskId = getTaskId("daily", idx, taskIdx);
        if (completedTasks.has(taskId)) completed++;
      });
    });

    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  const getActiveWeekIndex = () => {
    if (!plan?.weeklyPlan || plan.weeklyPlan.length === 0) return 0;
    const daily = plan.dailyPlan || plan.days || [];
    if (daily.length === 0) return 0;
    const daysPerWeek = 7;
    for (let weekIdx = 0; weekIdx < plan.weeklyPlan.length; weekIdx += 1) {
      const start = weekIdx * daysPerWeek;
      const end = start + daysPerWeek;
      const weekDays = daily.slice(start, end);
      if (weekDays.length === 0) return weekIdx;
      const weekComplete = weekDays.every((day, dayOffset) =>
        day.tasks.every((_, taskIdx) => completedTasks.has(getTaskId("daily", start + dayOffset, taskIdx)))
      );
      if (!weekComplete) return weekIdx;
    }
    return Math.max(0, plan.weeklyPlan.length - 1);
  };

  const getActiveDayIndex = () => {
    const daily = plan?.dailyPlan || plan?.days || [];
    if (daily.length === 0) return 0;
    const firstIncomplete = daily.findIndex((day, dayIdx) =>
      day.tasks.some((_, taskIdx) => !completedTasks.has(getTaskId("daily", dayIdx, taskIdx)))
    );
    if (firstIncomplete === -1) return Math.max(0, daily.length - 1);
    return firstIncomplete;
  };

  const getCurrentDailyTargets = () => {
    const daily = plan?.dailyPlan || plan?.days || [];
    if (daily.length === 0) {
      return {
        dayLabel: "",
        firstTarget: [] as { task: string; taskId: string }[],
        secondTarget: [] as { task: string; taskId: string }[],
        firstTargetComplete: false,
      };
    }
    const activeDayIndex = getActiveDayIndex();
    const activeDay = daily[activeDayIndex];
    const firstTarget = activeDay.tasks.slice(0, 2).map((task, idx) => ({
      task,
      taskId: getTaskId("daily", activeDayIndex, idx),
    }));
    const secondTarget = activeDay.tasks.slice(2, 4).map((task, idx) => ({
      task,
      taskId: getTaskId("daily", activeDayIndex, idx + 2),
    }));
    const firstTargetComplete = firstTarget.length > 0 && firstTarget.every((item) => completedTasks.has(item.taskId));

    return {
      dayLabel: activeDay.day,
      firstTarget,
      secondTarget,
      firstTargetComplete,
    };
  };

  const toggleCard = (key: string) => {
    setCollapsedCards((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const currentQ = questionnaire[currentQuestion];
  const progress = ((currentQuestion + 1) / questionnaire.length) * 100;

  return (
    <div className="px-3 sm:px-4 md:px-6 pb-6 sm:pb-8 md:pb-10 max-w-4xl mx-auto overflow-x-hidden w-full">
      {!loading && !plan && (
        <PageHeader
          eyebrow="Study Plans"
          title="Chart your path to the peak."
          subtitle="Answer a few questions to get a personalized expedition route with waypoints and milestones."
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
              <div className="flex items-center gap-3">
                <span>{Math.round(progress)}% complete</span>
                <SubtleProgressCircle progress={progress} />
              </div>
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
                        className={`p-4 rounded-2xl border-2 transition-all text-left font-medium ${
                          isSelected
                            ? "border-sky-400 dark:border-sky-400 bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-900/40 dark:to-sky-900/30 text-sky-900 dark:text-sky-100 shadow-[0_4px_0_rgba(14,165,233,0.2),0_6px_16px_rgba(14,165,233,0.15)] scale-[1.02]"
                            : "ai-config-option border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-100 dark:hover:text-white bg-white dark:bg-slate-900/90"
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

            {(() => {
              const dailyTarget = getCurrentDailyTargets();
              if (!dailyTarget.dayLabel) return null;
              const showSecondTarget = dailyTarget.firstTargetComplete || showRemainingWeeks;
              return (
                <div className="mb-6 ai-output-card border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 font-semibold">
                      Daily Target
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRemainingWeeks((prev) => !prev)}
                      className="text-xs font-semibold px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:border-sky-300 dark:hover:border-sky-500 hover:text-slate-900 dark:hover:text-white transition shadow-sm hover:shadow-md dark:hover:shadow-[0_8px_18px_rgba(56,189,248,0.25)]"
                    >
                      {showRemainingWeeks ? "Hide Preview" : "Show in Advance"}
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-3">
                    {renderBoldText(dailyTarget.dayLabel)}
                  </p>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold mb-2">
                    Target 1
                  </div>
                  <ul className="space-y-2">
                    {dailyTarget.firstTarget.map(({ task, taskId }, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={completedTasks.has(taskId)}
                          onChange={() => toggleTask(taskId)}
                          className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-500 text-sky-600 focus:ring-sky-500 dark:bg-slate-900"
                        />
                        <span className={completedTasks.has(taskId) ? "line-through opacity-60" : ""}>
                          {renderBoldText(task)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {showSecondTarget && dailyTarget.secondTarget.length > 0 && (
                    <>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold mt-4 mb-2">
                        Target 2
                      </div>
                      <ul className="space-y-2">
                        {dailyTarget.secondTarget.map(({ task, taskId }, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-slate-700 dark:text-slate-200">
                            <input
                              type="checkbox"
                              checked={completedTasks.has(taskId)}
                              onChange={() => toggleTask(taskId)}
                              className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-500 text-sky-600 focus:ring-sky-500 dark:bg-slate-900"
                            />
                            <span className={completedTasks.has(taskId) ? "line-through opacity-60" : ""}>
                              {renderBoldText(task)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Current Week Focus */}
            {plan.weeklyPlan && plan.weeklyPlan.length > 0 && (
              <div className="mb-6 ai-output-card border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-5">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Week {plan.weeklyPlan[getActiveWeekIndex()]?.week}</h3>
                  <span className="text-sm text-sky-700 dark:text-sky-200 px-3 py-1 rounded-full bg-sky-100/80 dark:bg-sky-900/50 border border-sky-200 dark:border-sky-600">
                    {renderBoldText(plan.weeklyPlan[getActiveWeekIndex()]?.focus || "")}
                  </span>
                </div>
              </div>
            )}

            {/* Daily Plan (preview only) */}
            {showRemainingWeeks && (
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                {(plan.timeframe === "daily" || !plan.timeframe) ? "Daily Trail Log" : "Daily Schedule"}
              </h3>
              <div className="space-y-4">
                {(plan.dailyPlan || plan.days || []).slice(getActiveDayIndex(), getActiveDayIndex() + 1).map((day, idx) => (
                  <motion.div
                    key={day.day}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="ai-output-card border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-5">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">{renderBoldText(day.day)}</h3>
                    {(() => {
                      const groups = groupTasksBySection(day.tasks);
                      const actualDayIndex = getActiveDayIndex() + idx;
                      const sectionKey = `daily-${actualDayIndex}`;
                      const isCollapsed = collapsedCards[sectionKey];
                      const renderGroup = (
                        label: string,
                        items: { task: string; index: number }[]
                      ) => {
                        if (items.length === 0) return null;
                        return (
                          <div className="mb-3 last:mb-0">
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold mb-2">
                              {label}
                            </div>
                            <ul className="space-y-2">
                              {items.map(({ task, index }) => {
                                const taskId = getTaskId("daily", actualDayIndex, index);
                                const isCompleted = completedTasks.has(taskId);
                                return (
                                  <li
                                    key={index}
                                    className="flex items-start gap-3 text-slate-600 dark:text-slate-300"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isCompleted}
                                      onChange={() => toggleTask(taskId)}
                                      className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-500 text-sky-600 focus:ring-sky-500 dark:bg-slate-900"
                                    />
                                    <span className={isCompleted ? "line-through opacity-60" : ""}>
                                      {renderBoldText(task)}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      };

                      return (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold">
                              Tasks
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleCard(sectionKey)}
                              className="text-xs font-semibold px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:border-sky-300 dark:hover:border-sky-500 hover:text-slate-900 dark:hover:text-white transition shadow-sm hover:shadow-md dark:hover:shadow-[0_8px_18px_rgba(56,189,248,0.25)]"
                            >
                              {isCollapsed ? "Show Tasks" : "Hide Tasks"}
                            </button>
                          </div>
                          {!isCollapsed && (
                            <>
                              {renderGroup("Reading & Writing", groups.reading)}
                              {renderGroup("Math", groups.math)}
                              {renderGroup("Other", groups.other)}
                            </>
                          )}
                        </div>
                      );
                    })()}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            )}

            {/* Remaining Weeks */}
            {showRemainingWeeks && plan.weeklyPlan && plan.weeklyPlan.length > 1 && (
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">Remaining Weeks</h3>
                  <div className="space-y-4">
                    {plan.weeklyPlan.slice(getActiveWeekIndex() + 1).map((week, idx) => {
                      const actualIndex = getActiveWeekIndex() + idx + 1;
                      return (
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
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              This week unlocks after you complete the current week’s daily targets.
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
              </div>
            )}

            {/* Strategies */}
            {showRemainingWeeks && plan.strategies && plan.strategies.length > 0 && (
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">Quick Tips</h3>
                <div className="ai-output-card border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-5">
                  <ul className="space-y-3">
                    {plan.strategies.map((strategy, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-slate-700 dark:text-slate-200"
                      >
                        <span className="text-sky-500 dark:text-sky-400 font-bold text-base leading-none mt-0.5 shrink-0">•</span>
                        <span className="leading-relaxed">{renderBoldText(strategy)}</span>
                      </li>
                    ))}
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
