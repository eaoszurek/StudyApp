"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import GlassPanel from "@/components/ui/GlassPanel";
import PageHeader from "@/components/ui/PageHeader";
import FeatureIcon from "@/components/ui/FeatureIcon";
import Link from "next/link";
import { balanceStripLooseParens } from "@/lib/studyPlanDates";
import { getScoreHistory, getRecentSessions } from "@/utils/scoreTracking";
import { getPercentile, getScoreInterpretation } from "@/utils/satScoring";
import { getStreakState, getDaysSinceLastPractice, type StreakState } from "@/utils/streakTracking";
import { getWeeklyGoalState, type WeeklyGoalState } from "@/utils/weeklyGoal";
import { Flame } from "lucide-react";
import type { PersonalizedPlan, StudyCalendarTask } from "@/types";

const REENGAGEMENT_GAP_DAYS = 2;
const REENGAGEMENT_DISMISS_KEY = "peakprep_reengagement_dismissed_ymd";

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STUDY_PLAN_STORAGE_KEY = "sat_study_plan";
const STUDY_TASKS_STORAGE_KEY = `${STUDY_PLAN_STORAGE_KEY}_tasks`;
const ACTIVE_WEEK_STORAGE_KEY = `${STUDY_PLAN_STORAGE_KEY}_active_week`;
const DASHBOARD_FIRST_SEEN_KEY = "dashboard_first_seen_at";

function markStudyTaskComplete(taskId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STUDY_TASKS_STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as string[]) : [];
    if (!Array.isArray(existing)) return;
    if (existing.includes(taskId)) return;
    existing.push(taskId);
    window.localStorage.setItem(STUDY_TASKS_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // ignore storage errors
  }
}

const practiceTool = {
  href: "/practice",
  title: "Practice Tests",
  desc: "Practice tests along your trail with instant feedback and explanations.",
  icon: "practice" as const,
};

const tools = [
  { href: "/study-plan", title: "Study Plans", desc: "Personalized expedition plans with milestones and waypoints.", icon: "study-plan" as const },
  { href: "/lessons", title: "Micro-Lessons", desc: "Quick 1–2 minute knowledge checkpoints with examples and practice questions.", icon: "lessons" as const },
  { href: "/progress", title: "Progress", desc: "Monitor your elevation gain, momentum, and progress toward the peak.", icon: "progress" as const },
];

