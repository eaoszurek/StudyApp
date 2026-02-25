"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import GlassPanel from "@/components/ui/GlassPanel";
import PageHeader from "@/components/ui/PageHeader";
import Link from "next/link";
import { getScoreHistory, getRecentSessions } from "@/utils/scoreTracking";
import { getPercentile, getScoreInterpretation } from "@/utils/satScoring";

const tools = [
  {
    href: "/practice",
    title: "Practice Tests",
    desc: "Practice tests along your trail with instant feedback and explanations.",
    icon: "🚩",
  },
  {
    href: "/study-plan",
    title: "Study Plans",
    desc: "Personalized expedition plans with milestones and waypoints.",
    icon: "🗺️",
  },
  {
    href: "/flashcards",
    title: "Flashcards",
    desc: "Essential knowledge packs for your climb with spaced repetition.",
    icon: "🎒",
  },
  {
    href: "/lessons",
    title: "Micro-Lessons",
    desc: "Quick 1–2 minute knowledge checkpoints with examples and practice questions.",
    icon: "📚",
  },
  {
    href: "/progress",
    title: "Progress",
    desc: "Monitor your elevation gain, momentum, and progress toward the peak.",
    icon: "⛰️",
  },
];

function DashboardContent() {
  const searchParams = useSearchParams();
  const [stats, setStats] = useState([
    { label: "Climbing Momentum", value: "0", trend: "Take your first practice test to get started!" },
    { label: "Estimated SAT Score", value: "—", trend: "Complete practice tests to see your estimated score" },
    { label: "Total Checkpoints", value: "0", trend: "0 practice tests completed" },
  ]);
  const [encouragementMessage, setEncouragementMessage] = useState(
    "Welcome aboard. Start with a Practice Test to set your baseline."
  );
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

  useEffect(() => {
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const load = async () => {
      if (cancelled) return;
      await fetchSubscription();
    };

    const sessionId = searchParams?.get("session_id");

    if (sessionId) {
      load();
      const retries = [2000, 5000, 10000];
      retries.forEach(delay => {
        timeouts.push(setTimeout(() => { if (!cancelled) fetchSubscription(); }, delay));
      });
    } else {
      load();
    }

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [fetchSubscription, searchParams]);

  useEffect(() => {
    // Fetch score history from backend
    const loadStats = async () => {
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
    };
    
    loadStats();
  }, []);

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-10 max-w-full overflow-x-hidden w-full">
      <PageHeader
        eyebrow="Base Camp"
        title="Welcome to Peak Prep."
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
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white font-semibold transition-colors whitespace-nowrap"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}
      
      {/* Compact subscription status badges */}
      <div className="flex justify-end mb-4">
        {subscriptionStatus && subscriptionStatus.hasSubscription && (
          <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-emerald-600 text-white border border-emerald-600 dark:bg-emerald-700/70 dark:border-emerald-500">
            <span className="text-xs">✨</span>
            <span className="text-xs font-medium">
              Premium
            </span>
          </div>
        )}
        
        {subscriptionStatus && !subscriptionStatus.hasSubscription && (
          <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700">
            <span className="text-xs text-slate-700 dark:text-amber-200">
              {subscriptionStatus.subscriptionStatus || "Free"}
            </span>
          </div>
        )}
      </div>

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

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool, idx) => (
          <GlassPanel key={tool.href} delay={idx * 0.05} className="h-full">
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl">
                  {tool.icon}
                </div>
                <span className="text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300 font-semibold">
                  gear
                </span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-6">
                {tool.title}
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 flex-1 font-medium">{tool.desc}</p>
              <Link
                href={tool.href}
                className="mt-6 inline-flex items-center gap-2 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition font-semibold"
              >
                Launch {tool.title.split(" ")[0]}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="px-3 sm:px-4 md:px-6 lg:px-10 max-w-full overflow-x-hidden w-full">
        <PageHeader
          eyebrow="Base Camp"
          title="Welcome to Peak Prep."
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
