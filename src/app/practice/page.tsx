"use client";

import React, { useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { motion } from "framer-motion";
import { calculateSectionScore, getPercentile, getScoreInterpretation } from "@/utils/satScoring";
import { MIN_ESTIMATE_QUESTIONS, savePracticeSession } from "@/utils/scoreTracking";
import Timer from "@/components/ui/Timer";
import WritingQuestion from "@/components/ui/WritingQuestion";
import SubtleProgressCircle from "@/components/ui/SubtleProgressCircle";
import { getTopicsForSection } from "@/data/topics";

type SectionType = "math" | "reading" | "writing";
type OptionLetter = "A" | "B" | "C" | "D";

interface PracticeQuestion {
  id: number;
  question: string;
  options: Record<OptionLetter, string>;
  correctAnswer: OptionLetter;
  explanation?: string; // Legacy support
  explanation_correct?: string;
  explanation_incorrect?: Record<string, string>;
  strategy_tip?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  skillFocus: string;
}

interface PracticeSet {
  section: SectionType;
  passage?: string;
  questions: PracticeQuestion[];
}

interface TestConfig {
  questionCount: number;
  topic?: string;
  difficulty?: "Easy" | "Medium" | "Hard" | "Mixed";
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
    return <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">{renderBoldText(text)}</p>;
  }
  return (
    <ul className="space-y-2">
      {bullets.map((line, idx) => (
        <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
          <span className="text-sky-500 dark:text-sky-400 font-bold text-base leading-none mt-0.5 shrink-0">•</span>
          <span>{renderBoldText(line)}</span>
        </li>
      ))}
    </ul>
  );
};

