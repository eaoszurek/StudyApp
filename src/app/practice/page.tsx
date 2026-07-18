"use client";

import React, { useEffect, useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { motion } from "framer-motion";
import { calculateSectionScore } from "@/utils/satScoring";
import { savePracticeSession } from "@/utils/scoreTracking";
import { recordPracticeDay } from "@/utils/streakTracking";
import { recordWeeklyPractice } from "@/utils/weeklyGoal";
import FeatureIcon from "@/components/ui/FeatureIcon";
import { ArrowRight, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import QuestionChart, { type QuestionGraphData } from "@/components/ui/QuestionChart";
import DesmosGraph from "@/components/ui/DesmosGraph";
import { getTopicsForSection } from "@/data/topics";
import PracticeTopBar from "@/components/practice/PracticeTopBar";
import TopicConfigSelect from "@/components/practice/TopicConfigSelect";
import PracticeBottomBar from "@/components/practice/PracticeBottomBar";
import PracticeCalculatorPanel from "@/components/practice/PracticeCalculatorPanel";
import PracticeResultsHeader from "@/components/practice/PracticeResultsHeader";
import ConfidenceRow from "@/components/practice/ConfidenceRow";
import PremiumGateModal, { isPremiumGateError } from "@/components/PremiumGateModal";
type SectionType = "math" | "reading-writing";
type OptionLetter = "A" | "B" | "C" | "D";
type Confidence = "got_it" | "unsure" | "no_idea";

const TIMER_PREF_KEY = "peakprep_show_timer";
const CONFIDENCE_PREFIX = "peakprep_practice_confidence_";

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
  userConfidence?: Record<number, Confidence>;
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
  React.  useEffect(() => {
    const fetchAccessStatus = async () => {
      try {
        const response = await fetch("/api/user/access-status");
        if (response.ok) {
          const data = await response.json();
          setAccessStatus({
            allowed: Boolean(data.allowed),
            isPremium: Boolean(data.isPremium),
          });
        }
      } catch (error) {
        console.error("Failed to fetch access status:", error);
      }
    };
    fetchAccessStatus();
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
  const [userConfidence, setUserConfidence] = useState<Record<number, Confidence>>({});
  const [accessStatus, setAccessStatus] = useState<{
    allowed: boolean;
    isPremium: boolean;
  } | null>(null);
  const [showPremiumGateModal, setShowPremiumGateModal] = useState(false);
  const [targetQuestionCount, setTargetQuestionCount] = useState(5);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [batchLoadError, setBatchLoadError] = useState<string | null>(null);
  const [batchFailureDismissed, setBatchFailureDismissed] = useState(false);
  const [pendingResume, setPendingResume] = useState<PracticeProgressSnapshot | null>(null);
  const [practiceHydrated, setPracticeHydrated] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedReviewIndex, setSelectedReviewIndex] = useState<number | null>(null);
  const [trailBuddyQuestion, setTrailBuddyQuestion] = useState("");
  const [trailBuddyReply, setTrailBuddyReply] = useState("");
  const [trailBuddyLoading, setTrailBuddyLoading] = useState(false);
  const [trailBuddyError, setTrailBuddyError] = useState<string | null>(null);
  const [trailBuddyStepMode, setTrailBuddyStepMode] = useState(false);
  const [reviewExplanationOpen, setReviewExplanationOpen] = useState(false);
  const [explanationCache, setExplanationCache] = useState<
    Record<
      number,
      {
        explanation_correct: string;
        explanation_incorrect: Record<string, string>;
        strategy_tip: string;
      }
    >
  >({});
  const [explanationLoading, setExplanationLoading] = useState<Record<number, boolean>>({});
  const [explanationError, setExplanationError] = useState<Record<number, string>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  // Timer is hidden by default. Once the user toggles, we persist their choice.
  const [timerHidden, setTimerHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(TIMER_PREF_KEY);
    if (stored === "show") setTimerHidden(false);
    else if (stored === "hide") setTimerHidden(true);
    // Default (no stored preference) keeps timer hidden.
  }, []);

  const handleToggleTimerVisibility = () => {
    setTimerHidden((prev) => {
      const next = !prev;
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(TIMER_PREF_KEY, next ? "hide" : "show");
        }
      } catch {
        // ignore
      }
      return next;
    });
  };
  const [splitLeftPct, setSplitLeftPct] = useState(50);
  const splitContainerRef = React.useRef<HTMLDivElement | null>(null);
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
    if (!practiceSet || showResults || timerPaused) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [practiceSet, showResults, timerPaused]);

  const isTestActive = Boolean(practiceSet) && !showResults;

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isTestActive) {
      document.body.setAttribute("data-hide-nav", "true");
    } else {
      document.body.removeAttribute("data-hide-nav");
    }
    return () => {
      document.body.removeAttribute("data-hide-nav");
    };
  }, [isTestActive]);

  const applyResumeSnapshot = (parsed: PracticeProgressSnapshot) => {
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
    setUserConfidence(parsed.userConfidence || {});
    setTargetQuestionCount(parsed.targetQuestionCount || parsed.config?.questionCount || 5);
    setShowConfig(false);
    setPendingResume(null);
    setBatchLoadError(null);
    setBatchFailureDismissed(false);
  };

  const handleStartFresh = () => {
    localStorage.removeItem(PRACTICE_PROGRESS_KEY);
    setPendingResume(null);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRACTICE_PROGRESS_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as PracticeProgressSnapshot;
      if (!parsed || !parsed.practiceSet || !parsed.testType) return;
      if (parsed.showResults) {
        localStorage.removeItem(PRACTICE_PROGRESS_KEY);
        return;
      }
      setPendingResume(parsed);
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
        if (!pendingResume) {
          localStorage.removeItem(PRACTICE_PROGRESS_KEY);
        }
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
        userConfidence,
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
    userConfidence,
    targetQuestionCount,
    practiceHydrated,
    pendingResume,
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
          const error = new Error(message) as Error & {
            shouldRetry?: boolean;
            isPremiumGate?: boolean;
          };
          error.shouldRetry = shouldRetry;
          error.isPremiumGate = isPremiumGateError(res.status, message);
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

  const loadProgressiveBatchRef = React.useRef<() => Promise<boolean>>(async () => false);

  loadProgressiveBatchRef.current = async (): Promise<boolean> => {
    if (!practiceSet || !testType || !currentTestIdRef.current) return false;
    const remaining = targetQuestionCount - practiceSet.questions.length;
    if (remaining <= 0) return true;

    batchLoadingRef.current = true;
    setIsBatchLoading(true);
    setBatchLoadError(null);

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
      return true;
    } catch (e) {
      const isGate =
        e instanceof Error &&
        "isPremiumGate" in e &&
        Boolean((e as Error & { isPremiumGate?: boolean }).isPremiumGate);
      if (isGate) {
        setShowPremiumGateModal(true);
        setAccessStatus((prev) =>
          prev ? { ...prev, allowed: false } : { allowed: false, isPremium: false }
        );
        return false;
      }
      const m = e instanceof Error ? e.message : "";
      setBatchLoadError(
        m && m !== "practice_request_failed" ? m : BATCH_RETRY_MESSAGE
      );
      return false;
    } finally {
      batchLoadingRef.current = false;
      setIsBatchLoading(false);
    }
  };

  const retryBatchLoad = () => {
    setBatchFailureDismissed(false);
    setBatchLoadError(null);
    void loadProgressiveBatchRef.current();
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

    // Check free tier limit (server-authoritative)
    if (accessStatus && !accessStatus.isPremium && !accessStatus.allowed) {
      setShowPremiumGateModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setBatchLoadError(null);
    setBatchFailureDismissed(false);
    setPendingResume(null);
    setPracticeSet(null);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResults(false);
    setScore(0);
    setUserAnswers({});
    setUserConfidence({});
    setShowConfig(false);
    setTargetQuestionCount(selectedConfig.questionCount);
    setSelectedReviewIndex(null);
    setTrailBuddyQuestion("");
    setTrailBuddyReply("");
    setTrailBuddyError(null);
    setTrailBuddyStepMode(false);
    setReviewExplanationOpen(false);
    setExplanationCache({});
    setExplanationLoading({});
    setExplanationError({});
    setElapsedSeconds(0);
    setTimerPaused(false);
    setTimerHidden(false);
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

      if (!accessStatus?.isPremium) {
        try {
          const statusRes = await fetch("/api/user/access-status");
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setAccessStatus({
              allowed: Boolean(statusData.allowed),
              isPremium: Boolean(statusData.isPremium),
            });
          }
        } catch {
          // ignore refresh errors
        }
      }
    } catch (err) {
      const isGate =
        err instanceof Error &&
        "isPremiumGate" in err &&
        Boolean((err as Error & { isPremiumGate?: boolean }).isPremiumGate);
      if (isGate) {
        setShowPremiumGateModal(true);
        setAccessStatus((prev) =>
          prev ? { ...prev, allowed: false } : { allowed: false, isPremium: false }
        );
        setShowConfig(true);
        return;
      }
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
    const section =
      sectionParam === "math"
        ? "math"
        : sectionParam === "reading-writing" || sectionParam === "reading" || sectionParam === "writing"
          ? "reading-writing"
          : null;
    if (!section) return;

    const parsedConfig: TestConfig = {
      questionCount: Math.max(5, Math.min(25, parseInt(params.get("questions") || "10", 10) || 10)),
      topic: params.get("topic") || "",
      difficulty: (params.get("difficulty") as TestConfig["difficulty"]) || "Mixed",
    };
    window.history.replaceState({}, "", "/practice");
    void generateTest({ section, config: parsedConfig });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!isProgressiveMode || !practiceSet || !currentTestIdRef.current || !testType) return;
    if (batchFailureDismissed) return;
    const loaded = practiceSet.questions.length;
    const remaining = targetQuestionCount - loaded;
    const questionsLeftInLoadedBatch = loaded - (currentQuestion + 1);

    // Start with 1-2 questions, then keep a buffer ahead in background.
    if (remaining > 0 && questionsLeftInLoadedBatch <= 2 && !batchLoadingRef.current) {
      void loadProgressiveBatchRef.current();
    }
  }, [
    isProgressiveMode,
    practiceSet,
    currentQuestion,
    targetQuestionCount,
    config.topic,
    config.difficulty,
    testType,
    batchFailureDismissed,
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
      if (
        isProgressiveMode &&
        practiceSet.questions.length < targetQuestionCount &&
        !batchFailureDismissed
      ) {
        if (!batchLoadingRef.current) {
          const ok = await loadProgressiveBatchRef.current();
          if (ok) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedAnswer(userAnswers[currentQuestion + 1] || null);
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

    // Retention hooks: count this completion toward the practice streak and
    // weekly goal. Both are localStorage-only and idempotent within a day.
    try {
      recordPracticeDay();
      recordWeeklyPractice();
    } catch (retentionError) {
      console.warn("Failed to record retention metrics:", retentionError);
    }

    // Persist per-question confidence so the results review can use it later
    // (e.g. "trust your gut" panel showing how Unsure vs Got it scored).
    try {
      if (typeof window !== "undefined" && currentTestId && Object.keys(userConfidence).length > 0) {
        window.localStorage.setItem(
          `${CONFIDENCE_PREFIX}${currentTestId}`,
          JSON.stringify(userConfidence)
        );
      }
    } catch (confErr) {
      console.warn("Failed to persist confidence:", confErr);
    }

    // Calculate SAT score
    if (testType) {
      const sectionScore = calculateSectionScore(testType, correct, questions.length);
      setSatScore(sectionScore);
      
      const saveScoreLocally = () => {
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
      };

      // Save score to backend if we have a test ID
      if (currentTestId) {
        try {
          const response = await fetch(`/api/practice-tests/${currentTestId}/score`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scaledScore: sectionScore.scaled,
              rawScore: correct,
              maxRawScore: questions.length,
              answers: questions.map((_, idx) => userAnswers[idx] ?? null),
            }),
          });
          if (!response.ok) {
            throw new Error(`Score save failed with status ${response.status}`);
          }
        } catch (error) {
          console.error("Failed to save score to backend:", error);
          // Fallback to localStorage for anonymous users or on error
          saveScoreLocally();
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
    setUserConfidence({});
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
    setExplanationCache({});
    setExplanationLoading({});
    setExplanationError({});
    setElapsedSeconds(0);
    setTimerPaused(false);
    setTimerHidden(false);
    setBatchLoadError(null);
    setBatchFailureDismissed(false);
    setPendingResume(null);
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
    { type: "reading-writing" as SectionType, title: "Reading & Writing Trail", desc: "Comprehension, rhetoric, grammar, and expression checkpoints — one combined section, just like the Digital SAT.", icon: "reading" as const },
  ];

  const getSubjectThemeClass = (type: SectionType) => {
    if (type === "math") return "subject-theme-math";
    return "subject-theme-reading-writing";
  };

  const getSectionLabel = (type: SectionType | null) => {
    if (!type) return "";
    return type === "math" ? "Math" : "Reading & Writing";
  };

  return (
    <div className="px-3 sm:px-4 md:px-6 pb-6 sm:pb-8 md:pb-10 max-w-6xl mx-auto overflow-x-hidden w-full">
      {!showConfig && !loading && !practiceSet && (
        <PageHeader
          eyebrow="Practice Tests"
          title="Test your progress along the trail."
          subtitle="Select a trail section, configure your checkpoint, and get instant feedback on your climb."
        />
      )}

      {accessStatus && !accessStatus.isPremium && (
        <div className="premium-banner mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                {accessStatus.allowed ? "Free Starter: 1 checkpoint remaining" : "Free Starter Used"}
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

      <PremiumGateModal
        open={showPremiumGateModal}
        onClose={() => setShowPremiumGateModal(false)}
      />

      {pendingResume && !practiceSet && !loading && (
        <div
          className="mb-6 px-4 py-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          role="status"
        >
          <p className="text-sm text-sky-900 dark:text-sky-100 font-medium">
            You have an unfinished practice test. Resume it?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyResumeSnapshot(pendingResume)}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={handleStartFresh}
              className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 text-sky-900 dark:text-sky-100 text-sm font-semibold hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors"
            >
              Start fresh
            </button>
          </div>
        </div>
      )}

      {loading && !practiceSet && targetQuestionCount > 0 && (
        <div
          className="mb-6 px-4 py-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center gap-3"
          role="status"
          aria-live="polite"
        >
          <div
            className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0"
            aria-hidden
          />
          <p className="text-sm text-sky-900 dark:text-sky-100 font-medium">
            Generating your questions... (0 of {targetQuestionCount} ready)
          </p>
        </div>
      )}

      {!testType && (
        <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
          {sectionCards.map((card, idx) => (
            <button
              key={card.type}
              onClick={() => handleSectionSelect(card.type)}
              className="text-left h-full flex flex-col"
            >
              <GlassPanel delay={idx * 0.05} className={`h-full feature-themed-card ${getSubjectThemeClass(card.type)}`}>
                <div className="flex flex-col gap-2 h-full">
                  <div className="feature-icon-shell w-10 h-10 flex items-center justify-center rounded-2xl">
                    <FeatureIcon name={card.icon} size={24} />
                  </div>
                  <h3 className="feature-title text-lg font-semibold">{card.title}</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{card.desc}</p>
                  <span className="feature-kicker text-xs uppercase tracking-[0.4em] mt-auto pt-2 font-semibold inline-flex items-center">
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
                Configure your {getSectionLabel(testType)} Trail Checkpoint
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
              <label
                htmlFor="practice-specific-topic"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3"
              >
                Specific topic <span className="text-slate-600 dark:text-slate-400">(optional)</span>
              </label>
              <div className="mb-3">
                <TopicConfigSelect
                  id="practice-specific-topic"
                  topics={sectionTopics}
                  value={config.topic || ""}
                  onChange={(topic) => setConfig({ ...config, topic })}
                />
              </div>
              <input
                type="text"
                value={config.topic}
                onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                placeholder={
                  testType === "math"
                    ? "e.g., Systems of Equations, Ratios & Rates, Trigonometry"
                    : "e.g., Words in Context, Transitions, Sentence Boundaries"
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
        return (
          <GlassPanel className="mt-8 ai-output-scope sat-practice-shell !p-0 overflow-hidden">
            <div className="p-4 sm:p-6 space-y-5">
              {/* New motivating results header — headline, weak-skill spotlight,
                  score trend, performance band, what-to-do-next CTAs. */}
              {testType && (
                <PracticeResultsHeader
                  testType={testType}
                  correct={score}
                  total={practiceSet.questions.length}
                  scaledScore={satScore?.scaled ?? null}
                  skillStats={skillStats}
                  topic={config.topic}
                />
              )}

              {/* Question review */}
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400 font-semibold mb-4">Review your answers</p>
                {(() => {
                  const firstIncorrect = practiceSet.questions.findIndex((q, idx) => userAnswers[idx] !== q.correctAnswer);
                  const activeIdxRaw = selectedReviewIndex ?? (firstIncorrect >= 0 ? firstIncorrect : 0);
                  const activeIdx = Math.max(0, Math.min(activeIdxRaw, practiceSet.questions.length - 1));
                  const activeQuestion = practiceSet.questions[activeIdx];
                  const activeIsCorrect = userAnswers[activeIdx] === activeQuestion.correctAnswer;
                  const activeUserAnswer = userAnswers[activeIdx];
                  const activePassage = (activeQuestion as any)?.passage || practiceSet.passage;
                  const cachedExplanation = explanationCache[activeIdx];
                  const liveExplanationCorrect =
                    cachedExplanation?.explanation_correct ||
                    activeQuestion.explanation_correct ||
                    activeQuestion.explanation ||
                    "";
                  const liveExplanationIncorrect =
                    cachedExplanation?.explanation_incorrect ||
                    activeQuestion.explanation_incorrect ||
                    {};
                  const liveStrategyTip =
                    cachedExplanation?.strategy_tip || activeQuestion.strategy_tip || "";
                  const isExplanationLoading = Boolean(explanationLoading[activeIdx]);
                  const explanationFetchError = explanationError[activeIdx];
                  const hasLoadedExplanation = Boolean(liveExplanationCorrect);
                  const getOptionText = (letter?: string) => {
                    if (!letter) return "-";
                    const normalized = letter.toUpperCase() as OptionLetter;
                    return activeQuestion.options?.[normalized] || letter;
                  };
                  const activeUserAnswerText = activeUserAnswer ? getOptionText(activeUserAnswer) : "-";
                  const activeCorrectAnswerText = getOptionText(activeQuestion.correctAnswer);

                  const ensureExplanation = async () => {
                    if (hasLoadedExplanation || isExplanationLoading) return;
                    setExplanationError((prev) => {
                      const next = { ...prev };
                      delete next[activeIdx];
                      return next;
                    });
                    setExplanationLoading((prev) => ({ ...prev, [activeIdx]: true }));
                    try {
                      const res = await fetch("/api/explain-question", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          testType: testType || "math",
                          question: activeQuestion.question,
                          passage: activePassage ? String(activePassage) : undefined,
                          options: activeQuestion.options,
                          correctAnswer: activeQuestion.correctAnswer,
                          userAnswer: activeUserAnswer || null,
                          skillFocus: activeQuestion.skillFocus,
                          difficulty: activeQuestion.difficulty,
                        }),
                      });
                      if (!res.ok) {
                        throw new Error("explanation_failed");
                      }
                      const data = await res.json();
                      setExplanationCache((prev) => ({
                        ...prev,
                        [activeIdx]: {
                          explanation_correct: String(data.explanation_correct || ""),
                          explanation_incorrect: (data.explanation_incorrect || {}) as Record<string, string>,
                          strategy_tip: String(data.strategy_tip || ""),
                        },
                      }));
                    } catch {
                      setExplanationError((prev) => ({
                        ...prev,
                        [activeIdx]: "We couldn't load the explanation right now. Try again.",
                      }));
                    } finally {
                      setExplanationLoading((prev) => {
                        const next = { ...prev };
                        delete next[activeIdx];
                        return next;
                      });
                    }
                  };

                  const handleToggleExplanation = () => {
                    setReviewExplanationOpen((prev) => {
                      const next = !prev;
                      if (next) void ensureExplanation();
                      return next;
                    });
                  };

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
                              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                                {String(activePassage)}
                              </p>
                          </div>
                        )}

                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{activeQuestion.question}</p>

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

                        <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 p-3">
                          <button
                            type="button"
                            onClick={handleToggleExplanation}
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
                            {isExplanationLoading && !hasLoadedExplanation && (
                              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-2">
                                <span className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" aria-hidden />
                                Generating explanation...
                              </div>
                            )}
                            {explanationFetchError && !hasLoadedExplanation && (
                              <div className="flex flex-col gap-2 py-1">
                                <p className="text-sm text-rose-600 dark:text-rose-400">{explanationFetchError}</p>
                                <button
                                  type="button"
                                  onClick={() => void ensureExplanation()}
                                  className="self-start text-xs font-semibold text-sky-700 dark:text-sky-300 hover:underline"
                                >
                                  Try again
                                </button>
                              </div>
                            )}
                            {hasLoadedExplanation && (
                              <>
                                {renderFormattedText(liveExplanationCorrect)}
                                {liveExplanationIncorrect && Object.keys(liveExplanationIncorrect).length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {Object.entries(liveExplanationIncorrect).map(([letter, reason]) => (
                                      <div key={letter} className="text-sm text-slate-600 dark:text-slate-400">
                                        <span className="font-semibold text-red-600 dark:text-red-400">Option {letter} ({getOptionText(letter)}):</span>{" "}
                                        {renderFormattedText(reason)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {liveStrategyTip && (
                                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <p className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide mb-1">Strategy Tip</p>
                                    {renderFormattedText(liveStrategyTip)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

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
        const subjectLabel = testType === "math" ? "Math" : "Reading & Writing";
        const nextLabel = currentQuestion === practiceSet.questions.length - 1
          ? (isProgressiveMode && practiceSet.questions.length < targetQuestionCount && !batchFailureDismissed
              ? "Load Next 5"
              : "Finish")
          : "Next";
        const answeredIndices = new Set<number>(
          Object.keys(userAnswers).map((key) => Number(key)).filter((n) => !Number.isNaN(n))
        );
        const showMathSplit = testType === "math" && showCalculator;
        const useSplitLayout = hasPassage || showMathSplit;

        const handleJumpTo = (index: number) => {
          if (!practiceSet || index < 0 || index >= practiceSet.questions.length) return;
          setCurrentQuestion(index);
          setSelectedAnswer(userAnswers[index] || null);
        };

        const handleDividerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
          event.preventDefault();
          const container = splitContainerRef.current;
          if (!container) return;
          const target = event.currentTarget;
          try { target.setPointerCapture(event.pointerId); } catch { /* noop */ }

          const onMove = (moveEvent: PointerEvent) => {
            const rect = container.getBoundingClientRect();
            if (rect.width <= 0) return;
            const relative = moveEvent.clientX - rect.left;
            const pct = (relative / rect.width) * 100;
            const clamped = Math.max(25, Math.min(75, pct));
            setSplitLeftPct(clamped);
          };
          const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            try { target.releasePointerCapture(event.pointerId); } catch { /* noop */ }
          };
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
        };

        return (
          <div className="pb-test-fullscreen">
            <div className="pb-test-inner">
              <>
                  {isProgressiveMode && (() => {
                    const loadedCount = practiceSet.questions.length;
                    const showFailed =
                      Boolean(batchLoadError) &&
                      loadedCount < targetQuestionCount &&
                      !batchFailureDismissed;
                    const showLoading =
                      loadedCount < targetQuestionCount && isBatchLoading && !showFailed;

                    if (showFailed) {
                      return (
                        <div
                          className="mx-4 mt-3 mb-1 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                          role="alert"
                        >
                          <p className="text-sm text-rose-900 dark:text-rose-100 font-medium">
                            Some questions couldn&apos;t load. You can continue with {loadedCount}{" "}
                            questions or retry.
                          </p>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setBatchFailureDismissed(true)}
                              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-700 text-rose-900 dark:text-rose-100 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              Continue anyway
                            </button>
                            <button
                              type="button"
                              onClick={retryBatchLoad}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors"
                            >
                              Retry loading
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (showLoading) {
                      return (
                        <div
                          className="mx-4 mt-3 mb-1 px-4 py-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center gap-3"
                          role="status"
                          aria-live="polite"
                        >
                          <div
                            className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0"
                            aria-hidden
                          />
                          <p className="text-sm text-sky-900 dark:text-sky-100 font-medium">
                            Generating your questions... ({loadedCount} of {targetQuestionCount}{" "}
                            ready)
                          </p>
                        </div>
                      );
                    }

                    return null;
                  })()}

                  <PracticeTopBar
                    elapsedSeconds={elapsedSeconds}
                    timerPaused={timerPaused}
                    timerHidden={timerHidden}
                    onTogglePause={() => setTimerPaused((prev) => !prev)}
                    onToggleHide={handleToggleTimerVisibility}
                    onGoBack={() => {
                      if (typeof window !== "undefined" && window.confirm("Exit this test? Your progress will be cleared.")) {
                        resetTest();
                      }
                    }}
                    testType={testType}
                    showCalculator={showCalculator}
                    onToggleCalculator={
                      testType === "math" ? () => setShowCalculator((prev) => !prev) : undefined
                    }
                  />

                  <div className="pb-test-body">
                    {practiceSet.warning && (
                      <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-200 font-medium">
                        {practiceSet.warning}
                      </div>
                    )}

                    {useSplitLayout ? (
                      <div className="pb-split-layout" ref={splitContainerRef}>
                        <div className="pb-split-left" style={{ width: `${splitLeftPct}%` }}>
                          {showMathSplit ? (
                            <PracticeCalculatorPanel />
                          ) : (
                            <div className="sat-passage rounded-lg md:rounded-none bg-slate-50 dark:bg-slate-800/40 md:bg-transparent md:dark:bg-transparent p-4 md:p-0">
                                <p className="sat-passage-text whitespace-pre-line">
                                  {passageText}
                                </p>
                            </div>
                          )}
                        </div>
                        <div
                          className="pb-split-divider-handle"
                          role="separator"
                          aria-orientation="vertical"
                          aria-label="Drag to resize panels"
                          onPointerDown={handleDividerPointerDown}
                        >
                          <span className="pb-split-divider-grip" aria-hidden />
                        </div>
                        <div
                          className="pb-split-right"
                          style={{ width: `${100 - splitLeftPct}%` }}
                        >
                          <div className="pb-question-chrome">
                            <span className="pb-question-tile" aria-label={`Question ${currentQuestion + 1}`}>
                              {currentQuestion + 1}
                            </span>
                          </div>

                          {q.graphData && (
                            <QuestionChart data={q.graphData as QuestionGraphData} />
                          )}
                          {testType === "math" && q.desmosExpression && !showMathSplit && (
                            <DesmosGraph expressions={[q.desmosExpression as string]} />
                          )}

                          <p className="sat-question-text mb-5 leading-relaxed">
                            {q.question}
                          </p>

                          <ConfidenceRow
                            value={userConfidence[currentQuestion]}
                            onChange={(c) =>
                              setUserConfidence((prev) => ({ ...prev, [currentQuestion]: c }))
                            }
                          />

                          <div className="space-y-2.5 mb-2">
                            {(Object.keys(q.options) as OptionLetter[]).map((optionLetter) => {
                              const isSelected = selectedAnswer === optionLetter;
                              return (
                                <button
                                  key={optionLetter}
                                  onClick={() => handleAnswerSelect(optionLetter)}
                                  className={`sat-option w-full text-left flex items-center gap-3 ${
                                    isSelected ? "sat-option-selected" : "sat-option-unselected"
                                  }`}
                                >
                                  <span className="sat-option-letter shrink-0">{optionLetter}</span>
                                  <span>{q.options[optionLetter]}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="pb-question-chrome">
                          <span className="pb-question-tile" aria-label={`Question ${currentQuestion + 1}`}>
                            {currentQuestion + 1}
                          </span>
                        </div>

                        {q.graphData && (
                          <QuestionChart data={q.graphData as QuestionGraphData} />
                        )}
                        {testType === "math" && q.desmosExpression && (
                          <DesmosGraph expressions={[q.desmosExpression as string]} />
                        )}

                        <p className="sat-question-text mb-5 leading-relaxed">
                          {q.question}
                        </p>

                        <ConfidenceRow
                          value={userConfidence[currentQuestion]}
                          onChange={(c) =>
                            setUserConfidence((prev) => ({ ...prev, [currentQuestion]: c }))
                          }
                        />

                        <div className="space-y-2.5 mb-2">
                          {(Object.keys(q.options) as OptionLetter[]).map((optionLetter) => {
                            const isSelected = selectedAnswer === optionLetter;
                            return (
                              <button
                                key={optionLetter}
                                onClick={() => handleAnswerSelect(optionLetter)}
                                className={`sat-option w-full text-left flex items-center gap-3 ${
                                  isSelected ? "sat-option-selected" : "sat-option-unselected"
                                }`}
                              >
                                <span className="sat-option-letter shrink-0">{optionLetter}</span>
                                <span>{q.options[optionLetter]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <PracticeBottomBar
                    currentIndex={currentQuestion}
                    totalQuestions={totalQ}
                    answeredIndices={answeredIndices}
                    onJumpTo={handleJumpTo}
                    onPrevious={handlePrevious}
                    onNext={() => void handleNext()}
                    canGoPrevious={currentQuestion > 0}
                    isLastQuestion={currentQuestion === practiceSet.questions.length - 1}
                    nextLabel={nextLabel}
                    questionInfo={{
                      difficulty: q.difficulty,
                      skillFocus: q.skillFocus,
                      subjectLabel,
                    }}
                  />
              </>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
