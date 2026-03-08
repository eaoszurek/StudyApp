"use client";

import React, { useEffect, useMemo, useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import InputField from "@/components/ui/InputField";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SubtleProgressCircle from "@/components/ui/SubtleProgressCircle";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getScoreHistory, getSectionPerformance } from "@/utils/scoreTracking";
import type {
  PersonalizedPlan,
  QuestionnaireAnswer,
  StudyCalendarDay,
  StudyCalendarTask,
  StudyCalendarWeek,
  StudyTaskLaunchTarget,
  StudyTaskType,
} from "@/types";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

const STORAGE_KEY = "sat_study_plan";
const TASKS_STORAGE_KEY = `${STORAGE_KEY}_tasks`;
const UNLOCKED_WEEK_KEY = `${STORAGE_KEY}_unlocked_week`;
const ACTIVE_WEEK_KEY = `${STORAGE_KEY}_active_week`;

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ACCENTS = [
  "border-t-sky-300 dark:border-t-sky-500",
  "border-t-blue-300 dark:border-t-blue-500",
  "border-t-indigo-300 dark:border-t-indigo-500",
  "border-t-violet-300 dark:border-t-violet-500",
  "border-t-cyan-300 dark:border-t-cyan-500",
  "border-t-emerald-300 dark:border-t-emerald-500",
  "border-t-amber-300 dark:border-t-amber-500",
];

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
    type: "button",
    id: "workloadPreference",
    question: "How should your week be balanced?",
    options: ["Balanced all week", "Lighter weekdays", "Weekend push"],
  },
  {
    type: "button",
    id: "confidenceLevel",
    question: "How confident are you with current SAT skills?",
    options: ["Need foundation refresh", "Mixed confidence", "Ready for harder drills"],
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

const sanitizeText = (text: string) => text.replace(/\*\*/g, "").trim();

const inferSkillFocus = (taskText: string, fallback: string) => {
  const clean = sanitizeText(taskText);
  const onMatch = clean.match(/\bon\s+([a-z0-9&\-\s]+)$/i);
  if (onMatch?.[1]) return onMatch[1].trim();
  const colonParts = clean.split(":");
  if (colonParts.length > 1) return colonParts.slice(1).join(":").trim();
  return fallback;
};

const inferEstimatedMinutes = (taskText: string, type: StudyTaskType) => {
  const minutes = taskText.match(/(\d+)(?:\s*[-–to]+\s*(\d+))?\s*min/i);
  if (minutes) {
    const first = parseInt(minutes[1], 10);
    const second = minutes[2] ? parseInt(minutes[2], 10) : first;
    return Math.round((first + second) / 2);
  }
  if (type === "practice") return 45;
  if (type === "flashcards") return 15;
  if (type === "lesson") return 20;
  return 12;
};

const inferTaskType = (taskText: string): StudyTaskType => {
  const lower = taskText.toLowerCase();
  if (lower.includes("practice test") || lower.includes("full-length")) return "practice";
  if (lower.includes("micro-lesson") || lower.includes("lesson")) return "lesson";
  if (lower.includes("flashcard")) return "flashcards";
  return "review";
};

const inferLaunchTarget = (type: StudyTaskType, skillFocus: string): StudyTaskLaunchTarget => {
  const normalizedTopic = skillFocus;
  const lower = skillFocus.toLowerCase();
  const section =
    /algebra|equation|linear|quadratic|function|geometry|ratio|slope|statistics|probability|graph/i.test(lower)
      ? "math"
      : /grammar|punctuation|vocabulary|syntax|evidence|transition|rhetorical/i.test(lower)
        ? "writing"
        : "reading";

  if (type === "flashcards") {
    return { path: "/flashcards", params: { topic: normalizedTopic } };
  }
  if (type === "lesson") {
    return { path: "/lessons", params: { topic: normalizedTopic, autostart: "1" } };
  }
  if (type === "practice") {
    return {
      path: "/practice",
      params: { autostart: "1", section, topic: normalizedTopic, difficulty: "Mixed", questions: "12" },
    };
  }
  return { path: "/progress" };
};

const formatTaskType = (type: StudyTaskType) => {
  if (type === "flashcards") return "Flashcards";
  if (type === "practice") return "Practice Test";
  if (type === "lesson") return "Lesson";
  return "Review";
};

const mondayForCurrentWeek = () => {
  const now = new Date();
  const day = now.getDay(); // 0 Sunday
  const distanceToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const buildCalendarWeeks = (plan: PersonalizedPlan): StudyCalendarWeek[] => {
  const daily = plan.dailyPlan || plan.days || [];
  const weekly = plan.weeklyPlan || [];
  const totalWeeks = Math.max(1, weekly.length, Math.ceil(daily.length / 7));
  const startMonday = mondayForCurrentWeek();

  const buildTask = (rawTask: string, weekIndex: number, dayIndex: number, taskIndex: number, fallback: string) => {
    const type = inferTaskType(rawTask);
    const skillFocus = inferSkillFocus(rawTask, fallback);
    return {
      id: `w${weekIndex}-d${dayIndex}-t${taskIndex}`,
      type,
      skillFocus,
      estimatedMinutes: inferEstimatedMinutes(rawTask, type),
      rawText: sanitizeText(rawTask),
      launchTarget: inferLaunchTarget(type, skillFocus),
    } satisfies StudyCalendarTask;
  };

  const weeks: StudyCalendarWeek[] = [];
  for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex += 1) {
    const weekFocus = sanitizeText(weekly[weekIndex]?.focus || `Week ${weekIndex + 1} Focus`);
    const weekTasks = weekly[weekIndex]?.tasks || [];
    const days: StudyCalendarDay[] = DAY_NAMES.map((dayName, dayIdx) => {
      const absoluteDay = weekIndex * 7 + dayIdx;
      const fromDaily = daily[absoluteDay]?.tasks || [];
      const synthesized =
        fromDaily.length > 0
          ? fromDaily
          : weekTasks.length > 0
            ? [weekTasks[dayIdx % weekTasks.length], weekTasks[(dayIdx + 2) % weekTasks.length]]
            : [`Review progress on ${weekFocus}`];
      const trimmed = synthesized.filter(Boolean).slice(0, 3);
      const finalTasks = (trimmed.length > 0 ? trimmed : [`Review progress on ${weekFocus}`]).slice(0, 3);

      const date = new Date(startMonday);
      date.setDate(startMonday.getDate() + weekIndex * 7 + dayIdx);
      const fallbackFocus = weekFocus.replace(/^Week\s*\d+\s*/i, "").trim() || "SAT skill focus";

      return {
        id: `week-${weekIndex}-day-${dayIdx}`,
        dayName,
        dayNumber: date.getDate(),
        dateISO: date.toISOString(),
        accentClass: DAY_ACCENTS[dayIdx],
        tasks: finalTasks.map((task, taskIdx) => buildTask(task, weekIndex, dayIdx, taskIdx, fallbackFocus)),
      };
    });

    weeks.push({
      weekIndex,
      label: `Week ${weekIndex + 1}`,
      focus: weekFocus,
      days,
    });
  }
  return weeks;
};

export default function StudyPlanPage() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswer>({});
  const [plan, setPlan] = useState<PersonalizedPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set<string>());
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscriptionStatus: string | null;
    hasSubscription: boolean;
  } | null>(null);
  const [freeUsageCount, setFreeUsageCount] = useState(0);
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const [unlockedWeekIndex, setUnlockedWeekIndex] = useState(0);
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
      const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      const savedUnlockedWeek = localStorage.getItem(UNLOCKED_WEEK_KEY);
      const savedActiveWeek = localStorage.getItem(ACTIVE_WEEK_KEY);
      if (savedPlan) {
        const parsedPlan = JSON.parse(savedPlan) as PersonalizedPlan;
        setPlan(parsedPlan);
      }
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks) as string[];
        setCompletedTasks(new Set(parsedTasks));
      }
      if (savedUnlockedWeek) {
        setUnlockedWeekIndex(Math.max(0, parseInt(savedUnlockedWeek, 10) || 0));
      }
      if (savedActiveWeek) {
        setActiveWeekIndex(Math.max(0, parseInt(savedActiveWeek, 10) || 0));
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
    try {
      if (completedTasks.size > 0) {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(Array.from(completedTasks)));
      } else {
        localStorage.removeItem(TASKS_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Failed to save completed tasks:", error);
    }
  }, [completedTasks]);

  useEffect(() => {
    try {
      localStorage.setItem(UNLOCKED_WEEK_KEY, String(unlockedWeekIndex));
      localStorage.setItem(ACTIVE_WEEK_KEY, String(activeWeekIndex));
    } catch (error) {
      console.error("Failed to save week state:", error);
    }
  }, [activeWeekIndex, unlockedWeekIndex]);

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
      setCompletedTasks(new Set());
      setActiveWeekIndex(0);
      setUnlockedWeekIndex(0);

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
    setActiveWeekIndex(0);
    setUnlockedWeekIndex(0);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TASKS_STORAGE_KEY);
    localStorage.removeItem(UNLOCKED_WEEK_KEY);
    localStorage.removeItem(ACTIVE_WEEK_KEY);
  };

  const markTaskComplete = (taskId: string) => {
    const newCompleted = new Set(completedTasks);
    newCompleted.add(taskId);
    setCompletedTasks(newCompleted);
  };

  const calendarWeeks = useMemo(() => {
    if (!plan) return [];
    return buildCalendarWeeks(plan);
  }, [plan]);

  const getWeekStats = (week: StudyCalendarWeek) => {
    const total = week.days.reduce((acc, day) => acc + day.tasks.length, 0);
    const completed = week.days.reduce(
      (acc, day) => acc + day.tasks.filter((task) => completedTasks.has(task.id)).length,
      0
    );
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  };

  const isWeekComplete = (week: StudyCalendarWeek) => {
    if (week.days.length === 0) return false;
    return week.days.every((day) => day.tasks.every((task) => completedTasks.has(task.id)));
  };

  useEffect(() => {
    if (calendarWeeks.length === 0) return;
    let furthestUnlocked = unlockedWeekIndex;
    for (let i = 0; i < calendarWeeks.length; i += 1) {
      if (i === 0 || isWeekComplete(calendarWeeks[i - 1])) {
        furthestUnlocked = Math.max(furthestUnlocked, i);
      }
    }
    if (furthestUnlocked !== unlockedWeekIndex) {
      setUnlockedWeekIndex(furthestUnlocked);
    }

    const currentWeek = calendarWeeks[activeWeekIndex];
    if (
      currentWeek &&
      isWeekComplete(currentWeek) &&
      activeWeekIndex < calendarWeeks.length - 1
    ) {
      setActiveWeekIndex(activeWeekIndex + 1);
    }
  }, [calendarWeeks, completedTasks, activeWeekIndex, unlockedWeekIndex]);

  const launchTask = (task: StudyCalendarTask) => {
    markTaskComplete(task.id);
    const params = task.launchTarget.params
      ? new URLSearchParams(task.launchTarget.params).toString()
      : "";
    router.push(params ? `${task.launchTarget.path}?${params}` : task.launchTarget.path);
  };

  const currentQ = questionnaire[currentQuestion];
  const progress = ((currentQuestion + 1) / questionnaire.length) * 100;
  const safeWeekIndex = Math.min(Math.max(activeWeekIndex, 0), Math.max(calendarWeeks.length - 1, 0));
  const activeWeek = calendarWeeks[safeWeekIndex];
  const activeWeekStats = activeWeek ? getWeekStats(activeWeek) : { total: 0, completed: 0, percentage: 0 };

  const getDayProgress = (day: StudyCalendarDay) => {
    const completedCount = day.tasks.filter((task) => completedTasks.has(task.id)).length;
    const total = day.tasks.length;
    return {
      completedCount,
      total,
      percentage: total > 0 ? Math.round((completedCount / total) * 100) : 0,
      isComplete: total > 0 && completedCount === total,
    };
  };

  return (
    <div className="px-3 sm:px-4 md:px-6 pb-6 sm:pb-8 md:pb-10 max-w-[1300px] mx-auto overflow-x-hidden w-full">
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
          <GlassPanel className="mb-6">
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300 mb-3 font-semibold">
              <span>
                Question {currentQuestion + 1} of {questionnaire.length}
              </span>
              <SubtleProgressCircle progress={progress} />
            </div>
          </GlassPanel>

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
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Your SAT Weekly Calendar</h2>
                <p className="text-slate-600 dark:text-slate-300 mt-2">{renderBoldText(plan.overview)}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">
                  {activeWeekStats.completed} of {activeWeekStats.total} tasks completed this week ({activeWeekStats.percentage}%)
                </p>
              </div>
              <PrimaryButton variant="secondary" onClick={reset}>
                Plan New Route
              </PrimaryButton>
            </div>

            {activeWeek && (
              <>
                <div className="mb-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold">
                        Weekly Plan
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{activeWeek.label}</h3>
                        <span className="text-xs text-sky-700 dark:text-sky-200 px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-900/40 border border-sky-200 dark:border-sky-700">
                          {activeWeek.focus}
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          {safeWeekIndex <= unlockedWeekIndex ? "Unlocked" : "Upcoming"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveWeekIndex((prev) => Math.max(0, prev - 1))}
                        disabled={safeWeekIndex === 0}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        aria-label="Previous week"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveWeekIndex((prev) => Math.min(calendarWeeks.length - 1, prev + 1))
                        }
                        disabled={safeWeekIndex >= calendarWeeks.length - 1}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        aria-label="Next week"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-300"
                      style={{ width: `${activeWeekStats.percentage}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {activeWeekStats.completed} of {activeWeekStats.total} tasks completed
                  </p>
                </div>
                <div className="study-calendar-scroll overflow-x-auto pb-2">
                  <div className="grid grid-cols-7 gap-3 min-w-[980px]">
                    {activeWeek.days.map((day) => {
                      const dayProgress = getDayProgress(day);
                      return (
                        <div
                          key={day.id}
                          className={`border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900/70 p-3 border-t-4 ${day.accentClass} ${
                            dayProgress.isComplete ? "ring-1 ring-emerald-400/70 dark:ring-emerald-500/50" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 font-semibold">
                                {day.dayName.slice(0, 3)}
                              </p>
                              <p className="text-lg font-semibold text-slate-900 dark:text-white">{day.dayNumber}</p>
                            </div>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {dayProgress.completedCount}/{dayProgress.total}
                            </span>
                          </div>
                          <div className="mb-3 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-300"
                              style={{ width: `${dayProgress.percentage}%` }}
                            />
                          </div>

                          <div className="space-y-2">
                            {day.tasks.map((task) => {
                              const isCompleted = completedTasks.has(task.id);
                              return (
                                <div
                                  key={task.id}
                                  className={`rounded-xl border p-2.5 ${
                                    isCompleted
                                      ? "border-emerald-200 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-900/25"
                                      : "border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-sky-700 dark:text-sky-300">
                                      {formatTaskType(task.type)}
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{task.estimatedMinutes} min</span>
                                  </div>
                                  <p className="text-xs font-medium text-slate-800 dark:text-slate-100 leading-snug">
                                    {task.skillFocus}
                                  </p>
                                  <div className="mt-2">
                                    {isCompleted ? (
                                      <div className="h-7 w-7 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center">
                                        <Check size={14} />
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => launchTask(task)}
                                        className="h-7 px-3 rounded-full text-xs font-semibold bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white transition-colors"
                                      >
                                        Start
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