export default function PracticeTests() {
  // Check subscription status and free usage
  React.useEffect(() => {
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
  
  const [testType, setTestType] = useState<SectionType | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<TestConfig>({
    questionCount: 5,
    topic: "",
    difficulty: "Mixed",
  });
  const [practiceSet, setPracticeSet] = useState<PracticeSet & { id?: string } | null>(null);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const currentTestIdRef = React.useRef<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<OptionLetter | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [satScore, setSatScore] = useState<{ scaled: number; raw: number; maxRaw: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, OptionLetter>>({});
  const [timeUp, setTimeUp] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscriptionStatus: string | null;
    hasSubscription: boolean;
  } | null>(null);
  const [freeUsageCount, setFreeUsageCount] = useState(0);
  const [targetQuestionCount, setTargetQuestionCount] = useState(5);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [batchLoadError, setBatchLoadError] = useState<string | null>(null);
  const batchLoadingRef = React.useRef(false);
  const sectionTopics = testType ? getTopicsForSection(testType) : [];
  const isProgressiveMode =
    (testType === "writing" || testType === "reading") && targetQuestionCount > 5;
  const practiceProgressPercent = practiceSet
    ? ((currentQuestion + 1) /
        (isProgressiveMode ? targetQuestionCount : practiceSet.questions.length)) *
      100
    : 0;

  // Get timer duration based on section type and question count
  const getTimerDuration = (section: SectionType | null, questionCount: number): number => {
    if (!section) return 0;

    const perQuestionMinutes = {
      math: 1.35, // ~80 min / 58 questions
      reading: 1.25, // ~65 min / 52 questions
      writing: 0.8, // ~35 min / 44 questions
    };

    const minimumMinutes = {
      math: 8,
      reading: 7,
      writing: 5,
    };

    const minutes = Math.ceil(questionCount * perQuestionMinutes[section]);
    return Math.max(minutes, minimumMinutes[section]);
  };

  const handleTimeUp = () => {
    setTimeUp(true);
    // Auto-submit when time runs out
    if (practiceSet && !showResults) {
      calculateScore(practiceSet.questions);
      setShowResults(true);
    }
  };

  const handleSectionSelect = (type: SectionType) => {
    setTestType(type);
    setShowConfig(true);
    setConfig({
      questionCount: 5,
      topic: "",
      difficulty: "Mixed",
    });
  };

  const generateTest = async () => {
    if (!testType) return;

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
    setBatchLoadError(null);
    setPracticeSet(null);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResults(false);
    setScore(0);
    setUserAnswers({});
    setShowConfig(false);
    setTargetQuestionCount(config.questionCount);

    const requestPracticeBatch = async (count: number) => {
      const res = await fetch("/api/generate-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: testType,
          questionCount: count,
          topic: config.topic || undefined,
          difficulty: config.difficulty === "Mixed" ? undefined : config.difficulty,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate test.");
      }

      return (await res.json()) as PracticeSet & { id?: string };
    };

    try {
      const initialCount =
        testType === "writing" || testType === "reading"
          ? Math.min(5, config.questionCount)
          : config.questionCount;
      const data = await requestPracticeBatch(initialCount);
      setCurrentTestId(data.id || null);
      currentTestIdRef.current = data.id || null;
      setPracticeSet(data);

      // Increment free tier usage ONLY for free users (premium users have unlimited)
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
      } else {
        // Premium user - clear any usage count
        localStorage.setItem("free_tier_usage", "0");
        setFreeUsageCount(0);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate test.");
      setShowConfig(true); // Return to config on error
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!isProgressiveMode || !practiceSet || !currentTestIdRef.current || !testType) return;
    const loaded = practiceSet.questions.length;
    const remaining = targetQuestionCount - loaded;
    const questionsLeftInLoadedBatch = loaded - (currentQuestion + 1);

    // Keep one batch ahead while the user works through the current 5.
    if (remaining > 0 && questionsLeftInLoadedBatch <= 4 && !batchLoadingRef.current) {
      batchLoadingRef.current = true;
      setIsBatchLoading(true);
      setBatchLoadError(null);

      const load = async () => {
        try {
          const batchSize = Math.min(5, remaining);
          const res = await fetch("/api/generate-practice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              section: testType,
              questionCount: batchSize,
              topic: config.topic || undefined,
              difficulty: config.difficulty === "Mixed" ? undefined : config.difficulty,
              existingTestId: currentTestIdRef.current,
            }),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to load next question batch.");
          }

          const nextBatch = (await res.json()) as PracticeSet & { id?: string };
          setPracticeSet((prev) => {
            if (!prev) return prev;
            const baseIndex = prev.questions.length;
            const normalized = nextBatch.questions.map((q, idx) => ({
              ...q,
              id: baseIndex + idx + 1,
            }));
            return {
              ...prev,
              passage: prev.passage || nextBatch.passage,
              questions: [...prev.questions, ...normalized],
            };
          });
        } catch (err: any) {
          setBatchLoadError(err.message || "Failed to load next question batch.");
        } finally {
          batchLoadingRef.current = false;
          setIsBatchLoading(false);
        }
      };

      void load();
    }
  }, [
    isProgressiveMode,
    practiceSet,
    currentQuestion,
    targetQuestionCount,
    config.topic,
    config.difficulty,
    testType,
  ]);

  const handleAnswerSelect = (answer: OptionLetter) => {
    setSelectedAnswer(answer);
    setUserAnswers({ ...userAnswers, [currentQuestion]: answer });
  };

  const handleNext = async () => {
    if (!practiceSet) return;
    if (currentQuestion < practiceSet.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(userAnswers[currentQuestion + 1] || null);
    } else {
      // In progressive mode, wait for remaining batches before finishing.
      if (isProgressiveMode && practiceSet.questions.length < targetQuestionCount) {
        setBatchLoadError(null);
        if (!batchLoadingRef.current) {
          batchLoadingRef.current = true;
          setIsBatchLoading(true);
          try {
            const remaining = targetQuestionCount - practiceSet.questions.length;
            const batchSize = Math.min(5, remaining);
            const res = await fetch("/api/generate-practice", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                section: testType,
                questionCount: batchSize,
                topic: config.topic || undefined,
                difficulty: config.difficulty === "Mixed" ? undefined : config.difficulty,
                existingTestId: currentTestIdRef.current || undefined,
              }),
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || "Failed to load next question batch.");
            }
            const nextBatch = (await res.json()) as PracticeSet & { id?: string };
            const baseIndex = practiceSet.questions.length;
            const normalized = nextBatch.questions.map((q, idx) => ({
              ...q,
              id: baseIndex + idx + 1,
            }));
            const updatedQuestions = [...practiceSet.questions, ...normalized];
            setPracticeSet({ ...practiceSet, questions: updatedQuestions });
            setCurrentQuestion(currentQuestion + 1);
            setSelectedAnswer(userAnswers[currentQuestion + 1] || null);
            return;
          } catch (err: any) {
            setBatchLoadError(err.message || "Still loading next questions. Please try again.");
            return;
          } finally {
            batchLoadingRef.current = false;
            setIsBatchLoading(false);
          }
        }
        return;
      }
      await calculateScore(practiceSet.questions);
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(userAnswers[currentQuestion - 1] || null);
    }
  };

  const calculateScore = async (questions: PracticeQuestion[]) => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correct++;
      }
    });
    setScore(correct);
    
    // Calculate SAT score
    if (testType) {
      const sectionScore = calculateSectionScore(testType, correct, questions.length);
      setSatScore(sectionScore);
      
      // Save score to backend if we have a test ID
      if (currentTestId) {
        try {
          await fetch(`/api/practice-tests/${currentTestId}/score`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scaledScore: sectionScore.scaled,
              rawScore: correct,
              maxRawScore: questions.length,
            }),
          });
        } catch (error) {
          console.error("Failed to save score to backend:", error);
          // Fallback to localStorage for anonymous users or on error
          const skillDomains = Array.from(new Set(questions.map(q => q.skillFocus)));
          savePracticeSession({
            id: Date.now().toString(),
            date: new Date().toISOString(),
            section: testType,
            score: sectionScore,
            correct,
            total: questions.length,
            difficulty: config.difficulty,
            skillDomains: skillDomains,
            topic: config.topic || undefined,
          });
        }
      }
    }
  };

  const resetTest = () => {
    setTestType(null);
    setShowConfig(false);
    setPracticeSet(null);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResults(false);
    setCurrentTestId(null);
    currentTestIdRef.current = null;
    setScore(0);
    setSatScore(null);
    setUserAnswers({});
    setTimeUp(false);
    setConfig({
      questionCount: 5,
      topic: "",
      difficulty: "Mixed",
    });
  };

  const sectionCards = [
    {
      type: "math" as SectionType,
      title: "Math Trail",
      desc: "Algebra, functions, data analysis, geometry checkpoints.",
      icon: "⛰️",
    },
    {
      type: "reading" as SectionType,
      title: "Reading Trail",
      desc: "Evidence, main ideas, rhetoric, synthesis checkpoints.",
      icon: "🗻",
    },
    {
      type: "writing" as SectionType,
      title: "Writing Trail",
      desc: "Grammar, clarity, transitions, structure checkpoints.",
      icon: "🏔️",
    },
  ];

  return (
    <div className="px-3 sm:px-4 md:px-6 pb-6 sm:pb-8 md:pb-10 max-w-4xl mx-auto overflow-x-hidden w-full">
      {!showConfig && !loading && !practiceSet && (
        <PageHeader
          eyebrow="Practice Tests"
          title="Test your progress along the trail."
          subtitle="Select a trail section, configure your checkpoint, and get instant feedback on your climb."
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

      {!testType && (
        <div className="grid gap-4 md:grid-cols-3">
          {sectionCards.map((card, idx) => (
            <button
              key={card.type}
              onClick={() => handleSectionSelect(card.type)}
              className="text-left"
            >
              <GlassPanel delay={idx * 0.05}>
                <div className="flex flex-col gap-2">
                  <div className="w-10 h-10 text-2xl leading-none flex items-center justify-center">
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{card.title}</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{card.desc}</p>
                  <span className="text-xs uppercase tracking-[0.4em] text-slate-600 dark:text-slate-400 mt-1 font-semibold">
                    Configure test →
                  </span>
                </div>
              </GlassPanel>
            </button>
          ))}
        </div>
      )}

      {showConfig && testType && (
        <GlassPanel className="mt-6">
          <div className="space-y-6">
            <div>
              <button
                onClick={() => {
                  setTestType(null);
                  setShowConfig(false);
                }}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition mb-4 flex items-center gap-2 font-medium"
              >
                ← Back to trails
              </button>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                Configure your {testType === "math" ? "Math" : testType === "reading" ? "Reading" : "Writing"} Trail Checkpoint
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                Set your trail markers and difficulty level for this checkpoint.
              </p>
            </div>

            {/* Number of Questions */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Number of questions
              </label>
              <div className="flex flex-wrap gap-3">
                {[5, 10, 15, 20].map((count) => (
                  <button
                    key={count}
                    onClick={() => setConfig({ ...config, questionCount: count })}
                    className={`px-5 py-2.5 rounded-2xl border-2 transition-all font-bold ${
                      config.questionCount === count
                        ? "border-sky-400 dark:border-sky-400 bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-900/40 dark:to-sky-900/30 text-sky-900 dark:text-sky-100 shadow-[0_4px_0_rgba(14,165,233,0.2),0_6px_16px_rgba(14,165,233,0.15)] scale-[1.05]"
                        : "ai-config-option border-slate-200 dark:border-slate-600 hover:border-sky-300 dark:hover:border-sky-500 text-slate-600 dark:text-slate-100 bg-white dark:bg-slate-900/90"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Specific topic <span className="text-slate-600 dark:text-slate-400">(optional)</span>
              </label>
              <div className="mb-3">
                <select
                  value={config.topic || ""}
                  onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                  className="ai-config-input w-full px-4 py-2.5 rounded-2xl border-2 border-slate-300 dark:border-slate-600 hover:border-sky-400 dark:hover:border-sky-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-400/20 dark:focus:ring-sky-500/20 font-medium transition-all"
                >
                  <option value="">Choose an SAT subcategory</option>
                  {sectionTopics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={config.topic}
                onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                placeholder={
                  testType === "math"
                    ? "e.g., Linear Functions, Quadratic Equations, Geometry"
                    : testType === "reading"
                    ? "e.g., Historical Passages, Science Texts, Literature"
                    : "e.g., Grammar Rules, Sentence Structure, Punctuation"
                }
                className="ai-config-input w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-400/20 dark:focus:ring-sky-500/20 font-medium"
              />
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 font-medium">
                Leave blank for a mixed topic test
              </p>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Difficulty preference
              </label>
              <div className="flex flex-wrap gap-3">
                {(["Mixed", "Easy", "Medium", "Hard"] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setConfig({ ...config, difficulty: diff })}
                    className={`px-5 py-2.5 rounded-2xl border-2 transition-all font-bold ${
                      config.difficulty === diff
                        ? "border-sky-400 dark:border-sky-400 bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-900/40 dark:to-sky-900/30 text-sky-900 dark:text-sky-100 shadow-[0_4px_0_rgba(14,165,233,0.2),0_6px_16px_rgba(14,165,233,0.15)] scale-[1.05]"
                        : "ai-config-option border-slate-200 dark:border-slate-600 hover:border-sky-300 dark:hover:border-sky-500 text-slate-600 dark:text-slate-100 bg-white dark:bg-slate-900/90"
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 font-medium">
                Mixed uses realistic SAT distribution (20% easy, 60% medium, 20% hard)
              </p>
            </div>

            {/* Generate Button */}
            <div className="flex gap-3 pt-2">
              <PrimaryButton onClick={generateTest} disabled={loading} fullWidth>
                {loading ? "Setting checkpoint..." : `Start ${config.questionCount}-question checkpoint`}
              </PrimaryButton>
            </div>
          </div>
        </GlassPanel>
      )}

            {loading && (
              <GlassPanel className="mt-8 text-center py-12">
                <div className="flex flex-col items-center justify-center min-h-[300px]">
                  <LoadingSpinner size="lg" message="Preparing your checkpoint…" />
                </div>
              </GlassPanel>
            )}

      {error && (
        <GlassPanel className="mt-6 border border-rose-500/30 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-900/30">
          <p className="text-sm text-rose-700 dark:text-rose-300 text-center font-semibold">{error}</p>
        </GlassPanel>
      )}

      {showResults && practiceSet && (
        <GlassPanel className="mt-8 ai-output-scope checkpoint-results">
          <div className="text-center space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-600 dark:text-slate-400 font-semibold">Checkpoint Results</p>
            <div>
              <p className="text-3xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {score}/{practiceSet.questions.length} Correct
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Nice work finishing a Practice Test checkpoint. Keep stacking these and you’ll feel the climb.
              </p>
              {satScore && (
                <div className="space-y-3 mt-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      SAT Scaled Score
                    </p>
                    <p className="text-5xl font-bold text-gradient">
                      {satScore.scaled}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                      {testType === "math" ? "Math Section" : testType === "reading" ? "Reading Section" : "Writing Section"} (200-800 scale)
                    </p>
                  </div>
                  {testType && (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      {practiceSet.questions.length >= MIN_ESTIMATE_QUESTIONS ? (
                        <>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                            Estimated Total SAT Score: <span className="font-bold text-slate-900 dark:text-white">{satScore.scaled * 2}</span> / 1600
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                            Percentile: Top {100 - getPercentile(satScore.scaled * 2)}% • {getScoreInterpretation(satScore.scaled * 2)}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          Estimated total SAT score appears after at least {MIN_ESTIMATE_QUESTIONS} questions.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {practiceSet.questions.map((q, idx) => {
              const isCorrect = userAnswers[idx] === q.correctAnswer;
              return (
                <div
                  key={q.id}
                  className={`checkpoint-result-card rounded-2xl border p-4 ${
                    isCorrect
                      ? "is-correct border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/30"
                      : "is-wrong border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/30"
                  }`}
                >
                  <div className="flex justify-between text-sm font-bold mb-2 text-slate-900 dark:text-white">
                    <span>Question {idx + 1}</span>
                    <span className={isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>{isCorrect ? "✓ Correct" : "✗ Incorrect"}</span>
                  </div>
                  {testType === "writing" ? (
                    <WritingQuestion
                      question={q.question}
                      className="text-slate-700 dark:text-slate-200 text-sm font-medium"
                    />
                  ) : (
                    <p className="text-slate-700 dark:text-slate-200 text-sm font-medium">{q.question}</p>
                  )}
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium">
                    Your answer: {userAnswers[idx] || "—"} • Correct: {q.correctAnswer}
                  </p>
                  {(q.explanation_correct || q.explanation) && (
                    <div className="mt-4 space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="text-xs font-bold text-green-700 dark:text-green-400 mb-1.5 uppercase tracking-wide">
                          ✓ Explanation
                        </p>
                        {renderFormattedText(q.explanation_correct || q.explanation || "")}
                      </div>
                      
                      {q.explanation_incorrect && Object.keys(q.explanation_incorrect).length > 0 && (
                        <div>
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
                      
                      {q.strategy_tip && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-xs font-bold text-sky-700 dark:text-sky-400 mb-1.5 uppercase tracking-wide">
                            💡 Strategy Tip
                          </p>
                          {renderFormattedText(q.strategy_tip)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
                <PrimaryButton onClick={resetTest} fullWidth className="mt-6">
                  Start New Checkpoint
                </PrimaryButton>
        </GlassPanel>
      )}

      {practiceSet && !showResults && (
        <GlassPanel className="mt-8 space-y-6 ai-output-scope">
          <div className="relative z-10">
            <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400 mb-3 font-medium">
              <span>
                Question {currentQuestion + 1} / {isProgressiveMode ? targetQuestionCount : practiceSet.questions.length}
              </span>
              <div className="flex items-center gap-4">
                <SubtleProgressCircle progress={practiceProgressPercent} />
                <Timer
                  initialMinutes={getTimerDuration(
                    testType,
                    isProgressiveMode ? targetQuestionCount : practiceSet.questions.length
                  )}
                  onTimeUp={handleTimeUp}
                  warningMinutes={5}
                  paused={isProgressiveMode && isBatchLoading}
                />
              </div>
            </div>
          </div>

          {((practiceSet.questions[currentQuestion] as any)?.passage || practiceSet.passage) && (
            <div className="mt-2 border-2 border-slate-300 dark:border-slate-600 rounded-2xl p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/90 text-sm sm:text-base text-slate-800 dark:text-slate-100 whitespace-pre-line font-medium leading-relaxed mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400 font-semibold">Passage</span>
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {(practiceSet.questions[currentQuestion] as any)?.passage || practiceSet.passage}
              </div>
            </div>
          )}

          <div className="mb-6">
            {testType === "writing" ? (
              <>
                <WritingQuestion
                  question={practiceSet.questions[currentQuestion].question}
                  className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2"
                />
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-4">
                  Choose the best revision for the underlined portion.
                </p>
              </>
            ) : (
              <p className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-4 leading-relaxed whitespace-pre-line">
                {practiceSet.questions[currentQuestion].question}
              </p>
            )}
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <span className="practice-skill-badge px-3 py-1.5 rounded-full border">
                {practiceSet.questions[currentQuestion].skillFocus}
              </span>
              <span className="practice-difficulty-badge px-3 py-1.5 rounded-full border">
                Difficulty: {practiceSet.questions[currentQuestion].difficulty}
              </span>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {(Object.keys(practiceSet.questions[currentQuestion].options) as OptionLetter[]).map(
              (optionLetter) => {
                const isSelected = selectedAnswer === optionLetter;
                return (
                  <button
                    key={optionLetter}
                    onClick={() => handleAnswerSelect(optionLetter)}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all font-medium ${
                      isSelected
                        ? "border-sky-400 dark:border-sky-400 bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-900/40 dark:to-sky-900/30 text-sky-900 dark:text-sky-100 shadow-[0_4px_0_rgba(14,165,233,0.15),0_6px_16px_rgba(14,165,233,0.1)] scale-[1.02]"
                        : "border-slate-200 dark:border-slate-600 hover:border-sky-300 dark:hover:border-sky-500 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/90 hover:shadow-[0_3px_0_rgba(14,165,233,0.1),0_4px_12px_rgba(14,165,233,0.08)] hover:-translate-y-0.5 active:translate-y-0.5"
                    }`}
                  >
                    <span className="font-bold mr-3">{optionLetter})</span>
                    {practiceSet.questions[currentQuestion].options[optionLetter]}
                  </button>
                );
              }
            )}
          </div>

          <div className="flex justify-between gap-4 pt-2">
            <PrimaryButton variant="secondary" onClick={handlePrevious} disabled={currentQuestion === 0}>
              Previous
            </PrimaryButton>
            <PrimaryButton onClick={handleNext}>
              {currentQuestion === practiceSet.questions.length - 1
                ? (isProgressiveMode && practiceSet.questions.length < targetQuestionCount ? "Load Next 5" : "Finish")
                : "Next"}
            </PrimaryButton>
          </div>
          {isProgressiveMode && (
            <div className="pt-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
              {isBatchLoading
                ? "Loading next 5 questions in the background…"
                : `Loaded ${practiceSet.questions.length} of ${targetQuestionCount} questions.`}
            </div>
          )}
          {batchLoadError && (
            <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold">
              {batchLoadError}
            </p>
          )}
        </GlassPanel>
      )}
    </div>
  );
}
