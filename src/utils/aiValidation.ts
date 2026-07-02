/**
 * AI Response Validation and Cleaning Utilities
 * Ensures AI-generated content meets quality standards
 */

/**
 * Truncate to at most maxWords words.
 */
function truncateWords(text: string, maxWords: number): string {
  if (!text || maxWords < 1) return text || "";
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ");
}

/**
 * Validates question format
 */
export function validateQuestionFormat(question: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!question.question || typeof question.question !== "string" || question.question.trim().length === 0) {
    errors.push("Question text is required");
  } else if (question.question.length > 500) {
    errors.push(`Question text is too long (maximum 500 characters, found ${question.question.length})`);
  }

  if (!Array.isArray(question.options) || question.options.length !== 4) {
    errors.push("Options must be an array of exactly 4 items");
  } else {
    question.options.forEach((opt: any, idx: number) => {
      if (!opt || typeof opt !== "string" || opt.trim().length === 0) {
        errors.push(`Option ${idx + 1} is invalid`);
      } else if (opt.length > 200) {
        errors.push(`Option ${idx + 1} is too long (maximum 200 characters)`);
      }
    });
  }

  if (!question.correctAnswer || !["A", "B", "C", "D"].includes(question.correctAnswer)) {
    errors.push("Correct answer must be A, B, C, or D");
  }

  if (question.explanation_correct && typeof question.explanation_correct === "string") {
    // Increased from 300 to 500 to allow for detailed explanations
    if (question.explanation_correct.length > 500) {
      errors.push("Explanation is too long (maximum 500 characters)");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Cleans math notation - replaces ^ with superscripts
 */
export function cleanMathNotation(text: string): string {
  if (text === null || text === undefined) return "";
  if (typeof text !== "string") {
    if (typeof text === "number" || typeof text === "boolean") {
      text = String(text);
    } else {
      return "";
    }
  }

  // Replace x^2 with x², x^3 with x³, etc.
  const cleaned = text
    .replace(/\^(\d+)/g, (match, num) => {
      const superscripts: Record<string, string> = {
        "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
        "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹"
      };
      return num.split("").map((d: string) => superscripts[d] || d).join("");
    })
    // Fix common broken symbols
    .replace(/×/g, "×")
    .replace(/÷/g, "÷")
    .replace(/±/g, "±")
    .replace(/≤/g, "≤")
    .replace(/≥/g, "≥")
    .replace(/≠/g, "≠")
    .replace(/≈/g, "≈");

  return cleaned;
}

export function formatEquationLineBreaks(text: string): string {
  if (text === null || text === undefined) return "";
  if (typeof text !== "string") return "";

  let updated = text.replace(/\r\n/g, "\n");

  // Keep equation stems on one line when the model inserts accidental breaks
  // around operators (e.g., "3x +\n5 = 20").
  updated = updated
    .replace(/([+\-*/=≤≥≠<>])\s*\n+\s*/g, "$1 ")
    .replace(/\n+\s*([+\-*/=≤≥≠<>])/g, " $1")
    .replace(/\n{3,}/g, "\n\n");

  return updated.trim();
}

/**
 * Truncates text to maximum length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text === null || text === undefined) return "";
  if (typeof text !== "string") {
    if (typeof text === "number" || typeof text === "boolean") {
      text = String(text);
    } else {
      return "";
    }
  }
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Removes duplicate items based on a key function
 */
export function removeDuplicates<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return unique;
}

/**
 * Cleans text - removes extra whitespace, fixes line breaks
 */
export function cleanText(text: string): string {
  if (text === null || text === undefined) return "";
  if (typeof text !== "string") {
    if (typeof text === "number" || typeof text === "boolean") {
      text = String(text);
    } else {
      return "";
    }
  }

  return text
    .replace(/\s+/g, " ") // Multiple spaces to single space
    .replace(/\n\s*\n\s*\n/g, "\n\n") // Multiple line breaks to double
    .trim();
}

/**
 * Validates that all required fields are present in a response
 */
export function validateRequiredFields(obj: any, requiredFields: string[]): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === "") {
      missing.push(field);
    }
  }

  return { valid: missing.length === 0, missing };
}

