// src/app/api/generate-question/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkPremiumGate, getAccessContext } from "@/utils/premiumGate";
import { handleApiError, validateApiKey, withRetry, getCachedValue, setCachedValue } from "@/utils/apiHelpers";
import { validateQuestionFormat, cleanMathNotation, cleanText, truncateText, ensureSingleSkill, ensureBoldEmphasis } from "@/utils/aiValidation";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const gate = await checkPremiumGate(accessContext);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: "Free tier limit reached. Upgrade to Premium for unlimited access." },
        { status: 402 }
      );
    }

    const cacheKey = `generate-question:${JSON.stringify({ topic })}`;
    const cachedResponse = getCachedValue<any>(cacheKey);
    const completion = cachedResponse
      ? null
      : await withRetry(
      () => openai.chat.completions.create({
        model: "gpt-4o-mini",
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
- Explanations must briefly justify the correct answer.
- Avoid non-SAT topics; reinterpret them into SAT-relevant content if needed.
- No markdown, no commentary—just the JSON object.
            `,
          },
          {
            role: "user",
            content: `Create five SAT practice questions about: ${topic}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
      2,
      60000
    );

    const responseText = cachedResponse ? JSON.stringify(cachedResponse) : (completion?.choices[0].message?.content || "{}");
    const data = JSON.parse(responseText);

    if (!Array.isArray(data.questions)) {
      throw new Error("Invalid response format from model.");
    }

    const cleanedQuestions = data.questions
      .map((q: any, index: number) => {
        const questionText = cleanMathNotation(cleanText(truncateText(q.question || "", 600)));
        const options = [
          q.options?.A || "",
          q.options?.B || "",
          q.options?.C || "",
          q.options?.D || "",
        ].map((opt: string) => cleanMathNotation(cleanText(truncateText(opt, 250))));
        const correctAnswer = ["A", "B", "C", "D"].includes(q.correctAnswer) ? q.correctAnswer : "A";
        const explanation = ensureBoldEmphasis(cleanText(truncateText(q.explanation || "", 500)), skillCategory);
        const skillCategory = ensureSingleSkill(q.skillCategory || topic, topic);
        const section = q.section || (/equation|function|algebra|geometry|percent|ratio|linear|quadratic|slope|circle|system|inequal|exponent|probability|graph/i.test(topic) ? "Math" : "Reading & Writing");

        const validation = validateQuestionFormat({
          question: questionText,
          options,
          correctAnswer,
          explanation_correct: explanation,
        });

        if (!validation.valid) {
          return null;
        }

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

    if (cleanedQuestions.length === 0) {
      throw new Error("Failed to generate valid questions.");
    }

    const { user, sessionId } = accessContext;

    await prisma.practiceTest.create({
      data: {
        userId: user?.id,
        sessionId,
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