const getFeatureThemeClass = (href: string) => {
  if (href === "/practice") return "feature-theme-practice";
  if (href === "/study-plan") return "feature-theme-study-plan";
  if (href === "/lessons") return "feature-theme-lessons";
  if (href === "/progress") return "feature-theme-progress";
  return "feature-theme-practice";
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [stats, setStats] = useState([
    { label: "Climbing Momentum", value: "0", trend: "Take your first practice test to get started!" },
    { label: "Estimated SAT Score", value: "—", trend: "Complete practice tests to see your estimated score" },
    { label: "Total Checkpoints", value: "0", trend: "0 practice tests completed" },
  ]);
  const [encouragementMessage, setEncouragementMessage] = useState(
    "Welcome aboard. Start with a Practice Test to set your baseline."
  );
  const [dashboardTitle, setDashboardTitle] = useState("Welcome to Peak Prep.");
  const [todayTasks, setTodayTasks] = useState<Array<{ task: StudyCalendarTask; completed: boolean }>>([]);
  const [todayWeekLabel, setTodayWeekLabel] = useState<string | null>(null);
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [weekly, setWeekly] = useState<WeeklyGoalState | null>(null);
  const [reengagementDays, setReengagementDays] = useState<number | null>(null);
  const [reengagementDismissed, setReengagementDismissed] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscriptionStatus: string | null;
    hasSubscription: boolean;
  } | null>(null);

  // Fetch subscription status function (defined outside useEffect so it can be used in onClick)
  const fetchSubscription = useCallback(async () => {
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
  }, []);

  const syncAndFetchSubscription = useCallback(async () => {
    try {
      await fetch("/api/stripe/sync-subscription", { method: "POST" });
    } catch (error) {
      console.error("Failed to sync subscription:", error);
    } finally {
      await fetchSubscription();
    }
  }, [fetchSubscription]);

  useEffect(() => {
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const load = async () => {
      if (cancelled) return;
      await fetchSubscription();
    };

    const sessionId = searchParams?.get("session_id");

    if (sessionId) {
      syncAndFetchSubscription();
      const retries = [2000, 5000, 10000];
      retries.forEach(delay => {
        timeouts.push(setTimeout(() => { if (!cancelled) syncAndFetchSubscription(); }, delay));
      });
    } else {
      load();
    }

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [fetchSubscription, searchParams, syncAndFetchSubscription]);

  useEffect(() => {
    try {
      const existing = localStorage.getItem(DASHBOARD_FIRST_SEEN_KEY);
      if (!existing) {
        localStorage.setItem(DASHBOARD_FIRST_SEEN_KEY, new Date().toISOString());
        setDashboardTitle("Welcome to Peak Prep.");
      } else {
        const firstSeen = new Date(existing);
        const elapsedMs = Date.now() - firstSeen.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        setDashboardTitle(
          elapsedMs >= oneDayMs ? "Your Climb Dashboard." : "Welcome to Peak Prep."
        );
      }
    } catch (error) {
      console.error("Failed to load dashboard greeting state:", error);
    }
  }, []);

  // Load retention state (streak, weekly goal, re-engagement nudge).
  useEffect(() => {
    try {
      setStreak(getStreakState());
      setWeekly(getWeeklyGoalState());
      const days = getDaysSinceLastPractice();
      setReengagementDays(days);
      const dismissedYmd = localStorage.getItem(REENGAGEMENT_DISMISS_KEY);
      setReengagementDismissed(dismissedYmd === todayYmd());
    } catch (err) {
      console.warn("Failed to load retention state:", err);
    }
  }, []);

  useEffect(() => {
    try {
      const rawPlan = localStorage.getItem(STUDY_PLAN_STORAGE_KEY);
      if (!rawPlan) return;
      const parsedPlan = JSON.parse(rawPlan) as PersonalizedPlan;
      if (!parsedPlan?.calendarWeeks?.length) return;
      const completedIds = new Set<string>(
        JSON.parse(localStorage.getItem(STUDY_TASKS_STORAGE_KEY) || "[]") as string[]
      );
      const savedWeek = parseInt(localStorage.getItem(ACTIVE_WEEK_STORAGE_KEY) || "0", 10);
      const fallbackWeek = Number.isNaN(savedWeek) ? 0 : Math.max(0, savedWeek);
      const now = new Date();
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      let resolvedWeek = parsedPlan.calendarWeeks[fallbackWeek];
      let resolvedDay = resolvedWeek?.days.find((day) => {
        const d = new Date(day.dateISO);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() === todayDate;
      });

      if (!resolvedDay) {
        for (const week of parsedPlan.calendarWeeks) {
          const day = week.days.find((candidate) => {
            const d = new Date(candidate.dateISO);
            return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() === todayDate;
          });
          if (day) {
            resolvedWeek = week;
            resolvedDay = day;
            break;
          }
        }
      }

      if (!resolvedDay || !resolvedWeek) {
        setTodayTasks([]);
        setTodayWeekLabel(null);
        return;
      }

      setTodayWeekLabel(resolvedWeek.label);
      setTodayTasks(
        resolvedDay.tasks.map((task) => ({
          task,
          completed: completedIds.has(task.id),
        }))
      );
    } catch (error) {
      console.error("Failed to load today's study tasks:", error);
      setTodayTasks([]);
      setTodayWeekLabel(null);
    }
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
      const history = await getScoreHistory();
      const recentSessions = await getRecentSessions(7);
      
      // Calculate days with practice this week
      const today = new Date();
      const daysWithPractice = recentSessions.filter(s => {
        const sessionDate = new Date(s.date);
        const diffTime = today.getTime() - sessionDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }).length;

      // Get estimated SAT score
      const estimatedScore = history.averageScore > 0 ? history.averageScore : 0;
      const scoreText = estimatedScore > 0 ? estimatedScore.toString() : "—";
      const scoreTrend = estimatedScore > 0 
        ? `Top ${100 - getPercentile(estimatedScore)}% • ${getScoreInterpretation(estimatedScore)}`
        : "Complete practice tests to see your score";

      setStats([
        { 
          label: "Climbing Momentum", 
          value: daysWithPractice.toString(), 
          trend: daysWithPractice > 0 ? `${daysWithPractice} day${daysWithPractice > 1 ? 's' : ''} active this week` : "Take your first practice test to get started!"
        },
        { 
          label: "Estimated SAT Score", 
          value: scoreText, 
          trend: scoreTrend
        },
        { 
          label: "Total Checkpoints", 
          value: history.sessions.length.toString(), 
          trend: history.sessions.length === 0 ? "0 practice tests completed" : history.sessions.length === 1 ? "1 practice test completed" : `${history.sessions.length} practice tests completed`
        },
      ]);

      if (history.sessions.length === 0) {
        setEncouragementMessage("Welcome aboard. Start with a Practice Test to set your baseline.");
      } else if (daysWithPractice >= 3) {
        setEncouragementMessage("Great momentum. Keep the pace and you’ll feel the climb getting easier.");
      } else if (estimatedScore > 0) {
        setEncouragementMessage("Nice work logging checkpoints. Keep building consistency this week.");
      } else {
        setEncouragementMessage("You’re getting started. Each Practice Test moves you closer to your target.");
      }
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      }
    };
    
    loadStats();
  }, []);

  const formatTaskType = (type: StudyCalendarTask["type"]) => {
    if (type === "practice") return "Practice Test";
    if (type === "lesson") return "Lesson";
    return "Review";
  };

  const launchTask = (task: StudyCalendarTask) => {
    // Mark complete on click so the streak / weekly goal / planner all reflect
    // the action — matches the study-plan page's launch behavior.
    markStudyTaskComplete(task.id);
    setTodayTasks((prev) =>
      prev.map((entry) => (entry.task.id === task.id ? { ...entry, completed: true } : entry))
    );
    const params = task.launchTarget.params ? new URLSearchParams(task.launchTarget.params).toString() : "";
    router.push(params ? `${task.launchTarget.path}?${params}` : task.launchTarget.path);
  };

  return (
    <div className="px-3 sm:px-4 md:px-6 max-w-4xl mx-auto overflow-x-hidden w-full pb-20">
      <PageHeader
        eyebrow="Base Camp"
        title={dashboardTitle}
        subtitle="Your expedition headquarters. Plan your route, check your altitude, and prepare for the climb ahead."
      />

      <GlassPanel className="mb-6">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {encouragementMessage}
        </p>
      </GlassPanel>

      {/* Re-engagement nudge: shown when the user hasn't practiced in 2+ days. */}
      {reengagementDays !== null &&
        reengagementDays >= REENGAGEMENT_GAP_DAYS &&
        !reengagementDismissed && (
          <div className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-900/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                {streak && streak.longestStreak > 0
                  ? `You were on a ${streak.longestStreak}-day roll. Pick up where you left off.`
                  : "It's been a while — let's get back to climbing."}
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-200 mt-1 font-medium">
                A short practice set today is enough to keep momentum going.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/practice"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-sm font-bold transition-all"
              >
                Practice now →
              </Link>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem(REENGAGEMENT_DISMISS_KEY, todayYmd());
                  } catch {
                    // ignore
                  }
                  setReengagementDismissed(true);
                }}
                className="text-xs text-amber-800 dark:text-amber-200 hover:underline font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

      {subscriptionStatus && !subscriptionStatus.hasSubscription && (
        <div className="premium-banner mb-6 p-4 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 dark:from-slate-900/70 dark:to-slate-900/40 border border-sky-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Unlock Premium Features
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
                Get unlimited practice tests and advanced study plans
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
              className="px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold transition-all border-2 border-sky-600 shadow-[0_4px_0_rgba(14,165,233,0.3),0_6px_16px_rgba(14,165,233,0.15)] hover:shadow-[0_5px_0_rgba(14,165,233,0.4),0_8px_20px_rgba(14,165,233,0.2)] active:shadow-[0_2px_0_rgba(14,165,233,0.4)] hover:-translate-y-0.5 active:translate-y-1 whitespace-nowrap"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}
      
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 mb-10">
        {/* Streak tile (replaces "Climbing Momentum" so the daily-loop is front-and-center). */}
        <GlassPanel>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300 font-semibold">
            Practice Streak
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {streak?.currentStreak ?? 0}
            </p>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {streak?.currentStreak === 1 ? "day" : "days"}
            </span>
            <Flame size={18} className="text-orange-500 ml-auto" aria-hidden />
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
            {streak && streak.currentStreak > 0
              ? streak.longestStreak > streak.currentStreak
                ? `Longest: ${streak.longestStreak} days`
                : "Keep it going tomorrow."
              : "Take a practice test today to start your streak."}
          </p>
        </GlassPanel>

        {/* Weekly goal tile */}
        <GlassPanel delay={0.05}>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300 font-semibold">
            Weekly Goal
          </p>
          {weekly ? (
            <>
              <p className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {Math.min(weekly.sessionsThisWeek, weekly.targetSessionsPerWeek)}
                <span className="text-base font-normal text-slate-400 dark:text-slate-500">
                  /{weekly.targetSessionsPerWeek}
                </span>
              </p>
              <div className="mt-2 flex items-center gap-1" aria-hidden>
                {Array.from({ length: weekly.targetSessionsPerWeek }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-2.5 w-2.5 rounded-full ${
                      idx < weekly.sessionsThisWeek
                        ? "bg-sky-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                {weekly.sessionsThisWeek >= weekly.targetSessionsPerWeek
                  ? "Weekly goal hit. Nice work."
                  : `Practice ${weekly.targetSessionsPerWeek - weekly.sessionsThisWeek} more time${weekly.targetSessionsPerWeek - weekly.sessionsThisWeek === 1 ? "" : "s"} this week.`}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 font-medium">Loading…</p>
          )}
        </GlassPanel>

        {/* Estimated score tile (kept from existing logic, simplified). */}
        <GlassPanel delay={0.1}>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300 font-semibold">
            {stats[1]?.label || "Estimated SAT Score"}
          </p>
          <p className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {stats[1]?.value || "—"}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
            {stats[1]?.trend || "Complete practice tests to see your score"}
          </p>
        </GlassPanel>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="h-full min-h-[280px] flex flex-col">
          <div className="premium-card dashboard-tool-card feature-themed-card feature-theme-study-plan p-6 h-full min-h-[280px] flex flex-col items-start gap-3">
            <div className="flex items-start justify-between w-full">
              <div className="feature-icon-shell p-3 rounded-2xl shadow-sm">
                <FeatureIcon name="study-plan" size={28} />
              </div>
              <span className="feature-kicker text-[10px] uppercase tracking-[0.3em] font-bold">Today</span>
            </div>
            <div className="w-full min-w-0">
              <h3 className="feature-title text-xl font-bold">Today&apos;s Study Tasks</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-snug mt-1">
                {todayWeekLabel ? `${todayWeekLabel} • from your plan` : "From your active study plan when available."}
              </p>
            </div>
            <div className="w-full flex-1 min-h-0 flex flex-col">
              {todayTasks.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium flex-1">
                  No tasks for today yet. Open Study Plans to build your route.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-0.5 -mr-0.5">
                  {todayTasks.map(({ task, completed }) => (
                    <div
                      key={task.id}
                      className={`rounded-xl border p-2.5 ${
                        completed
                          ? "border-emerald-200 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-900/25"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold feature-kicker">
                            {formatTaskType(task.type)}
                          </p>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5 break-words leading-snug line-clamp-3">
                            {balanceStripLooseParens(task.rawText || task.skillFocus)}
                          </p>
                          {task.meta && (
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {task.meta.section && (
                                <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200">
                                  {task.meta.section === "math" ? "Math" : "R&W"}
                                </span>
                              )}
                              {task.meta.topic && (
                                <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 truncate max-w-[110px]">
                                  {task.meta.topic}
                                </span>
                              )}
                              {task.meta.difficulty && task.meta.difficulty !== "Mixed" && (
                                <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                                  {task.meta.difficulty}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {completed ? (
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">Done</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => launchTask(task)}
                            className="h-7 px-2.5 rounded-full text-[10px] font-semibold feature-action-btn text-white transition-colors shrink-0"
                          >
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-auto pt-3 w-full">
              <Link
                href="/study-plan"
                className="group feature-link inline-flex items-center gap-2 font-bold text-xs uppercase tracking-wider"
              >
                <span className="dashboard-launch-text">Open Study Plan</span>
                <span className="dashboard-launch-text group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>

        <Link href={practiceTool.href} className="group cursor-pointer no-underline block h-full min-h-[280px]">
          <div className={`premium-card dashboard-tool-card feature-themed-card ${getFeatureThemeClass(practiceTool.href)} p-6 h-full min-h-[280px] flex flex-col items-start gap-4`}>
            <div className="flex items-start justify-between w-full">
              <div className="feature-icon-shell p-3 rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                <FeatureIcon name={practiceTool.icon} size={28} />
              </div>
              <span className="feature-kicker text-[10px] uppercase tracking-[0.3em] font-bold transition-colors">
                Gear
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="feature-title text-xl font-bold transition-colors">
                {practiceTool.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {practiceTool.desc}
              </p>
            </div>
            <div className="mt-auto pt-4 flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
              <span className="dashboard-launch-text">Launch {practiceTool.title.split(" ")[0]}</span>
              <span className="dashboard-launch-text group-hover:translate-x-1 transition-all">→</span>
            </div>
          </div>
        </Link>

        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group cursor-pointer no-underline block h-full min-h-[280px]">
            <div className={`premium-card dashboard-tool-card feature-themed-card ${getFeatureThemeClass(tool.href)} p-6 h-full min-h-[280px] flex flex-col items-start gap-4`}>
              <div className="flex items-start justify-between w-full">
                <div className="feature-icon-shell p-3 rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <FeatureIcon name={tool.icon} size={28} />
                </div>
                <span className="feature-kicker text-[10px] uppercase tracking-[0.3em] font-bold transition-colors">
                  Gear
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="feature-title text-xl font-bold transition-colors">
                  {tool.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {tool.desc}
                </p>
              </div>
              <div className="mt-auto pt-4 flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                <span className="dashboard-launch-text">Launch {tool.title.split(" ")[0]}</span>
                <span className="dashboard-launch-text group-hover:translate-x-1 transition-all">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="px-3 sm:px-4 md:px-6 max-w-4xl mx-auto overflow-x-hidden w-full">
        <PageHeader
          eyebrow="Base Camp"
          title="Your Climb Dashboard."
          subtitle="Your expedition headquarters. Plan your route, check your altitude, and prepare for the climb ahead."
        />
        <div className="mt-10 text-center text-slate-600 dark:text-slate-400">
          Loading...
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
