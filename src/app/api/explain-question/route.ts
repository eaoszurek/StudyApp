import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAIClient } from "@/lib/openai";
import { validateApiKey, handleApiError, withRetry, checkOrigin } from "@/utils/apiHelpers";
import { getAccessContext } from "@/utils/premiumGate";
import { rateLimit } from "@/lib/rate-limit";

const ExplainRequestSchema = z.object({
  testType: z.enum(["math", "reading", "writing", "reading-writing"]),
  question: z.string().min(1).max(2400),
  passage: z.string().max(3000).optional().nullable(),
  options: z.record(z.enum(["A", "B", "C", "D"]), z.string().max(400)),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  userAnswer: z.enum(["A", "B", "C", "D"]).nullable().optional(),
  skillFocus: z.string().max(120).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
});

const ExplanationIncorrectSchema = z.object({
  A: z.string().nullable(),
  B: z.string().nullable(),
  C: z.string().nullable(),
  D: z.string().nullable(),
});

const ExplainResponseSchema = z.object({
  explanation_correct: z.string(),
  explanation_incorrect: ExplanationIncorrectSchema,
  strategy_tip: z.string(),
});

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const originError = checkOrigin(req);
    if (originError) return originError;

    const apiKeyError = validateApiKey();
    if (apiKeyError) return apiKeyError;

    const accessContext = await getAccessContext();
    if (!accessContext.user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const rl = rateLimit(`explain-question:${accessContext.user.id}`, { limit: 60, windowSeconds: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many explanation requests right now. Try again in a moment." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const parsed = ExplainRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const completion = await withRetry(
      () =>
        getOpenAIClient().chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.2,
          max_tokens: 500,
          messages: [
            {
              role: "system",
              content: `You are an expert SAT tutor writing concise, accurate explanations for Digital SAT practice questions.

Return ONLY valid JSON matching this exact shape:
{
  "explanation_correct": "1-2 short sentences on why the correct answer is right. Reference the specific clue, step, or rule.",
  "explanation_incorrect": {
    "A": "one short sentence naming the specific mistake for A, or null if A is correct",
    "B": "one short sentence naming the specific mistake for B, or null if B is correct",
    "C": "one short sentence naming the specific mistake for C, or null if C is correct",
    "D": "one short sentence naming the specific mistake for D, or null if D is correct"
  },
  "strategy_tip": "one short actionable SAT strategy tip a student can reuse on similar questions."
}

Rules:
- Use plain language aimed at middle/high school SAT students.
- Be concrete: reference the actual numbers, words, or structure in the question.
- For the correctAnswer letter, set its entry in explanation_incorrect to null.
- For the three wrong choices, give a one-sentence "why this is wrong" — no filler, no lectures.
- Keep explanation_correct under 240 characters and each incorrect reason under 160 characters.
- Never include markdown outside the JSON.`,
            },
            {
              role: "user",
              content: JSON.stringify(payload),
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "question_explanation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  explanation_correct: { type: "string" },
                  explanation_incorrect: {
                    type: "object",
                    properties: {
                      A: { type: ["string", "null"] },
                      B: { type: ["string", "null"] },
                      C: { type: ["string", "null"] },
                      D: { type: ["string", "null"] },
                    },
                    required: ["A", "B", "C", "D"],
                    additionalProperties: false,
                  },
                  strategy_tip: { type: "string" },
                },
                required: ["explanation_correct", "explanation_incorrect", "strategy_tip"],
                additionalProperties: false,
              },
            },
          },
        }),
      2,
      20000
    );

    const text = completion.choices[0]?.message?.content || "{}";
    const json = JSON.parse(text);
    const validated = ExplainResponseSchema.safeParse(json);
    if (!validated.success) {
      return NextResponse.json({ error: "Invalid explanation response." }, { status: 500 });
    }

    // Trim the letter that corresponds to the correct answer from explanation_incorrect (should already be null).
    const cleaned = { ...validated.data };
    const incorrect: Record<string, string> = {};
    (["A", "B", "C", "D"] as const).forEach((letter) => {
      if (letter === payload.correctAnswer) return;
      const reason = cleaned.explanation_incorrect[letter];
      if (reason) incorrect[letter] = reason;
    });

    return NextResponse.json({
      explanation_correct: cleaned.explanation_correct,
      explanation_incorrect: incorrect,
      strategy_tip: cleaned.strategy_tip,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
