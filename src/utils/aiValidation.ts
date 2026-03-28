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
 * Validates flashcard format
 */
export function validateFlashcardFormat(card: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!card.front || typeof card.front !== "string") {
    errors.push("Front is required and must be a string");
  } else {
    const frontWords = card.front.trim().split(/\s+/).length;
    if (frontWords < 1 || frontWords > 4) {
      errors.push(`Front must be 1-4 words (found ${frontWords})`);
    }
  }

  if (!card.back || typeof card.back !== "string") {
    errors.push("Back is required and must be a string");
  } else {
    const backText: string = String(card.back).trim();
    const lines = backText
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => Boolean(line));
    if (lines.length < 3 || lines.length > 5) {
      errors.push(`Back must be 3-5 lines (found ${lines.length})`);
    }
    if (lines.length > 0 && lines[0].startsWith("•")) {
      errors.push("First line must be a definition/key idea (not a bullet)");
    }
    const bulletLines = lines.filter((line: string) => line.startsWith("•"));
    const tipLines = bulletLines.filter((line: string) => /^•\s*Tip:/i.test(line));
    const exampleLines = bulletLines.filter((line: string) => /^•\s*Example:/i.test(line));
    const keyLines = bulletLines.filter((line: string) => !/^•\s*(Tip|Example):/i.test(line));

    if (keyLines.length < 2 || keyLines.length > 3) {
      errors.push(`Back must include 2-3 key-point bullets (found ${keyLines.length})`);
    }
    if (tipLines.length !== 1) {
      errors.push(`Back must include exactly 1 tip bullet starting with "Tip:" (found ${tipLines.length})`);
    }
    if (exampleLines.length > 1) {
      errors.push(`Back can include at most 1 example bullet (found ${exampleLines.length})`);
    }

    for (const keyLine of keyLines) {
      const words = keyLine.replace(/^•\s*/, "").split(/\s+/).filter(Boolean).length;
      if (words > 15) {
        errors.push(`Key-point bullets must be <=15 words: "${keyLine}"`);
      }
    }

    const lowerSet = new Set<string>();
    for (const line of lines) {
      const normalized = line.toLowerCase();
      if (lowerSet.has(normalized)) {
        errors.push("Back contains repeated lines");
        break;
      }
      lowerSet.add(normalized);
    }
  }

  // Difficulty and tag are optional; route will default to Medium / Grammar
  if (card.difficulty && !["Easy", "Medium", "Hard"].includes(card.difficulty)) {
    errors.push("Difficulty must be Easy, Medium, or Hard");
  }
  // Tag can be missing; we default it when saving

  return { valid: errors.length === 0, errors };
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

export function ensureFlashcardBackFormat(card: any): { card: any; valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const term = typeof card.front === "string" ? card.front.trim() : "Concept";
  const rawBack = typeof card.back === "string" ? card.back.trim() : "";
  if (!rawBack) {
    errors.push("Back is required");
    return { card, valid: false, errors };
  }

  const normalizeLine = (text: string, maxWords: number) =>
    text
      .replace(/\bSAT\b/gi, "")
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .replace(/\s([,.;:!?])/g, "$1")
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, maxWords)
      .join(" ")
      .replace(/[,:;\-–—]\s*$/, "")
      .trim();

  const lines: string[] = rawBack
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => Boolean(line));

  const contentLines = lines.filter((line: string) => !line.startsWith("•"));
  const bulletLines = lines.filter((line: string) => line.startsWith("•"));
  const joinedContent = contentLines.join(" | ");
  const fromLine = (regex: RegExp, source: string) => source.match(regex)?.[1]?.trim() || "";

  const definitionSeed =
    fromLine(/(?:What this tests|Definition|Key idea):\s*([^|]+)/i, joinedContent) ||
    contentLines[0] ||
    `${term} is a high-frequency rule tested in revision questions.`;
  const definitionLine = normalizeLine(definitionSeed, 20).replace(/\.$/, "") + ".";

  const keyCandidates = [
    fromLine(/How it appears:\s*([^|]+)/i, joinedContent),
    fromLine(/What this tests:\s*([^|]+)/i, joinedContent),
    ...bulletLines
      .filter((line) => !/^•\s*(Tip|Example):/i.test(line))
      .map((line) => line.replace(/^•\s*/, "")),
  ]
    .map((line) => normalizeLine(line, 15))
    .filter(Boolean);

  const uniqueKeys: string[] = [];
  for (const key of keyCandidates) {
    const normalized = key.toLowerCase();
    if (!uniqueKeys.some((existing) => existing.toLowerCase() === normalized)) {
      uniqueKeys.push(key);
    }
  }
  while (uniqueKeys.length < 2) {
    uniqueKeys.push(
      uniqueKeys.length === 0
        ? normalizeLine("identify the grammar rule before checking choices", 15)
        : normalizeLine("eliminate options that break clarity or correctness", 15)
    );
  }
  const keyLines = uniqueKeys.slice(0, 3).map((line) => `• ${line}`);

  const rawExample =
    bulletLines.find((line) => /^•\s*Example:/i.test(line))?.replace(/^•\s*Example:\s*/i, "") ||
    (lines.find((line) => /example[:\s]/i.test(line)) || "").replace(/^.*example[:\s]*/i, "");
  const exampleLine = rawExample ? `• Example: ${normalizeLine(rawExample, 12)}` : "";

  const rawTip =
    bulletLines.find((line) => /^•\s*Tip:/i.test(line))?.replace(/^•\s*Tip:\s*/i, "") ||
    fromLine(/(?:Quick\s+)?Tip:\s*([^|]+)/i, joinedContent) ||
    "underline the key signal word before choosing";
  const tipLine = `• Tip: ${normalizeLine(rawTip, 12)}`;

  const rebuiltLines = [definitionLine, ...keyLines];
  if (exampleLine && rebuiltLines.length < 4) {
    rebuiltLines.push(exampleLine);
  }
  rebuiltLines.push(tipLine);

  const rebuilt = rebuiltLines.slice(0, 5).join("\n");
  card.back = rebuilt;
  const validation = validateFlashcardFormat(card);
  return { card, valid: validation.valid, errors: validation.errors };
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