export function ensureSingleSkill(skillCategory: string, fallback: string): string {
  if (!skillCategory || typeof skillCategory !== "string") return fallback;
  const normalized = skillCategory.trim();
  if (!normalized) return fallback;
  if (/[,&/]| and /i.test(normalized)) return fallback;
  return normalized;
}

export function applyBoldToMarkedTarget(text: string): { text: string; valid: boolean } {
  if (!text || typeof text !== "string") return { text, valid: false };
  if (text.includes("**")) {
    return { text: text.replace(/\*\*(.+?)\*\*/g, "[$1]"), valid: true };
  }
  const bracketMatch = text.match(/\[(.+?)\]/);
  if (bracketMatch) {
    return { text, valid: true };
  }
  const angleMatch = text.match(/<(.+?)>/);
  if (angleMatch) {
    return {
      text: text.replace(angleMatch[0], `[${angleMatch[1]}]`),
      valid: true,
    };
  }
  const underscoreMatch = text.match(/__(.+?)__/);
  if (underscoreMatch) {
    return {
      text: text.replace(underscoreMatch[0], `[${underscoreMatch[1]}]`),
      valid: true,
    };
  }
  return { text, valid: false };
}

export function ensureTaskDuration(task: string): string {
  if (!task || typeof task !== "string") return task;
  const hasDuration = /\b\d{1,2}\s?(?:-|–)?\s?\d{1,2}?\s?(?:min|mins|minutes)\b/i.test(task);
  if (hasDuration) return task;
  return `15–20 min: ${task}`;
}

export function ensureBoldEmphasis(text: string, keyword?: string): string {
  if (!text || typeof text !== "string") return text;
  if (text.includes("**")) return text;
  if (keyword && text.includes(keyword)) {
    return text.replace(keyword, `**${keyword}**`);
  }
  const words = text.split(/\s+/);
  if (words.length === 0) return text;
  words[0] = `**${words[0]}**`;
  return words.join(" ");
}

export function isPlaceholderOptionText(text: string): boolean {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/^[a-d][\)\.\:\-\s]+/i, "")
    .replace(/^[a-d]\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return ["text", "string", "option", "answer", "placeholder"].includes(normalized);
}

