import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { z } from "zod";
import { validateQuestionFormat, cleanMathNotation, cleanText, truncateText, ensureSingleSkill, ensureBoldEmphasis, formatEquationLineBreaks } from "@/utils/aiValidation";
import { validateApiKey, handleApiError, withRetry, getCachedValue, setCachedValue } from "@/utils/apiHelpers";
import { checkPremiumGate, getAccessContext } from "@/utils/premiumGate";
import { prisma } from "@/lib/prisma";

// Zod schema for input validation
const LessonRequestSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(200, "Topic is too long").trim(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

export async function POST(req: Request) {
  try {
    // Validate API key
    const apiKeyError = validateApiKey();
    if (apiKeyError) return apiKeyError;

    // Parse and validate request body
    const body = await req.json();
    const validationResult = LessonRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { topic, difficulty } = validationResult.data;
    const defaultDifficulty = difficulty || "easy";

    const accessContext = await getAccessContext();
    const gate = await checkPremiumGate(accessContext);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: "Free tier limit reached. Upgrade to Premium for unlimited access." },
        { status: 402 }
      );
    }

    // Create completion with timeout
    const cacheKey = `ai-lessons:${JSON.stringify({ topic, difficulty: defaultDifficulty })}`;
    const cachedResponse = getCachedValue<any>(cacheKey);
    const completion = cachedResponse
      ? null
      : await withRetry(
      () => getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert SAT tutor creating micro-lessons to help students master SAT concepts. Your teaching style should be clear, encouraging, and step-by-step - like a personal tutor explaining concepts. Break down complex topics into digestible pieces, use examples that illustrate the concept clearly, and help students understand the "why" behind the rules, not just the "what". 

You MUST output valid JSON only. Do not use markdown lists or headings. You may use **bold** for emphasis only.

FORMAT:
{
  "title": "string",
  "goal": "string",
  "explanation": ["bullet point", "bullet point", "bullet point"],
  "example": "string",
  "practice": [
    {
      "question": "string (clear, concise question text only - no repetition of examples or explanations)",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": "A",
      "explanation": "string (detailed explanation of why the correct answer is right, 2-4 sentences)",
      "explanation_incorrect": {
        "B": "string (why this answer is wrong)",
        "C": "string (why this answer is wrong)",
        "D": "string (why this answer is wrong)"
      }
    }
  ],
  "relatedFlashcards": ["string", "string"]
}

RULES (Tutor-like approach):
- Lessons must be short (1–2 minutes) but thorough.
- Each lesson must target exactly ONE SAT skill category (explicit and singular).
- All explanations MUST be bullet points that feel like a tutor's step-by-step teaching.
- Explain how the SAT tests this skill, a common mistake, and how to avoid it.
- Each bullet should explain one key concept clearly - use language like "Here's what this means..." or "The key idea is..."
- Example must be simple, directly illustrate the concept, and show the thinking process. Keep it concise and focused.
- Practice questions must always include A–D choices with clear, realistic distractors.
- Practice question text should be clean and concise - don't repeat the example or explanation in the question.
- Each practice question MUST include an "explanation" field that explains why the correct answer is right (2-4 sentences, tutor-like).
- Each practice question MUST include an "explanation_incorrect" object with explanations for each wrong answer (B, C, D) explaining why students might choose it and what misconception leads to that choice.
- Never output anything other than the JSON object.
- Never include special characters like ^.
- Use **bold** sparingly (1-2 per response section) to emphasize key terms or rules.
- Adjust difficulty based on input if provided.
- If the user does not give difficulty, default to easy.
- If the topic is not SAT-related, redirect by giving a simple SAT-relevant version of it.
- Generate 1-2 practice questions that reinforce the lesson.
- If generating 2 practice questions, make them different in format and avoid repeating stems.
- If the topic is Math, include at least one word problem in the practice questions.
- Related flashcards should be 2-4 relevant terms/concepts that connect to this lesson.
- Make explanations encouraging and educational - help students understand, not just memorize.
- Format all text cleanly - no unbroken blobs of text, use proper line breaks where needed.
- Use **bold** sparingly (1-2 per section) to emphasize key terms or rules.

DIFFICULTY LEVELS:
- Easy: Basic concepts, straightforward examples, simple practice questions
- Medium: Moderate complexity, requires some reasoning
- Hard: Advanced concepts, complex reasoning required

Return ONLY valid JSON. No markdown, no commentary, no extra text.`,
        },
        {
          role: "user",
          content: `Generate a SAT micro-lesson about: ${topic}. Difficulty: ${defaultDifficulty}.`,
        },
      ],
      response_format: { type: "json_object" },
      }),
      2,
      60000
    );

    const responseText = cachedResponse ? JSON.stringify(cachedResponse) : (completion?.choices[0].message?.content || "{}");
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON from markdown or other text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse JSON response from model.");
      }
    }

    // Validate the response structure
    if (!data.title || !data.goal || !Array.isArray(data.explanation)) {
      throw new Error("Invalid response format from model.");
    }

    // Clean text fields
    data.title = cleanText(truncateText(data.title, 100));
    data.goal = ensureBoldEmphasis(cleanText(truncateText(data.goal, 250)));
    data.example = ensureBoldEmphasis(cleanMathNotation(cleanText(truncateText(data.example || "", 600))));
    data.explanation = data.explanation.map((point: string) => ensureBoldEmphasis(cleanMathNotation(cleanText(truncateText(point, 200)))));
    if (!data.skillCategory || typeof data.skillCategory !== "string") {
      data.skillCategory = ensureSingleSkill(topic, topic);
    } else {
      data.skillCategory = ensureSingleSkill(data.skillCategory, topic);
    }
    if (!data.section || typeof data.section !== "string") {
      const mathHint = /equation|function|algebra|geometry|percent|ratio|linear|quadratic|slope|circle|system|inequal|exponent|probability|graph/i;
      data.section = mathHint.test(topic) ? "Math" : "Reading & Writing";
    }
    data.difficulty = data.difficulty || defaultDifficulty;

    // Ensure practice questions have correct format and validate
    if (data.practice && Array.isArray(data.practice)) {
      data.practice = data.practice
        .map((q: any) => {
          // Convert options to array if it's an object
          let optionsArray: string[] = [];
          if (Array.isArray(q.options)) {
            optionsArray = q.options;
          } else if (q.options && typeof q.options === "object") {
            if (q.options.A) optionsArray.push(q.options.A);
            if (q.options.B) optionsArray.push(q.options.B);
            if (q.options.C) optionsArray.push(q.options.C);
            if (q.options.D) optionsArray.push(q.options.D);
          }
          
          if (optionsArray.length !== 4) {
            console.warn("Invalid options array length:", optionsArray);
            return null;
          }
          
          // Clean question and options
          const questionText = formatEquationLineBreaks(cleanMathNotation(cleanText(truncateText(q.question || "", 600))));
          const cleanedOptions = optionsArray.map(opt => cleanMathNotation(cleanText(truncateText(opt, 250))));
          
          // Ensure correctAnswer is A, B, C, or D
          let correctAnswer = q.correctAnswer;
          if (!["A", "B", "C", "D"].includes(correctAnswer)) {
            correctAnswer = "A";
          }
          
          // Clean explanations (increased limits for better quality)
          const explanation = ensureBoldEmphasis(cleanText(truncateText(q.explanation || "", 500)), data.skillCategory);
          const explanationIncorrect: Record<string, string> = {};
          if (q.explanation_incorrect && typeof q.explanation_incorrect === 'object') {
            Object.entries(q.explanation_incorrect).forEach(([letter, reason]) => {
              if (letter !== correctAnswer && reason) {
                explanationIncorrect[letter] = ensureBoldEmphasis(cleanText(truncateText(reason as string, 300)), data.skillCategory);
              }
            });
          }
          
          const strategyTip = ensureBoldEmphasis(cleanText(truncateText(q.strategy_tip || "", 250)), data.skillCategory);
          
          // Validate question format
          const validation = validateQuestionFormat({
            question: questionText,
            options: cleanedOptions,
            correctAnswer: correctAnswer,
            explanation_correct: explanation,
          });
          
          if (!validation.valid) {
            console.warn("Invalid question format:", validation.errors, q);
            return null;
          }
          
          return {
            question: questionText,
            options: cleanedOptions,
            correctAnswer: correctAnswer,
            explanation: explanation,
            explanation_incorrect: explanationIncorrect,
            strategy_tip: strategyTip,
            section: data.section,
            skillCategory: data.skillCategory,
            difficulty: defaultDifficulty,
          };
        })
        .filter((q: any) => q !== null); // Remove invalid questions
    } else {
      data.practice = [];
    }

    // Ensure relatedFlashcards is an array and clean
    if (!Array.isArray(data.relatedFlashcards)) {
      data.relatedFlashcards = [];
    } else {
      data.relatedFlashcards = data.relatedFlashcards
        .map((flashcard: string) => cleanText(truncateText(flashcard, 50)))
        .filter((flashcard: string) => flashcard.length > 0);
    }

    // Get userId or sessionId for saving
    const { user, sessionId } = accessContext;

    // Save to database
    await prisma.microLesson.create({
      data: {
        userId: user?.id,
        sessionId,
        topic: topic,
        lesson: JSON.stringify(data),
      },
    });

    if (!cachedResponse) {
      setCachedValue(cacheKey, data);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return handleApiError(error);
  }
}

