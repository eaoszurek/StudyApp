"use client";

import React, { useEffect, useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import PageHeader from "@/components/ui/PageHeader";
import { motion } from "framer-motion";
import { getScoreHistory, getRecentSessions, getSectionPerformance, getSkillDomainPerformance, MIN_ESTIMATE_QUESTIONS } from "@/utils/scoreTracking";
import { getPercentile, getScoreInterpretation } from "@/utils/satScoring";
import { getTargetGoal, getGoalProgress, getDaysUntilTest, setTargetGoal } from "@/utils/goalTracking";
import InputField from "@/components/ui/InputField";
import PrimaryButton from "@/components/ui/PrimaryButton";

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default function Progress({
  params,
  searchParams,
}: {
  params: Promise<any>;
  searchParams: Promise<any>;
}) {
  // Unwrap params/searchParams to prevent React DevTools serialization errors
  React.use(params);
  React.use(searchParams);
  
  const [stats, setStats] = useState({
    currentCamp: "Base Camp",
    elevationGained: 0,
    currentAltitude: 0,
    climbingMomentum: 0,
    totalCheckpoints: 0,
    averageCheckpointScore: 0,
    estimatedSATScore: 0,
    recentElevation: [] as number[],
    trailPerformance: [
      { name: "Math Trail", altitude: 0, checkpoints: 0 },
      { name: "Reading Trail", altitude: 0, checkpoints: 0 },
      { name: "Writing Trail", altitude: 0, checkpoints: 0 },
    ],
    skillDomains: [] as Array<{ name: string; average: number; count: number }>,
  });
  const [goal, setGoal] = useState<{ targetScore: number; testDate?: string } | null>(null);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalInput, setGoalInput] = useState({ targetScore: "", testDate: "" });
  const [recentSessions, setRecentSessions] = useState<Awaited<ReturnType<typeof getRecentSessions>>>([]);
  const RECENT_ACTIVITY_LIMIT = 5;

  useEffect(() => {
    // Load goal
    const savedGoal = getTargetGoal();
    if (savedGoal) {
      setGoal(savedGoal);
    }

    const loadProgress = async () => {
      const history = await getScoreHistory();
      const recentSessionsData = await getRecentSessions(10);
      const allRecentSessions = await getRecentSessions(10);
      const sectionPerf = await getSectionPerformance();
      const skillPerf = await getSkillDomainPerformance();
      
      // Store recent sessions for display
      setRecentSessions(recentSessionsData.slice(0, RECENT_ACTIVITY_LIMIT));

      // Calculate estimated SAT score (average of recent scores)
      const estimatedScore = history.averageScore > 0 ? history.averageScore : 0;
      
      // Calculate current altitude (percentage of target, using 1400 as baseline)
      const currentAltitude = estimatedScore > 0 ? Math.round((estimatedScore / 1600) * 100) : 0;
      
      // Calculate elevation gained (improvement over time)
      const scoredSessions = allRecentSessions
        .filter(session => session.total >= MIN_ESTIMATE_QUESTIONS)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const scoreTrend = scoredSessions.map(session => {
        if (session.score && typeof session.score === "object" && "scaled" in session.score) {
          return session.score.scaled * 2;
        }
        return 0;
      }).filter(score => score > 0);

      const elevationGained = scoreTrend.length >= 2
        ? scoreTrend[scoreTrend.length - 1] - scoreTrend[0]
        : 0;
      
      // Calculate climbing momentum (days with practice)
      const today = new Date();
      const recentDates = recentSessionsData.map(s => new Date(s.date));
      const daysWithPractice = recentDates.filter(d => {
        const diffTime = today.getTime() - d.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }).length;

      // Get recent elevation scores (last 6 sessions, estimated total scores)
      const recentElevation = scoreTrend.slice(-6);

      // Convert skill domain performance to array and sort by average (lowest first - weakest areas)
      const skillDomainsArray = Object.entries(skillPerf)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => a.average - b.average)
        .slice(0, 10); // Show top 10 weakest areas

      setStats({
        currentCamp: estimatedScore >= 1400 ? "Camp 4" : estimatedScore >= 1200 ? "Camp 3" : estimatedScore >= 1000 ? "Camp 2" : "Camp 1",
        elevationGained: Math.max(0, elevationGained),
        currentAltitude,
        climbingMomentum: daysWithPractice,
        totalCheckpoints: history.sessions.length,
        averageCheckpointScore: history.averageScore,
        estimatedSATScore: estimatedScore,
        recentElevation,
        trailPerformance: [
          { 
            name: "Math Trail", 
            altitude: sectionPerf.math.adjusted > 0 ? Math.round((sectionPerf.math.adjusted / 800) * 100) : 0, 
            checkpoints: sectionPerf.math.count 
          },
          { 
            name: "Reading Trail", 
            altitude: sectionPerf.reading.adjusted > 0 ? Math.round((sectionPerf.reading.adjusted / 800) * 100) : 0, 
            checkpoints: sectionPerf.reading.count 
          },
          { 
            name: "Writing Trail", 
            altitude: sectionPerf.writing.adjusted > 0 ? Math.round((sectionPerf.writing.adjusted / 800) * 100) : 0, 
            checkpoints: sectionPerf.writing.count 
          },
        ],
        skillDomains: skillDomainsArray,
      });
    };
    
    loadProgress();
  }, []);

  const handleSetGoal = () => {
    const targetScore = parseInt(goalInput.targetScore);
    if (targetScore >= 400 && targetScore <= 1600) {
      setTargetGoal(targetScore, goalInput.testDate || undefined);
      setGoal({ targetScore, testDate: goalInput.testDate || undefined });
      setShowGoalInput(false);
      setGoalInput({ targetScore: "", testDate: "" });
    }
  };

  const goalProgress = goal && stats.estimatedSATScore > 0
    ? getGoalProgress(stats.estimatedSATScore, goal.targetScore)
    : null;

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-10 pb-6 sm:pb-8 md:pb-10 max-w-full overflow-x-hidden w-full">
      <PageHeader
        eyebrow="Progress"
        title="Monitor your climb to the peak."
        subtitle="Track your elevation gain, current camp, and progress across all trails."
      />

      {/* Goal Tracking */}
      {goal ? (
        <GlassPanel className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold mb-2 text-slate-900 dark:text-white">Target Score: {goal.targetScore}</h2>
              {goalProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Progress</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {goalProgress.percentage}% • {stats.estimatedSATScore} / {goal.targetScore}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-white/5 rounded-full h-3">
                    <motion.div
                      className="brand-gradient h-3 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${goalProgress.percentage}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  {goalProgress.isAchieved ? (
                    <p className="text-sm text-green-600 dark:text-green-400 font-semibold">🎉 Goal achieved!</p>
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                      {goalProgress.pointsRemaining} points to go
                    </p>
                  )}
                  {goal.testDate && (() => {
                    const daysLeft = getDaysUntilTest(goal.testDate);
                    return daysLeft !== null ? (
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                        {daysLeft === 0 ? "Test is today!" : daysLeft === 1 ? "1 day until test" : `${daysLeft} days until test`}
                      </p>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
            <PrimaryButton variant="secondary" onClick={() => setShowGoalInput(true)}>
              Update Goal
            </PrimaryButton>
          </div>
        </GlassPanel>
      ) : (
        <GlassPanel className="mb-8">
          <div className="text-center py-4">
            <p className="text-slate-600 dark:text-slate-400 mb-4 font-medium">Set a target score to track your progress</p>
            <PrimaryButton onClick={() => setShowGoalInput(true)}>
              Set Target Score
            </PrimaryButton>
          </div>
        </GlassPanel>
      )}

      {showGoalInput && (
        <GlassPanel className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Set Target Score</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Target SAT Score (400-1600)
              </label>
              <InputField
                type="number"
                min="400"
                max="1600"
                value={goalInput.targetScore}
                onChange={(e) => setGoalInput({ ...goalInput, targetScore: e.target.value })}
                placeholder="e.g., 1400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Test Date (optional)
              </label>
              <InputField
                type="date"
                value={goalInput.testDate}
                onChange={(e) => setGoalInput({ ...goalInput, testDate: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <PrimaryButton onClick={handleSetGoal} disabled={!goalInput.targetScore}>
                Set Goal
              </PrimaryButton>
              <PrimaryButton variant="secondary" onClick={() => {
                setShowGoalInput(false);
                setGoalInput({ targetScore: "", testDate: "" });
              }}>
                Cancel
              </PrimaryButton>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <GlassPanel delay={0.05}>
          <div className="text-2xl sm:text-3xl mb-2">⛺</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.currentCamp}</div>
          <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium">Current Camp</div>
        </GlassPanel>

        <GlassPanel delay={0.1}>
          <div className="text-2xl sm:text-3xl mb-2">⛰️</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.currentAltitude}%</div>
          <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium">Current Altitude</div>
          {stats.estimatedSATScore > 0 && (
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Est. SAT: {stats.estimatedSATScore}
            </div>
          )}
        </GlassPanel>

        <GlassPanel delay={0.15}>
          <div className="text-2xl sm:text-3xl mb-2">📈</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {stats.elevationGained > 0 ? `+${stats.elevationGained}` : stats.elevationGained}
          </div>
          <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium">Score Improvement</div>
        </GlassPanel>

        <GlassPanel delay={0.2}>
          <div className="text-2xl sm:text-3xl mb-2">🔥</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.climbingMomentum}</div>
          <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium">Days This Week</div>
        </GlassPanel>
      </div>

      {/* Altitude Trend */}
      <GlassPanel className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-6 text-slate-900 dark:text-white">Altitude Trend</h2>
        {stats.recentElevation.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400 text-center py-10 font-medium">
            Complete at least {MIN_ESTIMATE_QUESTIONS} questions to see an altitude trend.
          </p>
        ) : (
          <div className="h-48 sm:h-64 flex items-end justify-between gap-1 sm:gap-2 overflow-x-auto pb-2">
            {stats.recentElevation.map((score, idx) => {
              const maxScore = Math.max(...stats.recentElevation, 1600);
              const height = (score / maxScore) * 100;
              return (
                <motion.div
                  key={idx}
                  className="flex-1 min-w-[40px] sm:min-w-0 flex flex-col items-center"
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div className="w-full bg-slate-200 dark:bg-white/5 rounded-t-xl relative" style={{ height: "100%" }}>
                    <motion.div
                      className="absolute bottom-0 w-full brand-gradient rounded-t-xl"
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: idx * 0.1 + 0.2, duration: 0.5 }}
                    />
                  </div>
                  <div className="mt-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{score}</div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">Test {idx + 1}</div>
                </motion.div>
              );
            })}
          </div>
        )}
      </GlassPanel>

      {/* Skill Domain Breakdown */}
      {stats.skillDomains.length > 0 && (
        <GlassPanel className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 text-slate-900 dark:text-white">Skill Domain Performance</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 font-medium">
            Areas that need the most practice (sorted by performance)
          </p>
          <div className="space-y-3">
            {stats.skillDomains.map((skill, idx) => {
              const percentage = Math.round((skill.average / 800) * 100);
              return (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                    <span className="font-semibold text-slate-900 dark:text-white break-words">{skill.name}</span>
                    <span className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium whitespace-nowrap">
                      {skill.average} / 800 ({percentage}%) • {skill.count} test{skill.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-white/5 rounded-full h-2">
                    <motion.div
                      className="brand-gradient h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: idx * 0.05 + 0.2, duration: 0.5 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </GlassPanel>
      )}

      {/* Trail Performance */}
      <GlassPanel className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-6 text-slate-900 dark:text-white">Performance by Trail</h2>
        {stats.totalCheckpoints === 0 ? (
          <p className="text-slate-600 dark:text-slate-400 text-center py-8 font-medium">
            Complete practice tests to see your performance breakdown
          </p>
        ) : (
          <div className="space-y-4">
            {stats.trailPerformance.map((trail, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <span className="font-bold text-slate-900 dark:text-white">{trail.name}</span>
                <span className="text-slate-700 dark:text-slate-300 text-sm sm:text-base font-medium">
                  {trail.altitude}% altitude ({trail.checkpoints} checkpoints)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-white/5 rounded-full h-3">
                <motion.div
                  className="brand-gradient h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${trail.altitude}%` }}
                  transition={{ delay: idx * 0.1 + 0.3, duration: 0.5 }}
                />
              </div>
            </motion.div>
            ))}
          </div>
        )}
      </GlassPanel>

      {/* Recent Activity */}
      <GlassPanel>
        <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Recent Expedition Activity</h2>
        {stats.totalCheckpoints === 0 ? (
          <p className="text-slate-600 dark:text-slate-400 text-center py-8 font-medium">
            Start practicing to see your activity history
          </p>
        ) : (
          <div className="space-y-3">
            {recentSessions.slice(0, RECENT_ACTIVITY_LIMIT).map((session, idx) => {
              const sectionEmoji = session.section === "math" ? "⛰️" : session.section === "reading" ? "🗻" : "🏔️";
              const sectionName = session.section === "math" ? "Math" : session.section === "reading" ? "Reading" : "Writing";
              const score = session.score && typeof session.score === 'object' && 'scaled' in session.score 
                ? session.score.scaled 
                : 0;
              const date = new Date(session.date);
              const timeAgo = getTimeAgo(date);
              
              return (
                <div key={session.id} className="ai-output-card flex items-center p-4 bg-slate-100/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <div className="text-2xl mr-4">{sectionEmoji}</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 dark:text-white">
                      Completed {sectionName} Checkpoint
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                      Score: {score} / 800 • {session.correct}/{session.total} correct • {timeAgo}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
