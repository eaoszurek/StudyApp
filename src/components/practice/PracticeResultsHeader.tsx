"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, ArrowDown, Flame } from "lucide-react";
import { getScoreHistory, type PracticeSession, MIN_ESTIMATE_QUESTIONS } from "@/utils/scoreTracking";
import { getPriorSectionSession } from "@/utils/performanceTrend";
import { getMathTopicDomain, SAT_TOPICS } from "@/data/topics";
import { formatScaledScoreRange } from "@/utils/satScoring";
import { getStreakState } from "@/utils/streakTracking";
import { getWeeklyGoalState } from "@/utils/weeklyGoal";

type SectionType = "math" | "reading-writing";

export interface SkillStat {
  skill: string;
  correct: number;
  total: number;
  pct: number;
}

interface PracticeResultsHeaderProps {
  testType: SectionType;
  correct: number;
  total: number;
  scaledScore: number | null;
  skillStats: SkillStat[];
  topic?: string;
}

interface PriorComparison {
  prior: PracticeSession;
  delta: number;
}

const sectionLabel = (section: SectionType) =>
  section === "math" ? "Math" : "Reading & Writing";

const headlineFor = (percentCorrect: number): { title: string; subtitle: string } => {
  if (percentCorrect >= 90) {
    return {
      title: "Crushed it.",
      subtitle: "Try a harder set when you're ready.",
    };
  }
  if (percentCorrect >= 80) {
    return {
      title: "Strong work.",
      subtitle: "Keep this momentum going.",
    };
  }
  if (percentCorrect >= 60) {
    return {
      title: "You're getting there.",
      subtitle: "Review the questions you missed, then drill your weakest skill.",
    };
  }
  return {
    title: "Good effort — let's build from here.",
    subtitle: "Review your missed questions below, then try a focused drill.",
  };
};

const getWeakSkill = (skillStats: SkillStat[]): SkillStat | null => {
  const eligible = skillStats.filter((s) => s.total >= 2);
  if (eligible.length === 0) {
    return [...skillStats].sort((a, b) => a.pct - b.pct)[0] || null;
  }
  return eligible.sort((a, b) => a.pct - b.pct)[0];
};

const inferSectionForTopic = (topic: string): SectionType =>
  getMathTopicDomain(topic) !== "Unknown" ? "math" : "reading-writing";

const buildPracticeUrl = (
  section: SectionType,
  topic: string,
  difficulty: "Mixed" | "Hard" | "Medium",
  questions?: number
) => {
  const base = `/practice?autostart=1&section=${encodeURIComponent(section)}&topic=${encodeURIComponent(topic)}&difficulty=${difficulty}`;
  return questions ? `${base}&questions=${questions}` : base;
};

const buildLessonUrl = (topic: string) =>
  `/lessons?topic=${encodeURIComponent(topic)}&autostart=1`;

const ALL_LESSON_TOPICS = new Set([
  ...SAT_TOPICS.Math,
  ...SAT_TOPICS.Reading,
  ...SAT_TOPICS.Writing,
]);

const hasLessonForSkill = (skill: string) => ALL_LESSON_TOPICS.has(skill);

type SkillWeaknessEntry = { attempts: number; misses: number };
type SkillWeaknessesMap = Record<string, SkillWeaknessEntry>;

interface RankedWeakSpot {
  skill: string;
  attempts: number;
  misses: number;
  missRatePct: number;
  section: SectionType;
}

