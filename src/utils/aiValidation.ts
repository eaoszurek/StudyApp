/**
 * AI Response Validation and Cleaning Utilities
 * Ensures AI-generated content meets quality standards
 */

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
    const backText = card.back.trim();
    const wordCount = backText.split(/\s+/).length;
    
    // Check for em dash format
    if (!backText.includes("—")) {
      errors.push("Back must include em dash (—) to separate term and definition");
    }
    
    // Check word count (definition should be 10-25 words, but allow flexibility for examples)
    // Increased from 50 to 70 to allow for multiple examples
    if (wordCount < 8) {
      errors.push(`Back definition is too short (minimum 8 words, found ${wordCount})`);
    }
    if (wordCount > 70) {
      errors.push(`Back definition is too long (maximum 70 words including examples, found ${wordCount})`);
    }
  }

  if (!card.difficulty || !["Easy", "Medium", "Hard"].includes(card.difficulty)) {
    errors.push("Difficulty must be Easy, Medium, or Hard");
  }

  if (!card.tag || typeof card.tag !== "string") {
    errors.push("Tag is required");
  }

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

  let updated = text;

  updated = updated.replace(
    /\b(Solve(?:\s+for\s+\w+)?|Find|Determine|Calculate|Evaluate|Simplify)\s*:\s*/gi,
    (match, verb) => `${verb}:\n`
  );

  updated = updated.replace(
    /([^\n])\s*([A-Za-z0-9][A-Za-z0-9\s]*[=≤≥≠<>][A-Za-z0-9\s]+)/g,
    (match, prefix, expression) => `${prefix}\n${expression.trim()}`
  );

  return updated;
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
  const term = typeof card.front === "string" ? card.front.trim() : "";
  const rawBack = typeof card.back === "string" ? card.back.trim() : "";
  if (!rawBack) {
    errors.push("Back is required");
    return { card, valid: false, errors };
  }

  const lines: string[] = rawBack
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => Boolean(line));
  const exampleLines = lines.filter((line: string) => line.startsWith("•"));
  const contentLines = lines.filter((line: string) => !line.startsWith("•"));
  let definitionLine = contentLines.find((line: string) => line.includes("—")) || contentLines[0] || "";

  if (!definitionLine.includes("—")) {
    definitionLine = `${term || "Skill"} — ${definitionLine}`;
  }

  const defBody = definitionLine.split("—")[1]?.trim() || "";
  const pipeParts = defBody
    .split("|")
    .map((part: string) => part.trim())
    .filter((part: string) => Boolean(part));

  const fromLine = (regex: RegExp, source: string) => source.match(regex)?.[1]?.trim() || "";
  const joinedContent = contentLines.join(" | ");

  const whatTests =
    fromLine(/(?:SAT tests|What this tests):\s*([^|]+)/i, joinedContent) ||
    fromLine(/(?:tests?)\s*:\s*([^|]+)/i, joinedContent) ||
    pipeParts[0] ||
    defBody ||
    "the exact SAT skill and decision point";

  const howAppears =
    fromLine(/How it appears:\s*([^|]+)/i, joinedContent) ||
    pipeParts[1] ||
    "in short passages, equations, or answer-choice comparisons";

  const quickTip =
    fromLine(/(?:Quick )?Tip:\s*([^|]+)/i, joinedContent) ||
    pipeParts[2] ||
    "identify the tested rule before evaluating choices";

  const rebuiltLines = [
    `${term || "Skill"} — **What this tests:** ${whatTests}`,
    `**How it appears:** ${howAppears}`,
    `**Quick tip:** ${quickTip}`,
  ];

  const rebuilt = [...rebuiltLines, ...exampleLines].join("\n");
  card.back = rebuilt;
  return { card, valid: true, errors };
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

