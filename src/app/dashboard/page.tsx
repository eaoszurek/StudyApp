"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import GlassPanel from "@/components/ui/GlassPanel";
import PageHeader from "@/components/ui/PageHeader";
import FeatureIcon from "@/components/ui/FeatureIcon";
import Link from "next/link";
import { getScoreHistory, getRecentSessions } from "@/utils/scoreTracking";
import { getPercentile, getScoreInterpretation } from "@/utils/satScoring";
import type { PersonalizedPlan, StudyCalendarTask } from "@/types";

const STUDY_PLAN_STORAGE_KEY = "sat_study_plan";
const STUDY_TASKS_STORAGE_KEY = `${STUDY_PLAN_STORAGE_KEY}_tasks`;
const ACTIVE_WEEK_STORAGE_KEY = `${STUDY_PLAN_STORAGE_KEY}_active_week`;
const DASHBOARD_FIRST_SEEN_KEY = "dashboard_first_seen_at";

const tools = [
  { href: "/practice", title: "Practice Tests", desc: "Practice tests along your trail with instant feedback and explanations.", icon: "practice" as const },
  { href: "/study-plan", title: "Study Plans", desc: "Personalized expedition plans with milestones and waypoints.", icon: "study-plan" as const },
  { href: "/flashcards", title: "Flashcards", desc: "Essential knowledge packs for your climb with spaced repetition.", icon: "flashcards" as const },
  { href: "/lessons", title: "Micro-Lessons", desc: "Quick 1–2 minute knowledge checkpoints with examples and practice questions.", icon: "lessons" as const },
  { href: "/progress", title: "Progress", desc: "Monitor your elevation gain, momentum, and progress toward the peak.", icon: "progress" as const },
];

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
    if (type === "flashcards") return "Flashcards";
    if (type === "practice") return "Practice Test";
    if (type === "lesson") return "Lesson";
    return "Review";
  };

  const launchTask = (task: StudyCalendarTask) => {
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

      {subscriptionStatus && !subscriptionStatus.hasSubscription && (
        <div className="premium-banner mb-6 p-4 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 dark:from-slate-900/70 dark:to-slate-900/40 border border-sky-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Unlock Premium Features
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
                Get unlimited practice tests, flashcards, and advanced study plans
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
        {stats.map((stat, idx) => (
          <GlassPanel key={stat.label} delay={idx * 0.05}>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300 font-semibold">
              {stat.label}
            </p>
            <p className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
            <p className="mt-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{stat.trend}</p>
          </GlassPanel>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 mb-10">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group cursor-pointer no-underline block h-full">
            <div className="premium-card p-6 h-full flex flex-col items-start gap-4">
              <div className="flex items-start justify-between w-full">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <FeatureIcon name={tool.icon} size={28} />
                </div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold group-hover:text-sky-500 transition-colors">
                  Gear
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {tool.desc}
                </p>
              </div>
              <div className="mt-auto pt-4 flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-wider">
                Launch {tool.title.split(' ')[0]}
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <GlassPanel className="mt-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Today's Study Tasks</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {todayWeekLabel ? `${todayWeekLabel} • from your study plan` : "Pulled from your active study plan"}
            </p>
          </div>
          <Link
            href="/study-plan"
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300"
          >
            Open Study Plan
          </Link>
        </div>
        {todayTasks.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
            No tasks found for today yet. Generate or update your study plan to see daily tasks here.
          </p>
        ) : (
          <div className="space-y-3">
            {todayTasks.map(({ task, completed }) => (
              <div
                key={task.id}
                className={`rounded-xl border p-3 ${
                  completed
                    ? "border-emerald-200 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-900/25"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-sky-700 dark:text-sky-300">
                      {formatTaskType(task.type)}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1 break-words">
                      {task.skillFocus}
                    </p>
                  </div>
                  {completed ? (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Completed</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => launchTask(task)}
                      className="h-8 px-3 rounded-full text-xs font-semibold bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white transition-colors shrink-0"
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
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