export default function PracticeResultsHeader(props: PracticeResultsHeaderProps) {
  const { testType, correct, total, scaledScore, skillStats, topic } = props;
  const [prior, setPrior] = useState<PriorComparison | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [weeklyProgress, setWeeklyProgress] = useState<string | null>(null);
  const [weakSpots, setWeakSpots] = useState<RankedWeakSpot[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/skill-weaknesses");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { skillWeaknesses?: SkillWeaknessesMap };
        const raw = data.skillWeaknesses;
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;

        const ranked: RankedWeakSpot[] = Object.entries(raw)
          .map(([skill, entry]) => {
            const attempts = Number(entry?.attempts) || 0;
            const misses = Number(entry?.misses) || 0;
            return {
              skill,
              attempts,
              misses,
              missRatePct: attempts > 0 ? Math.round((misses / attempts) * 100) : 0,
              section: inferSectionForTopic(skill),
            };
          })
          .filter((row) => row.attempts > 0 && row.misses > 0)
          .sort((a, b) => b.missRatePct - a.missRatePct || b.misses - a.misses)
          .slice(0, 3);

        if (!cancelled) setWeakSpots(ranked);
      } catch (err) {
        console.warn("Failed to load skill weaknesses:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const history = await getScoreHistory();
        if (cancelled) return;
        const priorSession = getPriorSectionSession(history.sessions, testType);
        const priorScaled =
          priorSession?.score &&
          typeof priorSession.score === "object" &&
          "scaled" in priorSession.score
            ? Number(priorSession.score.scaled)
            : null;
        if (priorSession && priorScaled !== null && scaledScore !== null) {
          setPrior({ prior: priorSession, delta: scaledScore - priorScaled });
        }
      } catch (err) {
        console.warn("Failed to load score history for results header:", err);
      }
    })();

    try {
      const streak = getStreakState();
      setStreakDays(streak.currentStreak);
      const weekly = getWeeklyGoalState();
      if (weekly.targetSessionsPerWeek > 0) {
        setWeeklyProgress(
          `${Math.min(weekly.sessionsThisWeek, weekly.targetSessionsPerWeek)}/${weekly.targetSessionsPerWeek} sessions this week`
        );
      }
    } catch {
      // ignore
    }

    return () => {
      cancelled = true;
    };
  }, [testType, scaledScore]);

  const percentCorrect = total > 0 ? Math.round((correct / total) * 100) : 0;
  const headline = headlineFor(percentCorrect);
  const weakSkill = getWeakSkill(skillStats);
  const focusTopic = weakSkill?.skill || topic || "";
  const focusSection: SectionType = focusTopic
    ? inferSectionForTopic(focusTopic)
    : testType;
  const showFocusCard = Boolean(focusTopic);
  const showScaledScore = total >= 10 && scaledScore !== null;
  const showScoreTrend = total >= MIN_ESTIMATE_QUESTIONS;
  const scaledRange =
    scaledScore !== null ? formatScaledScoreRange(scaledScore) : null;

  return (
    <div className="space-y-4">
      {/* Score + headline — one card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-sky-50 to-white dark:from-sky-950/40 dark:to-slate-900/60 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.25em] text-sky-700 dark:text-sky-300 font-semibold">
              {sectionLabel(testType)} practice
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-2">
              {headline.title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 font-medium max-w-xl">
              {headline.subtitle}
            </p>
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <p className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-none">
              {correct}
              <span className="text-2xl font-normal text-slate-400 dark:text-slate-500">
                /{total}
              </span>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
              {percentCorrect}% correct
            </p>
            {showScaledScore && scaledRange && (
              <>
                <p className="text-sm font-semibold text-sky-700 dark:text-sky-300 mt-2">
                  {showScoreTrend
                    ? `Score Trend — ${sectionLabel(testType)}: ${scaledRange}`
                    : `Est. ${sectionLabel(testType)} score: ${scaledRange}`}
                </p>
                {!showScoreTrend && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                    Estimated — take 15+ questions for a more accurate score
                  </p>
                )}
              </>
            )}
            {prior && showScoreTrend && scaledScore !== null && (
              <p
                className={`inline-flex items-center gap-1 text-xs font-bold mt-1 ${
                  prior.delta > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : prior.delta < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {prior.delta > 0 ? (
                  <ArrowUp size={12} aria-hidden />
                ) : prior.delta < 0 ? (
                  <ArrowDown size={12} aria-hidden />
                ) : null}
                {prior.delta > 0 ? "+" : ""}
                {prior.delta} vs last time
              </p>
            )}
          </div>
        </div>

        {(streakDays > 0 || weeklyProgress) && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center gap-x-3 gap-y-1">
            {streakDays > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Flame size={13} className="text-orange-500" aria-hidden />
                {streakDays}-day streak
              </span>
            )}
            {streakDays > 0 && weeklyProgress && (
              <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                ·
              </span>
            )}
            {weeklyProgress && <span>{weeklyProgress}</span>}
          </p>
        )}
      </div>

      {skillStats.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-5">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 font-semibold">
            Skill breakdown — this run
          </p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {skillStats.map((stat) => (
              <div key={stat.skill} className="flex flex-col items-center text-center gap-2">
                <div
                  className="relative h-14 w-14 rounded-full flex items-center justify-center"
                  style={{
                    background: `conic-gradient(#0ea5e9 ${stat.pct}%, #e2e8f0 ${stat.pct}% 100%)`,
                  }}
                  aria-hidden
                >
                  <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-bold text-slate-800 dark:text-slate-100">
                    {stat.pct}%
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight line-clamp-2">
                  {stat.skill}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {weakSpots.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-5">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 font-semibold">
            Your Weak Spots
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 font-medium">
            Based on your practice history across sessions.
          </p>
          <ul className="mt-4 space-y-4">
            {weakSpots.map((spot) => (
              <li
                key={spot.skill}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{spot.skill}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {spot.missRatePct}% miss rate ({spot.misses}/{spot.attempts} missed)
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <Link
                    href={buildPracticeUrl(spot.section, spot.skill, "Medium")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 text-sm font-bold transition-colors"
                  >
                    Practice {spot.skill}
                    <ArrowRight size={15} aria-hidden />
                  </Link>
                  {hasLessonForSkill(spot.skill) && (
                    <Link
                      href={buildLessonUrl(spot.skill)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Review the lesson first
                      <ArrowRight size={15} aria-hidden />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* One clear next step */}
      {showFocusCard && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-5">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 font-semibold">
            What to do next
          </p>
          {weakSkill ? (
            <p className="text-base text-slate-700 dark:text-slate-200 mt-2 font-medium">
              Your toughest skill this run was{" "}
              <span className="font-bold text-slate-900 dark:text-white">{weakSkill.skill}</span>{" "}
              ({weakSkill.correct}/{weakSkill.total} correct).
            </p>
          ) : (
            <p className="text-base text-slate-700 dark:text-slate-200 mt-2 font-medium">
              Run another focused set on{" "}
              <span className="font-bold text-slate-900 dark:text-white">{focusTopic}</span>.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Link
              href={buildPracticeUrl(focusSection, focusTopic, "Mixed", 10)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-4 py-3 text-sm font-bold transition-colors"
            >
              Practice {focusTopic}
              <ArrowRight size={15} aria-hidden />
            </Link>
            {weakSkill && (
              <Link
                href={buildLessonUrl(focusTopic)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Quick lesson first
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
