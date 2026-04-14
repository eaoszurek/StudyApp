/**
 * Heuristic checks that a question's stem (and optional passage) plausibly matches
 * a locked Easy / Medium / Hard practice config. Complements model-reported difficulty tags.
 */

export type LockedDifficulty = "Easy" | "Medium" | "Hard";

function hasMathHardSignal(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\b(system of|two equations|inequalit|quadratic|nonlinear|parabol|vertex form|piecewise|composition|f\(g\(|g\(f\(|for all real|exactly one solution|infinitely many|no solution|constant k|maximum value|minimum value|greatest|least possible|expected value|standard deviation|margin of error|confidence|compound interest|exponential growth|logarithm|sin\(|cos\(|tan\(|radian|unit circle)\b/.test(
      t
    ) ||
    /\b(shown in the figure|in the diagram|coordinate plane|regular polygon)\b/.test(t) ||
    (text.match(/=/g) || []).length >= 2 ||
    /\bif\s+.+\s+,\s+then\b/i.test(text) ||
    /\bwhich of the following must be true\b/i.test(t)
  );
}

/** Very short stems that look like one-step linear plug-in (too weak for Hard). */
function looksLikeTrivialOneStepLinear(text: string): boolean {
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

function mathAligns(stem: string, locked: LockedDifficulty): boolean {
  const t = stem.replace(/\s+/g, " ").trim();
  const len = t.length;
  const hasTwoStepSignal = /\b(system|quadratic|function|graph|table|probability|ratio|inequalit|triangle|percent)\b/i.test(t);

  if (locked === "Easy") {
    if (len > 260) return false;
    if (
      /\b(must be true for all|for every real number|least possible value of|greatest possible value of|exactly how many integers|none of the following|infinitely many solutions)\b/i.test(
        t
      )
    ) {
      return false;
    }
    if (hasMathHardSignal(t) || hasTwoStepSignal) return false;
    return true;
  }

  if (locked === "Hard") {
    if (looksLikeTrivialOneStepLinear(t)) return false;
    if (len < 50 && !hasMathHardSignal(t)) return false;
    if (len < 85 && !hasMathHardSignal(t)) return false;
    return true;
  }

  // Medium — reject obvious one-liners; allow shorter geometry/function stems
  if (looksLikeTrivialOneStepLinear(t) && len < 120) return false;
  if (len > 280 && !hasMathHardSignal(t)) return false;
  if (hasMathHardSignal(t)) return true;
  return len >= 55;
}

function rwAligns(question: string, passage: string, locked: LockedDifficulty): boolean {
  const combined = [passage, question].filter(Boolean).join("\n").trim();
  const len = combined.length;
  const q = question.trim();

  if (!q) return false;

  if (locked === "Hard") {
    if (len < 160) return false;
    const inferential =
      /\b(infer|implies|suggests|most strongly|best supports|would most likely|author's claim|contradict|undermine)\b/i.test(
        q
      );
    if (!inferential && !/\b(author|tone|purpose|logic|evidence|revis(e|ion)|concision|syntax)\b/i.test(q)) return false;
    return true;
  }

  if (locked === "Easy") {
    if (len > 1100) return false;
    if (/\b(according to both passages|author 1|author 2|compared to the previous paragraph)\b/i.test(q)) {
      return false;
    }
    if (/\b(infer|implies|most strongly|would most likely|undermine|counterargument)\b/i.test(q)) {
      return false;
    }
    return len <= 650;
  }

  // Medium
  return len >= 80 && len <= 1500;
}

export function questionAlignsWithLockedDifficulty(params: {
  question: string;
  passage?: string | null;
  section: "math" | "reading" | "writing";
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
