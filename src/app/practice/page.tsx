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
import { Calculator, ArrowRight, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
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
  warning?: string;
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
  const [selectedReviewIndex, setSelectedReviewIndex] = useState<number | null>(null);
  const [trailBuddyQuestion, setTrailBuddyQuestion] = useState("");
  const [trailBuddyReply, setTrailBuddyReply] = useState("");
  const [trailBuddyLoading, setTrailBuddyLoading] = useState(false);
  const [trailBuddyError, setTrailBuddyError] = useState<string | null>(null);
  const [trailBuddyStepMode, setTrailBuddyStepMode] = useState(false);
  const [reviewExplanationOpen, setReviewExplanationOpen] = useState(false);
  const batchLoadingRef = React.useRef(false);
  const sectionTopics = testType ? getTopicsForSection(testType) : [];
  const isProgressiveMode = targetQuestionCount > 5;
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
          let message = "practice_request_failed";
          let shouldRetry = false;
          try {
            const data = await res.json();
            if (data?.error && typeof data.error === "string") {
              message = data.error;
            }
          } catch {
            /* ignore */
          }
          // Retry only transient failures. Validation/config errors (4xx like 422)
          // should surface immediately so users can adjust settings.
          if (res.status === 429 || res.status >= 500) {
            shouldRetry = true;
          }
          const error = new Error(message) as Error & { shouldRetry?: boolean };
          error.shouldRetry = shouldRetry;
          throw error;
        }
        return (await res.json()) as PracticeSet & { id?: string };
      } catch (error) {
        lastError = error;
        const shouldRetry =
          error instanceof Error &&
          "shouldRetry" in error &&
          Boolean((error as Error & { shouldRetry?: boolean }).shouldRetry);
        if (attempt < maxRetries && shouldRetry) {
          await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
          continue;
        }
        break;
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
        `You've used your free starter access. Unlock Plus for $5/month to keep your momentum going.`
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
    setSelectedReviewIndex(null);
    setTrailBuddyQuestion("");
    setTrailBuddyReply("");
    setTrailBuddyError(null);
    setTrailBuddyStepMode(false);
    setReviewExplanationOpen(false);
    setTestType(selectedSection);
    setConfig(selectedConfig);

    try {
      const shouldProgressive = selectedConfig.questionCount > 5;
      const initialCount = shouldProgressive
        ? Math.min(2, selectedConfig.questionCount)
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg && msg !== "practice_request_failed" ? msg : TEST_RETRY_MESSAGE
      );
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

    // Start with 1-2 questions, then keep a buffer ahead in background.
    if (remaining > 0 && questionsLeftInLoadedBatch <= 2 && !batchLoadingRef.current) {
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
        } catch (e) {
          const m = e instanceof Error ? e.message : "";
          setBatchLoadError(
            m && m !== "practice_request_failed" ? m : BATCH_RETRY_MESSAGE
          );
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
          } catch (e) {
            const m = e instanceof Error ? e.message : "";
            setBatchLoadError(
              m && m !== "practice_request_failed" ? m : BATCH_RETRY_MESSAGE
            );
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
    setSelectedReviewIndex(null);
    setTrailBuddyQuestion("");
    setTrailBuddyReply("");
    setTrailBuddyError(null);
    setTrailBuddyStepMode(false);
    setReviewExplanationOpen(false);
    setShowCalculator(false);
    localStorage.removeItem(PRACTICE_PROGRESS_KEY);
  };

  const askTrailBuddy = async ({
    section,
    question,
    passage,
    options,
    correctAnswer,
    userAnswer,
    explanationCorrect,
    explanationIncorrect,
    strategyTip,
    studentQuestion,
    responseStyle = "quick",
  }: {
    section: SectionType;
    question: string;
    passage?: string;
    options: Record<OptionLetter, string>;
    correctAnswer: OptionLetter;
    userAnswer?: OptionLetter;
    explanationCorrect?: string;
    explanationIncorrect?: Record<string, string>;
    strategyTip?: string;
    studentQuestion: string;
    responseStyle?: "quick" | "step_list";
  }) => {
    setTrailBuddyLoading(true);
    setTrailBuddyError(null);
    try {
      const res = await fetch("/api/practice-trail-buddy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testType: section,
          question,
          passage,
          options,
          correctAnswer,
          userAnswer: userAnswer || null,
          explanationCorrect,
          explanationIncorrect,
          strategyTip,
          studentQuestion,
          responseStyle,
        }),
      });
      if (!res.ok) {
        throw new Error("trail_buddy_failed");
      }
      const data = await res.json();
      setTrailBuddyReply(String(data.reply || "").trim());
    } catch {
      setTrailBuddyError("Trail Buddy is having trouble right now. Try again in a moment.");
    } finally {
      setTrailBuddyLoading(false);
    }
  };

  const sectionCards = [
    { type: "math" as SectionType, title: "Math Trail", desc: "Algebra, functions, data analysis, geometry checkpoints.", icon: "math" as const },
    { type: "reading" as SectionType, title: "Reading Trail", desc: "Evidence, main ideas, rhetoric, synthesis checkpoints.", icon: "reading" as const },
    { type: "writing" as SectionType, title: "Writing Trail", desc: "Grammar, clarity, transitions, structure checkpoints.", icon: "writing" as const },
  ];

  return (
    <div className="px-3 sm:px-4 md:px-6 pb-6 sm:pb-8 md:pb-10 max-w-6xl mx-auto overflow-x-hidden w-full">
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
                {freeUsageCount >= 1 ? "Free Starter Used" : "Free Starter: 1 checkpoint remaining"}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 font-medium">
                Unlock unlimited practice tests, adaptive plans, and Trail Buddy for $5/month
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
            <div className="p-4 sm:p-6 space-y-5">
              {/* Results + scaled score in one row */}
              <div>
                <div className={`grid gap-3 ${satScore ? "md:grid-cols-2" : "grid-cols-1"}`}>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 font-semibold mb-2">Results</p>
                    <p className="text-4xl font-bold text-slate-900 dark:text-white mb-1">
                      {score}<span className="text-2xl font-normal text-slate-400 dark:text-slate-500">/{practiceSet.questions.length}</span>
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {Math.round((score / practiceSet.questions.length) * 100)}% correct
                    </p>
                  </div>
                  {satScore && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 text-center space-y-1">
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

              {/* Question review grid + detail */}
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400 font-semibold mb-4">Question Review Grid</p>
                {(() => {
                  const firstIncorrect = practiceSet.questions.findIndex((q, idx) => userAnswers[idx] !== q.correctAnswer);
                  const activeIdxRaw = selectedReviewIndex ?? (firstIncorrect >= 0 ? firstIncorrect : 0);
                  const activeIdx = Math.max(0, Math.min(activeIdxRaw, practiceSet.questions.length - 1));
                  const activeQuestion = practiceSet.questions[activeIdx];
                  const activeIsCorrect = userAnswers[activeIdx] === activeQuestion.correctAnswer;
                  const activeUserAnswer = userAnswers[activeIdx];
                  const activePassage = (activeQuestion as any)?.passage || practiceSet.passage;
                  const hasExplanation = !!(activeQuestion.explanation_correct || activeQuestion.explanation);
                  const getOptionText = (letter?: string) => {
                    if (!letter) return "-";
                    const normalized = letter.toUpperCase() as OptionLetter;
                    return activeQuestion.options?.[normalized] || letter;
                  };
                  const activeUserAnswerText = activeUserAnswer ? getOptionText(activeUserAnswer) : "-";
                  const activeCorrectAnswerText = getOptionText(activeQuestion.correctAnswer);

                  return (
                    <div className="grid gap-3 md:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.7fr)] items-start">
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-4">
                        <div className="grid grid-cols-5 gap-2">
                          {practiceSet.questions.map((q, idx) => {
                            const isCorrect = userAnswers[idx] === q.correctAnswer;
                            const isActive = idx === activeIdx;
                            return (
                              <button
                                key={q.id}
                                type="button"
                                onClick={() => {
                                  setSelectedReviewIndex(idx);
                                  setTrailBuddyReply("");
                                  setTrailBuddyQuestion("");
                                  setTrailBuddyError(null);
                                  setTrailBuddyStepMode(false);
                                  setReviewExplanationOpen(false);
                                }}
                                className={`h-11 rounded-lg text-sm font-bold border transition-colors ${
                                  isCorrect
                                    ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300"
                                    : "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
                                } ${
                                  isActive
                                    ? "ring-2 ring-sky-400 dark:ring-sky-500"
                                    : "hover:opacity-90"
                                }`}
                                aria-label={`Question ${idx + 1} ${isCorrect ? "correct" : "incorrect"}`}
                              >
                                {idx + 1}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-3 mt-4 text-xs font-semibold">
                          <span className="inline-flex items-center gap-1.5 text-green-700 dark:text-green-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            Correct
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            Incorrect
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            Question {activeIdx + 1} - {activeQuestion.skillFocus}
                          </p>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            activeIsCorrect
                              ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700"
                              : "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 border-red-200 dark:border-red-700"
                          }`}>
                            {activeIsCorrect ? "Correct" : "Incorrect"}
                          </span>
                        </div>

                        {activePassage && (
                          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3">
                            {testType === "writing" ? (
                              <WritingQuestion
                                question={String(activePassage)}
                                className="text-sm text-slate-700 dark:text-slate-200"
                              />
                            ) : (
                              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                                {String(activePassage)}
                              </p>
                            )}
                          </div>
                        )}

                        {testType === "writing" ? (
                          <WritingQuestion
                            question={activeQuestion.question}
                            className="text-sm text-slate-700 dark:text-slate-200"
                          />
                        ) : (
                          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{activeQuestion.question}</p>
                        )}

                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold border ${
                            activeIsCorrect
                              ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700"
                              : "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 border-red-200 dark:border-red-700"
                          }`}>
                            Your answer: {activeUserAnswerText}
                          </span>
                          {!activeIsCorrect && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold border bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700">
                              Correct: {activeCorrectAnswerText}
                            </span>
                          )}
                        </div>

                        {hasExplanation && (
                          <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 p-3">
                            <button
                              type="button"
                              onClick={() => setReviewExplanationOpen((v) => !v)}
                              className="w-full flex items-center justify-between text-left"
                              aria-expanded={reviewExplanationOpen}
                            >
                              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Why this is right</p>
                              <span className="text-slate-500 dark:text-slate-400">
                                {reviewExplanationOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </span>
                            </button>
                            <div
                              className={`overflow-hidden transition-all duration-300 ease-out ${
                                reviewExplanationOpen ? "max-h-[900px] opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
                              }`}
                            >
                              {renderFormattedText(activeQuestion.explanation_correct || activeQuestion.explanation || "")}
                              {activeQuestion.explanation_incorrect && Object.keys(activeQuestion.explanation_incorrect).length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {Object.entries(activeQuestion.explanation_incorrect).map(([letter, reason]) => (
                                    <div key={letter} className="text-sm text-slate-600 dark:text-slate-400">
                                      <span className="font-semibold text-red-600 dark:text-red-400">Option {letter} ({getOptionText(letter)}):</span>{" "}
                                      {renderFormattedText(reason)}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {activeQuestion.strategy_tip && (
                                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                  <p className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide mb-1">Strategy Tip</p>
                                  {renderFormattedText(activeQuestion.strategy_tip)}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 font-semibold mb-2">Trail Buddy Question Box</p>
                          <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-900/20 p-3">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                value={trailBuddyQuestion}
                                onChange={(e) => setTrailBuddyQuestion(e.target.value)}
                                placeholder="Ask Trail Buddy what confused you..."
                                className="ai-config-input flex-1 rounded-lg px-3 py-2 text-sm"
                              />
                              <button
                                type="button"
                                disabled={trailBuddyLoading}
                                onClick={() => {
                                  const trimmed = trailBuddyQuestion.trim();
                                  if (!trimmed) return;
                                  setTrailBuddyStepMode(false);
                                  void askTrailBuddy({
                                    section: testType || "math",
                                    question: activeQuestion.question,
                                    passage: activePassage ? String(activePassage) : undefined,
                                    options: activeQuestion.options,
                                    correctAnswer: activeQuestion.correctAnswer,
                                    userAnswer: activeUserAnswer,
                                    explanationCorrect: activeQuestion.explanation_correct || activeQuestion.explanation,
                                    explanationIncorrect: activeQuestion.explanation_incorrect,
                                    strategyTip: activeQuestion.strategy_tip,
                                    studentQuestion: trimmed,
                                    responseStyle: "quick",
                                  });
                                }}
                                className="sat-btn-next sm:w-auto px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {trailBuddyLoading ? "Thinking..." : "Ask"}
                              </button>
                              <button
                                type="button"
                                disabled={trailBuddyLoading}
                                onClick={() => {
                                  setTrailBuddyStepMode(true);
                                  void askTrailBuddy({
                                    section: testType || "math",
                                    question: activeQuestion.question,
                                    passage: activePassage ? String(activePassage) : undefined,
                                    options: activeQuestion.options,
                                    correctAnswer: activeQuestion.correctAnswer,
                                    userAnswer: activeUserAnswer,
                                    explanationCorrect: activeQuestion.explanation_correct || activeQuestion.explanation,
                                    explanationIncorrect: activeQuestion.explanation_incorrect,
                                    strategyTip: activeQuestion.strategy_tip,
                                    studentQuestion: "Give me a step-by-step on how to solve this question clearly.",
                                    responseStyle: "step_list",
                                  });
                                }}
                                  className="rounded-lg border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold transition-all duration-200 hover:bg-sky-100 dark:hover:bg-sky-900/30 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                Step-by-step
                              </button>
                            </div>
                            {trailBuddyError && (
                              <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{trailBuddyError}</p>
                            )}
                            {trailBuddyReply && (
                              trailBuddyStepMode ? (
                                <ol className="mt-2 space-y-1 list-decimal pl-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                  {trailBuddyReply
                                    .split(/\n+/)
                                    .map((line) => line.replace(/^\s*\d+[\).\-\s]*/, "").trim())
                                    .filter(Boolean)
                                    .map((line, idx) => (
                                      <li key={idx}>{line}</li>
                                    ))}
                                </ol>
                              ) : (
                                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                  {trailBuddyReply}
                                </p>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
                <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Loading more questions...</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">This usually takes a moment.</p>
              </div>
            ) : (
              <div className="p-5 sm:p-7">
                {practiceSet.warning && (
                  <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-200 font-medium">
                    {practiceSet.warning}
                  </div>
                )}
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
