import { createHash } from "crypto";
import { normalizeForSimilarity } from "@/utils/aiValidation";

/**
 * Cross-session question deduplication.
 *
 * A fingerprint is a short hash of the normalized question stem, the correct
 * answer text, and the skill category. It lets us reject newly generated
 * questions that are effectively identical to ones the user has already seen,
 * even across different practice tests.
 *
 * Storage: a JSON array on `User.seenQuestionFingerprints`, capped at
 * MAX_FINGERPRINTS entries. Most-recent matter most for prompt injection;
 * older entries age out.
 */

export const MAX_FINGERPRINTS = 200;
export const PROMPT_FINGERPRINT_LIMIT = 50;
export const PROMPT_RECENT_STEMS_LIMIT = 10;
export const RECENT_STEM_PREVIEW_CHARS = 120;

interface FingerprintInput {
  question?: string;
  options?: Record<string, string> | string[] | null;
  correctAnswer?: string;
  skillCategory?: string;
  skillFocus?: string;
}

function getCorrectAnswerText(input: FingerprintInput): string {
  if (!input.correctAnswer) return "";
  const letter = String(input.correctAnswer).trim().toUpperCase();
  if (!letter) return "";
  if (Array.isArray(input.options)) {
    const idx = letter.charCodeAt(0) - 65;
    if (idx >= 0 && idx < input.options.length) {
      return String(input.options[idx] || "");
    }
    return "";
  }
  if (input.options && typeof input.options === "object") {
    const value = (input.options as Record<string, string>)[letter];
    return value ? String(value) : "";
  }
  return "";
}

export function computeFingerprint(input: FingerprintInput): string {
  const stem = normalizeForSimilarity(String(input.question || ""));
  const answerText = normalizeForSimilarity(getCorrectAnswerText(input));
  const skill = String(input.skillCategory || input.skillFocus || "")
    .trim()
    .toLowerCase();
  if (!stem) return "";
  const payload = `${stem}|${answerText}|${skill}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

/**
 * Compute fingerprints for a list of questions, dropping any that fail to
 * produce a stable hash (e.g. empty stem).
 */
export function computeFingerprints(questions: FingerprintInput[]): string[] {
  const out: string[] = [];
  for (const q of questions) {
    const fp = computeFingerprint(q);
    if (fp) out.push(fp);
  }
  return out;
}

export function parseFingerprintList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      .slice(-MAX_FINGERPRINTS);
  } catch {
    return [];
  }
}

/**
 * Append `incoming` fingerprints to the existing list, dedupe, and keep the
 * most recent MAX_FINGERPRINTS entries (newest at the end).
 */
export function mergeFingerprints(existing: string[], incoming: string[]): string[] {
  const merged = [...existing, ...incoming];
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (let i = merged.length - 1; i >= 0; i -= 1) {
    const entry = merged[i];
    if (!entry || seen.has(entry)) continue;
    seen.add(entry);
    deduped.push(entry);
  }
  deduped.reverse();
  if (deduped.length <= MAX_FINGERPRINTS) return deduped;
  return deduped.slice(deduped.length - MAX_FINGERPRINTS);
}

export function takeRecentFingerprints(list: string[], count = PROMPT_FINGERPRINT_LIMIT): string[] {
  if (list.length <= count) return list.slice();
  return list.slice(list.length - count);
}

export function makeStemPreview(text: string, max = RECENT_STEM_PREVIEW_CHARS): string {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}
