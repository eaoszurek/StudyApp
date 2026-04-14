import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { validateFlashcardFormat, cleanMathNotation, cleanText, removeDuplicates, truncateText, ensureFlashcardBackFormat, ensureSingleSkill } from "@/utils/aiValidation";

const FlashcardSchema = z.object({
  front: z.string(),
  back: z.string(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  tag: z.enum(["Vocab", "Grammar", "Reading", "Math", "Functions", "Statistics", "Rhetoric"])
});

const ReviewIntervalsSchema = z.object({
  "got-it": z.string(),
  "almost": z.string(),
  "no-idea": z.string()
});

const FlashcardsResponseSchema = z.object({
  flashcards: z.array(FlashcardSchema),
  reviewIntervals: ReviewIntervalsSchema
});
import { validateApiKey, handleApiError, withRetry, getCachedValue, setCachedValue } from "@/utils/apiHelpers";
import { rateLimit } from "@/lib/rate-limit";
import { checkPremiumGate, getAccessContext } from "@/utils/premiumGate";
import { prisma } from "@/lib/prisma";

// Zod schema for input validation
const FlashcardRequestSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(200, "Topic is too long").trim(),
});

export async function POST(req: Request) {
  try {
    // Validate API key
    const apiKeyError = validateApiKey();
    if (apiKeyError) return apiKeyError;

    // Parse and validate request body
    const body = await req.json();
    const validationResult = FlashcardRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { topic } = validationResult.data;

    const accessContext = await getAccessContext();
    if (!accessContext.user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const rlKey = `ai:${accessContext.user.id}`;
    const rl = rateLimit(rlKey, { limit: 25, windowSeconds: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a moment." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }
    const gate = await checkPremiumGate(accessContext);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: "Free starter limit reached. Unlock Plus for $5/month to continue." },
        { status: 402 }
      );
    }

    // Create completion with timeout
    const cacheKey = `generate-flashcards:v4-strict-back-format:${JSON.stringify({ topic })}`;
    const cachedResponse = getCachedValue<any>(cacheKey);
    const MIN_FLASHCARDS = 8;
    const MAX_MODEL_ATTEMPTS = 3;

    const getModelPayload = async (extraInstruction = "") => {
      const completion = await withRetry(
        () => getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.45,
      max_tokens: 2800,
      messages: [
        {
          role: "system",
          content: `You are an expert tutor creating flashcards to help students master key concepts. Keep explanations concise, practical, and easy to scan.

CRITICAL FORMAT RULES:
- Each flashcard must have "front", "back", "difficulty", and "tag". Do not omit any field.
- difficulty: exactly one of "Easy", "Medium", "Hard". tag: exactly one of "Vocab", "Grammar", "Reading", "Math", "Functions", "Statistics", "Rhetoric".
- "front" = concept name (1-4 words).
- "back" MUST follow this exact structure and line order:
  1) Definition / Key Idea line (NOT a bullet), 1 short sentence.
  2) Bullet key point.
  3) Bullet key point.
  4) Optional bullet example prefixed exactly with "• Example:" OR a third key-point bullet.
  5) Bullet tip prefixed exactly with "• Tip:".
- Keep each key-point bullet under 15 words.
- No step-by-step solutions. No long explanations. No repeated ideas.
- Maximum 5 lines total. Must be readable in under 10 seconds.
- Avoid filler phrases and avoid repeating obvious app/test context words.
- NO ^ for exponents - use superscripts (x², x³).

OUTPUT FORMAT:
{
  "flashcards": [
    {
      "front": "TERM (1-4 words)",
      "back": "TERM — **What this tests:** clear definition (10-24 words)\n**How it appears:** SAT-style appearance (10-24 words)\n**Quick tip:** practical strategy (8-18 words)\n• Example 1 (if helpful)\n• Example 2 (if helpful)",
      "difficulty": "Easy" | "Medium" | "Hard",
      "tag": "Vocab" | "Grammar" | "Reading" | "Math" | "Functions" | "Statistics" | "Rhetoric"
    }
  ],
  "reviewIntervals": {
    "got-it": "3 days",
    "almost": "1 day",
    "no-idea": "again-today"
  }
}

Generate 10-15 flashcards. Return ONLY valid JSON, no markdown lists or headings, no commentary.

FORMATTING RULES:
- Keep all text clean and professional
- Use line breaks (\n) for each required back line
- Do not merge multiple required lines into one line`,
        },
        {
          role: "user",
          content: `Create concise flashcards about: ${topic}. Use strict back formatting:
Line 1 = one-sentence key idea
Lines 2-3 = two key-point bullets
Line 4 = optional "• Example:" bullet OR third key-point bullet
Line 5 = one "• Tip:" bullet.
No step-by-step solutions. No filler.${extraInstruction ? ` ${extraInstruction}` : ""}`,
        },
      ],
      response_format: zodResponseFormat(FlashcardsResponseSchema, "flashcards_response"),
      }),
      3,
      60000
    );

      const responseText = completion?.choices[0].message?.content || "{}";
      return JSON.parse(responseText);
    };

    let data = cachedResponse || null;
    if (!cachedResponse) {
      for (let attempt = 0; attempt < MAX_MODEL_ATTEMPTS; attempt += 1) {
        const candidate = await getModelPayload(
          attempt === 0 ? "" : `Retry attempt ${attempt + 1}: increase variety and avoid repeated card fronts.`
        );
        if (Array.isArray(candidate?.flashcards)) {
          data = candidate;
          break;
        }
      }
    }
    if (!Array.isArray(data?.flashcards)) {
      throw new Error("Invalid response format from model.");
    }

    // Validate and clean flashcards
    const validatedFlashcards = data.flashcards
      .map((card: any) => {
        // Clean math notation
        if (card.front) card.front = cleanMathNotation(cleanText(card.front));
        if (card.back) {
          card.back = cleanMathNotation(
            String(card.back)
              .split("\n")
              .map((line: string) => cleanText(line))
              .join("\n")
          );
        }
        
        // Truncate if too long (increased limits to preserve examples)
        if (card.front) card.front = truncateText(card.front, 50);
        if (card.back) card.back = truncateText(card.back, 320);
        
        const enforced = ensureFlashcardBackFormat(card);
        if (!enforced.valid) {
          console.warn("Invalid flashcard back format:", enforced.errors, card);
          return null;
        }
        card = enforced.card;
        card.skillCategory = ensureSingleSkill(card.skillCategory || card.front, card.front);
        if (!card.section) {
          const tag = typeof card.tag === "string" ? card.tag.toLowerCase() : "";
          card.section = tag.includes("math") ? "Math" : "Reading & Writing";
        }
        if (!card.difficulty || !["Easy", "Medium", "Hard"].includes(card.difficulty)) {
          card.difficulty = "Medium";
        }
        if (!card.tag || typeof card.tag !== "string") {
          card.tag = card.section === "Math" ? "Math" : "Grammar";
        }
        const validation = validateFlashcardFormat(card);
        if (!validation.valid) {
          console.warn("Invalid flashcard format:", validation.errors, card);
          return null;
        }
        return card;
      })
      .filter((card: any) => card !== null); // Remove invalid cards

    // Remove duplicates based on front text
    const uniqueFlashcards = removeDuplicates(validatedFlashcards, (card: any) => card.front.toLowerCase().trim());

    // Ensure we have enough cards for a usable deck
    if (uniqueFlashcards.length < MIN_FLASHCARDS) {
      throw new Error("Generated too few valid flashcards. Please try again.");
    }

    const { user } = accessContext;
    await prisma.flashcardSet.create({
      data: {
        userId: user.id,
        title: topic,
        topic: topic,
        cards: JSON.stringify(uniqueFlashcards),
      },
    });

    if (!cachedResponse) {
      setCachedValue(cacheKey, { flashcards: uniqueFlashcards, reviewIntervals: data.reviewIntervals });
    }

    return NextResponse.json({
      ...(cachedResponse || data),
      flashcards: uniqueFlashcards,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

