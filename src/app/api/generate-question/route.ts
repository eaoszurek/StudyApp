// src/app/api/generate-question/route.ts
import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { prisma } from "@/lib/prisma";

const QuestionOptionsSchema = z.object({
  A: z.string(),
  B: z.string(),
  C: z.string(),
  D: z.string()
});

const SingleQuestionSchema = z.object({
  question: z.string(),
  section: z.enum(["Reading & Writing", "Math"]),
  skillCategory: z.string(),
  options: QuestionOptionsSchema,
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string()
});

const QuestionsResponseSchema = z.object({
  questions: z.array(SingleQuestionSchema)
});
import { checkPremiumGate, getAccessContext } from "@/utils/premiumGate";
import { handleApiError, validateApiKey, withRetry, getCachedValue, setCachedValue } from "@/utils/apiHelpers";
import { rateLimit } from "@/lib/rate-limit";
import { validateQuestionFormat, cleanMathNotation, cleanText, truncateText, ensureSingleSkill, ensureBoldEmphasis, formatEquationLineBreaks, removeDuplicates } from "@/utils/aiValidation";

export const maxDuration = 180;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = z
      .object({
        topic: z.string().min(1, "Please provide a topic.").max(200, "Topic is too long").trim(),
      })
      .safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { topic } = validation.data;

    const apiKeyError = validateApiKey();
    if (apiKeyError) return apiKeyError;

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
        { error: "Free tier limit reached. Upgrade to Premium for unlimited access." },
        { status: 402 }
      );
    }

    const cacheKey = `generate-question:v2-strict-sat:${JSON.stringify({ topic })}`;
    const cachedResponse = getCachedValue<any>(cacheKey);
    const MAX_MODEL_ATTEMPTS = 3;
    const normalizeStem = (text: string) =>
      text
        .toLowerCase()
        .replace(/\d+(?:\.\d+)?/g, "#")
        .replace(/\s+/g, " ")
        .trim();

    const cleanModelQuestions = (rawQuestions: any[]) => {
      const cleaned = rawQuestions
        .map((q: any, index: number) => {
          const questionText = formatEquationLineBreaks(cleanMathNotation(cleanText(truncateText(q.question || "", 600))));
          const optionSource: string[] = Array.isArray(q.options)
            ? q.options
            : [q.options?.A || "", q.options?.B || "", q.options?.C || "", q.options?.D || ""];
          const options: string[] = optionSource.map((opt: string) => cleanMathNotation(cleanText(truncateText(opt, 250))));
          if (options.length !== 4) return null;
          const normalizedOptions = options.map((opt: string) => opt.toLowerCase().trim());
          if (new Set(normalizedOptions).size < 4) return null;
          const correctAnswer = ["A", "B", "C", "D"].includes(q.correctAnswer) ? q.correctAnswer : "A";
          const skillCategory = ensureSingleSkill(q.skillCategory || topic, topic);
          const explanation = ensureBoldEmphasis(cleanText(truncateText(q.explanation || "", 500)), skillCategory);
          const section = q.section || (/equation|function|algebra|geometry|percent|ratio|linear|quadratic|slope|circle|system|inequal|exponent|probability|graph/i.test(topic) ? "Math" : "Reading & Writing");

          const validation = validateQuestionFormat({
            question: questionText,
            options,
            correctAnswer,
            explanation_correct: explanation,
          });

          if (!validation.valid) return null;

          return {
            id: index + 1,
            question: questionText,
            section,
            skillCategory,
            options,
            correctAnswer,
            explanation,
          };
        })
        .filter((q: any) => q !== null);

      const deduped = removeDuplicates(cleaned, (q: any) => normalizeStem(String(q.question || "")));
      const stemSet = new Set(deduped.map((q: any) => normalizeStem(q.question)));
      const hasVariety = stemSet.size >= Math.min(4, deduped.length);
      return { questions: deduped, hasVariety };
    };

    const getModelPayload = async (extraInstruction = "") => {
      const completion = await withRetry(
        () => getOpenAIClient().chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.45,
          max_tokens: 2600,
          messages: [
            {
              role: "system",
              content: `
You are an expert SAT tutor. Given a topic, produce FIVE SAT-style multiple-choice practice questions.
All content must be original and SAT-inspired (do not mimic real SAT items). Each question targets exactly one SAT skill category.
Return ONLY valid JSON that matches this schema:
{
  "questions": [
    {
      "question": "",
      "section": "Reading & Writing" | "Math",
      "skillCategory": "string (single SAT skill category)",
      "options": {
        "A": "",
        "B": "",
        "C": "",
        "D": ""
      },
      "correctAnswer": "A",
      "explanation": ""
    }
  ]
}

Rules:
- Questions must be SAT-style and concise.
- Make distractor choices plausible.
- Explanations must briefly justify the correct answer and be encouraging, like a tutor.
- Avoid non-SAT topics; reinterpret them into SAT-relevant content if needed.
- Across the five questions, avoid repeating stems or near-identical scenarios.
- Ensure all 5 questions are meaningfully different in context and skill focus.
- Options must be distinct (no duplicates or near-duplicates in the same question).
- If Math: include at least one word problem and one non-word problem; vary contexts and representations.
- If Reading/Writing: vary question types (evidence, vocab-in-context, inference, transitions, boundaries).
- No markdown, no commentary—just the JSON object.
            `,
            },
            {
              role: "user",
              content: `Create five SAT practice questions about: ${topic}.${extraInstruction ? ` ${extraInstruction}` : ""}`,
            },
          ],
          response_format: zodResponseFormat(QuestionsResponseSchema, "practice_questions"),
        }),
        3,
        60000
      );

      const responseText = completion?.choices[0].message?.content || "{}";
      const data = JSON.parse(responseText);
      if (!Array.isArray(data.questions)) {
        throw new Error("Invalid response format from model.");
      }
      return data;
    };

    let cleanedQuestions: any[] = [];
    if (cachedResponse?.questions && Array.isArray(cachedResponse.questions)) {
      const cachedCleaned = cleanModelQuestions(cachedResponse.questions as any[]);
      cleanedQuestions = cachedCleaned.questions.slice(0, 5);
    } else {
      for (let attempt = 0; attempt < MAX_MODEL_ATTEMPTS; attempt += 1) {
        const data = await getModelPayload(
          attempt === 0
            ? ""
            : `Retry attempt ${attempt + 1}: increase variety and avoid repeating stems or option patterns.`
        );
        const result = cleanModelQuestions(data.questions as any[]);
        cleanedQuestions = result.questions.slice(0, 5);
        if (cleanedQuestions.length >= 5 && result.hasVariety) break;
      }
    }

    if (cleanedQuestions.length < 5) {
      throw new Error("Failed to generate enough valid questions. Please retry.");
    }

    const { user } = accessContext;
    await prisma.practiceTest.create({
      data: {
        userId: user.id,
        section: "mixed",
        questions: JSON.stringify(cleanedQuestions),
      },
    });

    const responseBody = {
      questions: cleanedQuestions.map((q: any) => ({
        question: q.question,
        section: q.section,
        skillCategory: q.skillCategory,
        options: {
          A: q.options[0],
          B: q.options[1],
          C: q.options[2],
          D: q.options[3],
        },
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
    };

    if (!cachedResponse) {
      setCachedValue(cacheKey, responseBody);
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    return handleApiError(error);
  }
}
