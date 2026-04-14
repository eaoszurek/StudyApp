import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { prisma } from "@/lib/prisma";

const TopicSchema = z.object({
  name: z.string(),
  skills: z.array(z.string()),
  studyPlan: z.object({
    timeEstimateMinutes: z.number(),
    steps: z.array(z.string())
  }),
  milestones: z.array(z.string())
});

const SubcategorySchema = z.object({
  name: z.string(),
  overview: z.string(),
  topics: z.array(TopicSchema)
});

const CategorySchema = z.object({
  name: z.string(),
  overview: z.string(),
  subcategories: z.array(SubcategorySchema)
});

const PlanResponseSchema = z.object({
  subjectName: z.string(),
  description: z.string(),
  categories: z.array(CategorySchema)
});
import { checkPremiumGate, getAccessContext } from "@/utils/premiumGate";
import { handleApiError, validateApiKey, withRetry, getCachedValue, setCachedValue } from "@/utils/apiHelpers";
import { rateLimit } from "@/lib/rate-limit";
import { cleanText, truncateText } from "@/utils/aiValidation";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = z
      .object({
        subject: z.string().min(1, "Please provide a subject.").max(200, "Subject is too long").trim(),
      })
      .safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { subject } = validation.data;

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
        { error: "Free starter limit reached. Unlock Plus for $5/month to continue." },
        { status: 402 }
      );
    }

    const cacheKey = `generate-plan:v2-validated:${JSON.stringify({ subject })}`;
    const cachedResponse = getCachedValue<any>(cacheKey);
    const completion = cachedResponse
      ? null
      : await withRetry(
      () => getOpenAIClient().chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 3200,
        messages: [
          {
            role: "system",
            content: `You are the Plan Agent for a study application. Your job is to generate a complete structured breakdown of any study subject, topic, or exam the user requests.

Your output MUST ALWAYS follow the exact JSON structure below. Do NOT add or remove fields. Only fill them in.

{
  "subjectName": "",
  "description": "",
  "categories": [
    {
      "name": "",
      "overview": "",
      "subcategories": [
        {
          "name": "",
          "overview": "",
          "topics": [
            {
              "name": "",
              "skills": [
                ""
              ],
              "studyPlan": {
                "timeEstimateMinutes": 0,
                "steps": [
                  ""
                ]
              },
              "milestones": [
                ""
              ]
            }
          ]
        }
      ]
    }
  ]
}

RULES FOR CONTENT:
1. Content MUST match the subject the user gives, but you decide the best breakdown.
2. The plan MUST focus on in-app actions only. Use these features as the core actions:
   - Practice Tests
   - Flashcards
   - Micro-Lessons
   - Study Plans
   - Progress tracking/review
3. Do NOT mention group sessions, forums, external communities, tutoring services, or off-platform tools.
4. Do NOT suggest external resources or links. Keep all steps doable inside the app.
2. Always produce at least 3 categories, unless the subject logically has fewer.
3. Each category must have at least 2 subcategories.
4. Each subcategory must have at least 2 topics.
5. Each topic must include:
   - 3–6 key skills
   - A study plan with 3–6 actionable steps
   - 2–4 milestones (things the student should achieve)
6. Keep explanations short but high-quality.
7. NEVER include extra text or explanation outside the JSON.
8. Avoid repeating identical topic names across categories/subcategories.
9. Keep study steps practical and SAT-style when the subject is SAT-related.

Return ONLY valid JSON, no markdown, no code blocks, just the raw JSON object.`
          },
          {
            role: "user",
            content: `Generate a complete study plan for: ${subject}`
          }
        ],
        response_format: zodResponseFormat(PlanResponseSchema, "study_plan")
      }),
      3,
      60000
    );

    const responseText = cachedResponse ? JSON.stringify(cachedResponse) : (completion?.choices[0].message?.content || "{}");
    const planJSON = JSON.parse(responseText);

    const cleanValue = (value: any): any => {
      if (typeof value === "string") {
        return cleanText(truncateText(value, 500));
      }
      if (Array.isArray(value)) {
        return value.map(cleanValue);
      }
      if (value && typeof value === "object") {
        const cleanedEntries = Object.entries(value).map(([key, val]) => [key, cleanValue(val)]);
        return Object.fromEntries(cleanedEntries);
      }
      return value;
    };

    if (!planJSON?.subjectName || !planJSON?.description || !Array.isArray(planJSON?.categories)) {
      throw new Error("Invalid response format from model.");
    }
    if (planJSON.categories.length < 1) {
      throw new Error("Invalid plan: no categories generated.");
    }

    const cleanedPlan = cleanValue(planJSON);

    const { user } = accessContext;
    await prisma.studyPlan.create({
      data: {
        userId: user.id,
        plan: JSON.stringify(cleanedPlan),
      },
    });

    if (!cachedResponse) {
      setCachedValue(cacheKey, cleanedPlan);
    }

    return NextResponse.json(cleanedPlan);
  } catch (err: any) {
    return handleApiError(err);
  }
}
