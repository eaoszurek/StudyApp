"use client";

import React, { useEffect, useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { motion } from "framer-motion";
import { calculateSectionScore, getPercentile, getScoreInterpretation } from "@/utils/satScoring";
import { MIN_ESTIMATE_QUESTIONS, savePracticeSession } from "@/utils/scoreTracking";
import WritingQuestion from "@/components/ui/WritingQuestion";
import FeatureIcon from "@/components/ui/FeatureIcon";
import DesmosCalculator from "@/components/ui/DesmosCalculator";
import { Calculator, ChevronDown, ChevronUp, ArrowRight, ArrowLeft } from "lucide-react";
import QuestionChart, { type QuestionGraphData } from "@/components/ui/QuestionChart";
import DesmosGraph from "@/components/ui/DesmosGraph";
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
  graphData?: QuestionGraphData;
  desmosExpression?: string;
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

const TEST_RETRY_MESSAGE = "We couldn't generate your test right now. Please retry.";
const BATCH_RETRY_MESSAGE = "We couldn't load the next questions. Please retry.";
const PRACTICE_PROGRESS_KEY = "sat_practice_in_progress_v1";

interface PracticeProgressSnapshot {
  testType: SectionType;
  config: TestConfig;
  practiceSet: PracticeSet & { id?: string };
  currentTestId: string | null;
  currentQuestion: number;
  selectedAnswer: OptionLetter | null;
  showResults: boolean;
  score: number;
  satScore: { scaled: number; raw: number; maxRaw: number } | null;
  userAnswers: Record<number, OptionLetter>;
  targetQuestionCount: number;
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

// Collapsible question review card used in the results screen
function ResultCard({
  question,
  idx,
  isCorrect,
  userAnswer,
  testType,
  renderFormattedText,
}: {
  question: PracticeQuestion;
  idx: number;
  isCorrect: boolean;
  userAnswer: OptionLetter | undefined;
  testType: SectionType | null;
  renderFormattedText: (text: string) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hasExplanation = !!(question.explanation_correct || question.explanation);

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isCorrect
          ? "border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
          : "border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
      }`}
    >
      {/* Header row - always visible, click to expand */}
      <button
        type="button"
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Colored dot */}
          <span
            className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
              isCorrect ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {idx + 1}
          </span>
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
            {question.skillFocus}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`text-xs font-semibold ${
              isCorrect ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {isCorrect ? "Correct" : "Incorrect"}
          </span>
          <span className="text-slate-400 dark:text-slate-500 text-xs">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700 space-y-3 pt-3">
          {/* Question text */}
          {testType === "writing" ? (
            <WritingQuestion
              question={question.question}
              className="text-sm text-slate-700 dark:text-slate-200"
            />
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{question.question}</p>
          )}

          {/* Answer summary */}
          <div className="flex flex-wrap gap-3 text-xs">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold border ${
              isCorrect
                ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700"
                : "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 border-red-200 dark:border-red-700"
            }`}>
              Your answer: {userAnswer || "-"}
            </span>
            {!isCorrect && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold border bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700">
                Correct: {question.correctAnswer}
              </span>
            )}
          </div>

          {/* Explanation */}
          {hasExplanation && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Explanation</p>
              {renderFormattedText(question.explanation_correct || question.explanation || "")}
              {question.explanation_incorrect && Object.keys(question.explanation_incorrect).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(question.explanation_incorrect).map(([letter, reason]) => (
                    <div key={letter} className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-red-600 dark:text-red-400">Option {letter}:</span>{" "}
                      {renderFormattedText(reason)}
                    </div>
                  ))}
                </div>
              )}
              {question.strategy_tip && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide mb-1">Strategy Tip</p>
                  {renderFormattedText(question.strategy_tip)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscriptionStatus: string | null;
    hasSubscription: boolean;
  } | null>(null);
  const [freeUsageCount, setFreeUsageCount] = useState(0);
  const [targetQuestionCount, setTargetQuestionCount] = useState(5);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [batchLoadError, setBatchLoadError] = useState<string | null>(null);
  const [practiceHydrated, setPracticeHydrated] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const batchLoadingRef = React.useRef(false);
  const sectionTopics = testType ? getTopicsForSection(testType) : [];
  const isProgressiveMode =
    (testType === "writing" || testType === "reading") && targetQuestionCount > 5;
  const practiceProgressPercent = practiceSet
    ? ((currentQuestion + 1) /
        (isProgressiveMode ? targetQuestionCount : practiceSet.questions.length)) *
      100
    : 0;

  useEffect(() => {
    if (testType !== "math" || showResults || !practiceSet) {
      setShowCalculator(false);
    }
  }, [testType, showResults, practiceSet]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRACTICE_PROGRESS_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as PracticeProgressSnapshot;
      if (!parsed || !parsed.practiceSet || !parsed.testType) return;

      setTestType(parsed.testType);
      setConfig(parsed.config || { questionCount: 5, topic: "", difficulty: "Mixed" });
      setPracticeSet(parsed.practiceSet);
      setCurrentTestId(parsed.currentTestId || null);
      currentTestIdRef.current = parsed.currentTestId || null;
      setCurrentQuestion(Math.max(0, parsed.currentQuestion || 0));
      setSelectedAnswer(parsed.selectedAnswer || null);
      setShowResults(Boolean(parsed.showResults));
      setScore(parsed.score || 0);
      setSatScore(parsed.satScore || null);
      setUserAnswers(parsed.userAnswers || {});
      setTargetQuestionCount(parsed.targetQuestionCount || parsed.config?.questionCount || 5);
      setShowConfig(false);
    } catch (restoreError) {
      console.error("Failed to restore practice progress:", restoreError);
    } finally {
      setPracticeHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!practiceHydrated) return;
    try {
      if (!practiceSet || !testType) {
        localStorage.removeItem(PRACTICE_PROGRESS_KEY);
        return;
      }
      const snapshot: PracticeProgressSnapshot = {
        testType,
        config,
        practiceSet,
        currentTestId,
        currentQuestion,
        selectedAnswer,
        showResults,
        score,
        satScore,
        userAnswers,
        targetQuestionCount,
      };
      localStorage.setItem(PRACTICE_PROGRESS_KEY, JSON.stringify(snapshot));
    } catch (saveError) {
      console.error("Failed to persist practice progress:", saveError);
    }
  }, [
    testType,
    config,
    practiceSet,
    currentTestId,
    currentQuestion,
    selectedAnswer,
    showResults,
    score,
    satScore,
    userAnswers,
    targetQuestionCount,
    practiceHydrated,
  ]);

  const fetchPracticeBatchWithRetry = async (
    payload: Record<string, unknown>,
    maxRetries: number = 2
  ): Promise<PracticeSet & { id?: string }> => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const res = await fetch("/api/generate-practice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("practice_request_failed");
        }
        return (await res.json()) as PracticeSet & { id?: string };
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
          continue;
        }
      }
    }
    throw lastError ?? new Error("practice_request_failed");
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

  const generateTest = async (overrides?: { section?: SectionType; config?: TestConfig }) => {
    const selectedSection = overrides?.section ?? testType;
    const selectedConfig = overrides?.config ?? config;
    if (!selectedSection) return;

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
    setTargetQuestionCount(selectedConfig.questionCount);
    setTestType(selectedSection);
    setConfig(selectedConfig);

    try {
      const initialCount =
        selectedSection === "writing" || selectedSection === "reading"
          ? Math.min(5, selectedConfig.questionCount)
          : selectedConfig.questionCount;
      const data = await fetchPracticeBatchWithRetry({
        section: selectedSection,
        questionCount: initialCount,
        topic: selectedConfig.topic || undefined,
        difficulty: selectedConfig.difficulty === "Mixed" ? undefined : selectedConfig.difficulty,
      });
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
    } catch {
      setError(TEST_RETRY_MESSAGE);
      setShowConfig(true); // Return to config on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autostart") !== "1") return;
    const sectionParam = params.get("section");
    if (!sectionParam || !["math", "reading", "writing"].includes(sectionParam)) return;

    const parsedConfig: TestConfig = {
      questionCount: Math.max(5, Math.min(25, parseInt(params.get("questions") || "10", 10) || 10)),
      topic: params.get("topic") || "",
      difficulty: (params.get("difficulty") as TestConfig["difficulty"]) || "Mixed",
    };
    const section = sectionParam as SectionType;
    window.history.replaceState({}, "", "/practice");
    void generateTest({ section, config: parsedConfig });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          const nextBatch = await fetchPracticeBatchWithRetry({
            section: testType,
            questionCount: batchSize,
            topic: config.topic || undefined,
            difficulty: config.difficulty === "Mixed" ? undefined : config.difficulty,
            existingTestId: currentTestIdRef.current,
          });
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
        } catch {
          setBatchLoadError(BATCH_RETRY_MESSAGE);
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
            const nextBatch = await fetchPracticeBatchWithRetry({
              section: testType,
              questionCount: batchSize,
              topic: config.topic || undefined,
              difficulty: config.difficulty === "Mixed" ? undefined : config.difficulty,
              existingTestId: currentTestIdRef.current || undefined,
            });
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
          } catch {
            setBatchLoadError(BATCH_RETRY_MESSAGE);
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
    setConfig({
      questionCount: 5,
      topic: "",
      difficulty: "Mixed",
    });
    setShowCalculator(false);
    localStorage.removeItem(PRACTICE_PROGRESS_KEY);
  };

  const sectionCards = [
    { type: "math" as SectionType, title: "Math Trail", desc: "Algebra, functions, data analysis, geometry checkpoints.", icon: "math" as const },
    { type: "reading" as SectionType, title: "Reading Trail", desc: "Evidence, main ideas, rhetoric, synthesis checkpoints.", icon: "reading" as const },
    { type: "writing" as SectionType, title: "Writing Trail", desc: "Grammar, clarity, transitions, structure checkpoints.", icon: "writing" as const },
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
              className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-sm font-bold transition-all border-2 border-amber-600 shadow-[0_4px_0_rgba(217,119,6,0.3)] hover:shadow-[0_5px_0_rgba(217,119,6,0.4)] active:shadow-[0_2px_0_rgba(217,119,6,0.4)] hover:-translate-y-0.5 active:translate-y-1 whitespace-nowrap"
            >
              Upgrade
            </button>
          </div>
        </div>
      )}

      {!testType && (
        <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
          {sectionCards.map((card, idx) => (
            <button
              key={card.type}
              onClick={() => handleSectionSelect(card.type)}
              className="text-left h-full flex flex-col"
            >
              <GlassPanel delay={idx * 0.05} className="h-full">
                <div className="flex flex-col gap-2 h-full">
                  <div className="w-10 h-10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                    <FeatureIcon name={card.icon} size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{card.title}</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{card.desc}</p>
                  <span className="text-xs uppercase tracking-[0.4em] text-slate-600 dark:text-slate-400 mt-auto pt-2 font-semibold">
                    Configure test <ArrowRight size={12} className="inline ml-1" />
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
                <ArrowLeft size={14} className="mr-1" /> Back to trails
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
                    className={`px-5 py-2.5 rounded-lg border transition-colors font-semibold text-sm ${
                      config.questionCount === count
                        ? "border-sky-500 bg-sky-500 text-white"
                        : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-500"
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
                    className={`px-5 py-2.5 rounded-lg border transition-colors font-semibold text-sm ${
                      config.difficulty === diff
                        ? "border-sky-500 bg-sky-500 text-white"
                        : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-500"
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
              <PrimaryButton onClick={() => void generateTest()} disabled={loading} fullWidth>
                {loading ? "Setting checkpoint..." : `Start ${config.questionCount}-question checkpoint`}
              </PrimaryButton>
            </div>
          </div>
        </GlassPanel>
      )}

            {loading && (
              <GlassPanel className="mt-8 text-center py-12">
                <div className="flex flex-col items-center justify-center min-h-[300px]">
                  <LoadingSpinner size="lg" message="Preparing your checkpoint..." />
                </div>
              </GlassPanel>
            )}

      {error && (
        <GlassPanel className="mt-6 border border-rose-500/30 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-900/30">
          <p className="text-sm text-rose-700 dark:text-rose-300 text-center font-semibold">{error}</p>
        </GlassPanel>
      )}

      {showResults && practiceSet && (() => {
        const skillMap: Record<string, { correct: number; total: number }> = {};
        practiceSet.questions.forEach((q, idx) => {
          const skill = q.skillFocus || "General";
          if (!skillMap[skill]) skillMap[skill] = { correct: 0, total: 0 };
          skillMap[skill].total += 1;
          if (userAnswers[idx] === q.correctAnswer) skillMap[skill].correct += 1;
        });
        const skillStats = Object.entries(skillMap)
          .map(([skill, { correct, total }]) => ({
            skill, correct, total,
            pct: Math.round((correct / total) * 100),
          }))
          .sort((a, b) => a.pct - b.pct);
        const R = 28;
        const circumference = 2 * Math.PI * R;
        return (
          <GlassPanel className="mt-8 ai-output-scope sat-practice-shell !p-0 overflow-hidden">
            <div className="p-5 sm:p-7 space-y-8">
              {/* Score header */}
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400 font-semibold mb-3">Results</p>
                <p className="text-4xl font-bold text-slate-900 dark:text-white mb-1">
                  {score}<span className="text-2xl font-normal text-slate-400 dark:text-slate-500">/{practiceSet.questions.length}</span>
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {Math.round((score / practiceSet.questions.length) * 100)}% correct
                </p>
                {satScore && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 font-semibold">SAT Scaled Score</p>
                    <p className="text-5xl font-bold text-blue-600 dark:text-blue-400">{satScore.scaled}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {testType === "math" ? "Math" : testType === "reading" ? "Reading" : "Writing"} Section &middot; 200&ndash;800
                    </p>
                    {testType && practiceSet.questions.length >= MIN_ESTIMATE_QUESTIONS && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Est. Total: <span className="font-bold text-slate-900 dark:text-white">{satScore.scaled * 2}</span> / 1600
                        {" "}&middot; Top {100 - getPercentile(satScore.scaled * 2)}% &middot; {getScoreInterpretation(satScore.scaled * 2)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Skill performance circles */}
              {skillStats.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400 font-semibold mb-4">Performance by Skill</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {skillStats.map(({ skill, correct, total, pct }) => {
                      const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
                      const dashOffset = circumference - (circumference * pct) / 100;
                      return (
                        <div key={skill} className="flex flex-col items-center gap-1 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                          <div className="relative flex items-center justify-center w-[72px] h-[72px]">
                            <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
                              <circle cx="36" cy="36" r={R} fill="none" stroke="#e2e8f0" strokeWidth="6" className="dark:stroke-slate-700" />
                              <circle
                                cx="36" cy="36" r={R}
                                fill="none"
                                stroke={color}
                                strokeWidth="6"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute text-base font-bold text-slate-900 dark:text-white">{pct}%</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight mt-1">{skill}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{correct}/{total} correct</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Question review cards */}
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400 font-semibold mb-4">Question Review</p>
                <div className="space-y-2">
                  {practiceSet.questions.map((q, idx) => (
                    <ResultCard
                      key={q.id}
                      question={q}
                      idx={idx}
                      isCorrect={userAnswers[idx] === q.correctAnswer}
                      userAnswer={userAnswers[idx]}
                      testType={testType}
                      renderFormattedText={renderFormattedText}
                    />
                  ))}
                </div>
              </div>

              <button type="button" className="sat-btn-next w-full" onClick={resetTest}>
                Start New Test
              </button>
            </div>
          </GlassPanel>
        );
      })()}
      {practiceSet && !showResults && (() => {
        const q = practiceSet.questions[currentQuestion];
        const hasPassage = !!(((q as any)?.passage) || practiceSet.passage);
        const passageText = (q as any)?.passage || practiceSet.passage || "";
        const totalQ = isProgressiveMode ? targetQuestionCount : practiceSet.questions.length;
        const difficultyClass =
          q.difficulty === "Easy" ? "sat-badge-easy" :
          q.difficulty === "Hard" ? "sat-badge-hard" : "sat-badge-medium";
        const subjectClass = testType === "math" ? "sat-badge-math" : "sat-badge-english";
        const subjectLabel = testType === "math" ? "Math" : "English";
        const nextLabel = currentQuestion === practiceSet.questions.length - 1
          ? (isProgressiveMode && practiceSet.questions.length < targetQuestionCount ? "Load Next 5" : "Finish")
          : "Next Question";

        return (
          <GlassPanel className="mt-8 ai-output-scope sat-practice-shell !p-0 overflow-hidden">
            {isBatchLoading &&
            isProgressiveMode &&
            practiceSet.questions.length < targetQuestionCount &&
            currentQuestion === practiceSet.questions.length - 1 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center p-8">
                <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-6" aria-hidden />
                <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Loading next 5 questions...</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">This usually takes a moment.</p>
              </div>
            ) : (
              <div className="p-5 sm:p-7">
                {/* Header: progress bar + inline calculator */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Question {currentQuestion + 1} of {totalQ}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {Math.round(practiceProgressPercent)}% complete
                      </span>
                      {testType === "math" && (
                        <button
                          type="button"
                          className="sat-calc-btn"
                          onClick={() => setShowCalculator((prev) => !prev)}
                          aria-label={showCalculator ? "Close calculator" : "Open calculator"}
                        >
                          <Calculator size={14} />
                          {showCalculator ? "Close Calculator" : "Open Calculator"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="sat-progress-track">
                    <div className="sat-progress-fill" style={{ width: `${practiceProgressPercent}%` }} />
                  </div>
                </div>

                {/* Main content: two-col with passage, single-col otherwise */}
                <div className={hasPassage ? "flex flex-col md:flex-row" : ""}>

                  {/* Left: passage — natural height (no internal scrollbar) */}
                  {hasPassage && (
                    <div className="md:w-[50%] shrink-0 md:border-r border-slate-200 dark:border-slate-700 md:pr-6 md:mr-6 mb-4 md:mb-0">
                      <div className="sat-passage rounded-lg md:rounded-none bg-slate-50 dark:bg-slate-800/40 md:bg-transparent md:dark:bg-transparent p-4 md:p-0">
                        {testType === "writing" ? (
                          <WritingQuestion
                            question={String(passageText)}
                            className="sat-passage-text text-slate-800 dark:text-slate-200"
                          />
                        ) : (
                          <p className="sat-passage-text text-slate-800 dark:text-slate-200 whitespace-pre-line text-[15px] leading-[1.75]">
                            {passageText}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Right (or full-width): question + options */}
                  <div className={hasPassage ? "flex-1 min-w-0" : ""}>
                    {/* Badges above question */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`sat-badge-subject inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${subjectClass}`}>
                        {subjectLabel}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${difficultyClass}`}>
                        {q.difficulty}
                      </span>
                    </div>

                    {/* Graph / chart data */}
                    {q.graphData && (
                      <QuestionChart data={q.graphData as QuestionGraphData} />
                    )}
                    {testType === "math" && q.desmosExpression && (
                      <DesmosGraph expressions={[q.desmosExpression as string]} />
                    )}

                    {/* Question text */}
                    {testType === "writing" ? (
                      <>
                        {hasPassage ? (
                          <p className="sat-question-text text-base sm:text-lg text-slate-900 dark:text-white mb-2">
                            {q.question
                              .replace(/\[([^\]]+)\]/g, "$1")
                              .replace(/\*\*(.+?)\*\*/g, "$1")}
                          </p>
                        ) : (
                          <WritingQuestion
                            question={q.question}
                            className="sat-question-text text-base sm:text-lg text-slate-900 dark:text-white mb-2"
                          />
                        )}
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                          Choose the best revision for the underlined portion.
                        </p>
                      </>
                    ) : (
                      <p className="sat-question-text text-base sm:text-lg text-slate-900 dark:text-white mb-5 leading-relaxed">
                        {q.question}
                      </p>
                    )}

                    {/* Answer options */}
                    <div className="space-y-2.5 mb-6">
                      {(Object.keys(q.options) as OptionLetter[]).map((optionLetter) => {
                        const isSelected = selectedAnswer === optionLetter;
                        return (
                          <button
                            key={optionLetter}
                            onClick={() => handleAnswerSelect(optionLetter)}
                            className={`sat-option w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                              isSelected ? "sat-option-selected" : "sat-option-unselected"
                            }`}
                          >
                            <span className="sat-option-letter shrink-0">{optionLetter}</span>
                            <span>{q.options[optionLetter]}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between items-center gap-4 pt-1">
                      <button
                        type="button"
                        className="sat-btn-prev"
                        onClick={handlePrevious}
                        disabled={currentQuestion === 0}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="sat-btn-next"
                        onClick={() => void handleNext()}
                      >
                        {nextLabel}
                      </button>
                    </div>

                    {isProgressiveMode && (
                      <div className="pt-3 text-xs text-slate-500 dark:text-slate-400">
                        {isBatchLoading
                          ? "Loading next questions in the background..."
                          : `Loaded ${practiceSet.questions.length} of ${targetQuestionCount} questions.`}
                      </div>
                    )}
                    {batchLoadError && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">
                        {batchLoadError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </GlassPanel>
        );
      })()}
      {practiceSet && !showResults && testType === "math" && (
        <DesmosCalculator
          isOpen={showCalculator}
          onToggle={() => setShowCalculator((prev) => !prev)}
        />
      )}
    </div>
  );
}