export function normalizeForSimilarity(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(text: string): Set<string> {
  const stopwords = new Set([
    "the",
    "a",
    "an",
    "of",
    "to",
    "and",
    "or",
    "in",
    "on",
    "for",
    "with",
    "is",
    "are",
    "was",
    "were",
    "be",
    "that",
    "which",
    "what",
    "from",
    "as",
    "by",
    "at",
    "it",
    "this",
    "these",
    "those",
  ]);
  return new Set(
    normalizeForSimilarity(text)
      .split(" ")
      .filter((w) => w.length >= 3 && !stopwords.has(w))
  );
}

export function jaccardSimilarity(a: string, b: string): number {
  const aSet = tokenSet(a);
  const bSet = tokenSet(b);
  if (aSet.size === 0 || bSet.size === 0) return 0;
  let intersection = 0;
  for (const token of aSet) {
    if (bSet.has(token)) intersection += 1;
  }
  const union = new Set([...aSet, ...bSet]).size;
  return union === 0 ? 0 : intersection / union;
}

export function areNearDuplicateQuestions(a: string, b: string, threshold = 0.82): boolean {
  const stripBoilerplate = (text: string) =>
    normalizeForSimilarity(text)
      .replace(/\bwhich choice\b/g, "choice")
      .replace(/\bbest (states|describes|maintains|supports|completes)\b/g, "")
      .replace(/\bas used in the text\b/g, "")
      .replace(/\bmost logically completes\b/g, "")
      .replace(/\bsentence pattern already established\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const normA = stripBoilerplate(a);
  const normB = stripBoilerplate(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) {
    const ratio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length);
    if (ratio >= 0.84) return true;
  }
  return jaccardSimilarity(normA, normB) >= threshold;
}

export function hasGenericSatStem(text: string): boolean {
  const t = normalizeForSimilarity(text);
  if (!t) return true;
  return (
    /\bwhich choice is best\b/.test(t) ||
    /\bwhich choice best\b/.test(t) ||
    /\bwhat is the best answer\b/.test(t) ||
    /\bselect the best answer\b/.test(t)
  );
}

/**
 * Canonical Digital SAT R&W question stems (paraphrased to match what the model
 * actually emits — exact-string matching is too strict because the model varies
 * minor wording). Used by `looksLikeSatStem` to confirm authentic stem style.
 */
const RW_CANONICAL_STEM_PATTERNS: RegExp[] = [
  /\bmost logical and precise word or phrase\b/i,
  /\bmost logically completes the text\b/i,
  /\bmain purpose of the text\b/i,
  /\boverall structure of the text\b/i,
  /\bfunction of the underlined sentence\b/i,
  /\bas used in the text,? what does the word\b/i,
  /\bsentence pattern already established\b/i,
  /\bmost logically connects (?:the|two) (?:two )?sentences\b/i,
  /\b(?:transition word or phrase|transition)\b.*\bconnects\b/i,
  /\bmost directly support(?:s)? the (?:claim|researcher's|author's)\b/i,
  /\bhow would (?:author 2|author 1|the second author|the first author)\b/i,
  /\bmost effectively uses relevant information from the notes\b/i,
];

const MATH_CANONICAL_STEM_PATTERNS: RegExp[] = [
  /\bwhat is the value of\b/i,
  /\bwhich (?:value|equation|expression|inequality|function|graph)\b/i,
  /\bhow many\b/i,
  /\bwhat is the (?:total|sum|difference|product|ratio|average|mean|median|mode|range)\b/i,
  /\bif\s+.+\s+(?:is|=|equals)\b/i,
  /\bfunction f is defined by\b/i,
  /\bin the xy-?plane\b/i,
  /\bsystem of equations\b/i,
];

/**
 * Boost on top of `likelySatStyleQuestion`: returns true when the stem matches
 * one of the canonical Digital SAT templates (R&W) or follows authentic
 * SAT math phrasing. Used as a soft-validator at generation time.
 */
export function looksLikeSatStem(
  question: string,
  section: "math" | "reading" | "writing" | "reading-writing"
): boolean {
  const stem = String(question || "").trim();
  if (!stem) return false;
  if (section === "math") {
    return MATH_CANONICAL_STEM_PATTERNS.some((re) => re.test(stem));
  }
  return RW_CANONICAL_STEM_PATTERNS.some((re) => re.test(stem));
}

export function likelySatStyleQuestion(params: {
  section: "math" | "reading" | "writing" | "reading-writing";
  question: string;
  passage?: string;
  options: string[];
}): boolean {
  const { section, question, passage = "", options } = params;
  const q = String(question || "").trim();
  if (!q || q.length < 20) return false;
  if (!Array.isArray(options) || options.length !== 4) return false;
  if (options.some((opt) => !String(opt || "").trim())) return false;

  if (section === "math") {
    const hasMathSignal =
      /[0-9=+\-*/^%]/.test(q) ||
      /\b(linear|quadratic|function|equation|system|triangle|probability|ratio|percent|slope|graph)\b/i.test(q);
    return hasMathSignal;
  }

  const p = String(passage || "").trim();
  if (!p || p.length < 80) return false;
  if (hasGenericSatStem(q) && p.length < 120) return false;

  const hasWritingSignal =
    /\b(revision|sentence|punctuation|grammar|transition|concise|concision|standard written english|underlined|replace)\b/i.test(
      q
    );
  const hasReadingSignal =
    /\b(passage|author|evidence|supports|implies|suggests|infer|central idea|purpose|tone|according to)\b/i.test(q);

  if (section === "writing") {
    return hasWritingSignal;
  }

  if (section === "reading-writing") {
    return hasReadingSignal || hasWritingSignal;
  }

  return hasReadingSignal;
}

