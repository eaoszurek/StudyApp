import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAIClient } from "@/lib/openai";
import { validateApiKey, handleApiError, withRetry, checkOrigin } from "@/utils/apiHelpers";
import { getAccessContext } from "@/utils/premiumGate";
import { rateLimit } from "@/lib/rate-limit";

const TrailBuddyRequestSchema = z.object({
  testType: z.enum(["math", "reading", "writing"]),
  question: z.string().min(1).max(1200),
  passage: z.string().max(2400).optional(),
  options: z.record(z.enum(["A", "B", "C", "D"]), z.string().max(300)),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  userAnswer: z.enum(["A", "B", "C", "D"]).nullable().optional(),
  explanationCorrect: z.string().max(600).optional(),
  explanationIncorrect: z.record(z.string(), z.string().max(300)).optional(),
  strategyTip: z.string().max(300).optional(),
  studentQuestion: z.string().min(1).max(350),
  responseStyle: z.enum(["quick", "step_list"]).optional(),
});

const TrailBuddyResponseSchema = z.object({
  reply: z.string(),
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

    const rl = rateLimit(`trail-buddy:${accessContext.user.id}`, { limit: 30, windowSeconds: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many Trail Buddy questions right now. Try again in a moment." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const parsed = TrailBuddyRequestSchema.safeParse(body);
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
          temperature: 0.35,
          max_tokens: 220,
          messages: [
            {
              role: "system",
              content: `You are Trail Buddy, a kind SAT coach for middle/high school students.
Return valid JSON only: {"reply":"..."}.
Rules:
- Use simple, clear language.
- Be encouraging, never harsh.
- Answer only based on the provided question context.
- Keep reply short (2-4 sentences).
- If the student answer is wrong, explain why in plain words and point to the best clue.
- If right, reinforce why it is right and one repeatable strategy.
- Include the full answer text when useful, not just letters.
- If responseStyle is "step_list", return 4-6 clear numbered steps separated by new lines in the single reply string.`,
            },
            {
              role: "user",
              content: JSON.stringify(payload),
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "trail_buddy_response",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  reply: { type: "string" },
                },
                required: ["reply"],
                additionalProperties: false,
              },
            },
          },
        }),
      2,
      12000
    );

    const text = completion.choices[0]?.message?.content || "{}";
    const json = JSON.parse(text);
    const validated = TrailBuddyResponseSchema.safeParse(json);
    if (!validated.success) {
      return NextResponse.json({ error: "Invalid Trail Buddy response." }, { status: 500 });
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    return handleApiError(error);
  }
}

