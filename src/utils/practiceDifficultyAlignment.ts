/**
 * Heuristic checks that a question's stem (and optional passage) plausibly matches
 * a locked Easy / Medium / Hard practice config. Complements model-reported difficulty tags.
 *
 * Rubric (from product spec):
 *
 * MATH
 *   Easy   — single operation, whole-number answer, no setup required.
 *   Medium — 2-3 steps, requires writing/solving an equation, may involve
 *            fractions or negatives.
 *   Hard   — multi-step, connects two concepts, abstract setup, non-obvious
 *            answer, distractors target predictable mistakes.
 *
 * READING & WRITING
 *   Easy   — answer is directly stated in the passage; no inference.
 *   Medium — combine two pieces of passage info or understand tone/purpose.
 *   Hard   — distinguish between two close options; complex syntax or advanced
 *            vocabulary; distractors exploit common misreadings.
 */

export type LockedDifficulty = "Easy" | "Medium" | "Hard";

function hasMathHardSignal(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\b(system of|two equations|inequalit|quadratic|parabol|vertex form|piecewise|composition|f\(g\(|g\(f\(|for all real|exactly one solution|infinitely many|no solution|constant k|maximum value|minimum value|greatest|least possible|expected value|standard deviation|margin of error|confidence|compound interest|exponential growth|logarithm|sin\(|cos\(|tan\(|radian|unit circle|discriminant|factored form|completing the square)\b/.test(
      t
    ) ||
    /x²|x³|x\^2|x\^3/.test(text) ||
    /\b(shown in the figure|in the diagram|coordinate plane|regular polygon)\b/.test(t) ||
    (text.match(/=/g) || []).length >= 2 ||
    /\bif\s+.+\s+,\s+then\b/i.test(text) ||
    /\bwhich of the following must be true\b/i.test(t)
  );
}

/**
 * Heuristic estimate of how many discrete steps a math question requires
 * (write equation → manipulate → solve, etc.). Short clean prompts with
 * one operation report 1; multi-equation or multi-clause prompts report 2+.
 */
function estimateMathSteps(text: string): number {
  const t = text.replace(/\s+/g, " ").trim();
  let steps = 0;
  const equationCount = (t.match(/=/g) || []).length;
  steps += Math.min(2, equationCount);
  if (/\bif\b.+\bthen\b/i.test(t)) steps += 1;
  if (/\b(then|next|after|finally|use the result|substitute)\b/i.test(t)) steps += 1;
  if (/\b(system|two equations|simultaneously)\b/i.test(t)) steps += 1;
  if (/\b(quadratic|parabola|vertex|factor|discriminant)\b/i.test(t)) steps += 1;
  if (/\b(percent|percentage|interest|tax)\b/i.test(t) && /\b(of|increase|decrease|change)\b/i.test(t)) {
    steps += 1;
  }
  if (steps === 0) {
    steps = t.length > 140 ? 2 : 1;
  }
  return steps;
}

/** Very short stems that look like one-step linear plug-in (too weak for Hard). */
export function looksLikeTrivialOneStepLinear(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length > 165) return false;
  const hasSimpleEq =
    /\d*\s*[xyz]\s*[\+\-]\s*\d+\s*=\s*\d+/i.test(t) ||
    /\d+\s*[xyz]\s*=\s*\d+/i.test(t);
  const shortSolve =
    /\b(what is the value of|which value of|solve for|find)\s+[xyz]\b/i.test(t) && t.length < 130;
  if (hasSimpleEq && t.length < 135 && !/\band\b.*\b(value|equation)\b|\btwo\b|\bfunction f\b|\bsystem\b|\bgraph\b/i.test(t)) {
    return true;
  }
  if (shortSolve && /\b=\s*\d+/.test(t)) return true;
  return false;
}

/**
 * Easy math = a single direct operation on whole numbers. We reject if the
 * question implies multiple sub-steps, fractions/negatives, or hidden setup.
 */
function looksLikeEasyMath(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length > 220) return false;
  if (estimateMathSteps(t) > 1) return false;
  if (hasMathHardSignal(t)) return false;
  if (/\b(fraction|fractional|negative|integer|absolute value)\b/i.test(t)) {
    // Fractions/negatives push toward Medium per the rubric; reject as Easy.
    return false;
  }
  return true;
}

function mathAligns(stem: string, locked: LockedDifficulty): boolean {
  const t = stem.replace(/\s+/g, " ").trim();
  const len = t.length;
  const steps = estimateMathSteps(t);
  const hasHardSignal = hasMathHardSignal(t);

  if (locked === "Easy") {
    if (len > 220) return false;
    if (
      /\b(must be true for all|for every real number|least possible value of|greatest possible value of|exactly how many integers|none of the following|infinitely many solutions)\b/i.test(
        t
      )
    ) {
      return false;
    }
    if (hasHardSignal) return false;
    if (steps > 1) return false;
    return looksLikeEasyMath(t);
  }

  if (locked === "Hard") {
    if (looksLikeTrivialOneStepLinear(t)) return false;
    // Quadratic / parabola items are valid Hard even when the stem is concise.
    if (/\b(quadratic|parabola|vertex|discriminant|x²|x\^2|factored)\b/i.test(t)) return true;
    if (len < 50 && !hasHardSignal) return false;
    if (len < 85 && !hasHardSignal) return false;
    if (steps < 2 && !hasHardSignal) return false;
    return true;
  }

  // Medium — 2-3 steps, equation setup or fractions/negatives. Reject pure one-liners
  // and reject obvious Hard signatures (those should be filtered to Hard items only).
  if (looksLikeTrivialOneStepLinear(t) && len < 120) return false;
  if (len > 280 && !hasHardSignal) return false;
  if (hasHardSignal) return true;
  if (steps < 2 && len < 110) return false;
  return len >= 55;
}

function rwAligns(question: string, passage: string, locked: LockedDifficulty): boolean {
  const passageText = String(passage || "").trim();
  const combined = [passageText, question].filter(Boolean).join("\n").trim();
  const len = combined.length;
  const q = question.trim();
  const passageWords = passageText ? passageText.split(/\s+/).filter(Boolean).length : 0;

  if (!q) return false;

  if (locked === "Hard") {
    if (len < 160) return false;
    const inferential =
      /\b(infer|implies|suggests|most strongly|best supports|would most likely|author's claim|contradict|undermine|nuance|tension|paradox)\b/i.test(
        q
      );
    const closeOptions = /\b(most precisely|most logically|most directly|best supports the claim)\b/i.test(q);
    const advancedSignals = /\b(author|tone|purpose|logic|evidence|revis(e|ion)|concision|syntax|structure)\b/i.test(q);
    if (!inferential && !advancedSignals && !closeOptions) return false;
    if (passageText && passageWords < 60) return false;
    return true;
  }

  if (locked === "Easy") {
    if (len > 1100) return false;
    if (/\b(according to both passages|author 1|author 2|compared to the previous paragraph)\b/i.test(q)) {
      return false;
    }
    if (/\b(infer|implies|most strongly|would most likely|undermine|counterargument|nuance|tension)\b/i.test(q)) {
      return false;
    }
    return len <= 650;
  }

  // Medium — combining info, tone/purpose, or moderate inference; reject pure recall.
  return len >= 80 && len <= 1500;
}

export function questionAlignsWithLockedDifficulty(params: {
  question: string;
  passage?: string | null;
  section: "math" | "reading" | "writing" | "reading-writing";
  locked: LockedDifficulty;
}): boolean {
  const { question, passage, section, locked } = params;
  const stem = String(question || "").trim();
  if (!stem) return false;

  if (section === "math") {
    return mathAligns(stem, locked);
  }

  return rwAligns(stem, String(passage || "").trim(), locked);
}
