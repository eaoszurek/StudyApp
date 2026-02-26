import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
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
    const rlKey = `ai:${accessContext.user?.id ?? accessContext.sessionId ?? "anon"}`;
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

    const cacheKey = `generate-plan:${JSON.stringify({ subject })}`;
    const cachedResponse = getCachedValue<any>(cacheKey);
    const completion = cachedResponse
      ? null
      : await withRetry(
      () => getOpenAIClient().chat.completions.create({
        model: "gpt-4o-mini",
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

Return ONLY valid JSON, no markdown, no code blocks, just the raw JSON object.`
          },
          {
            role: "user",
            content: `Generate a complete study plan for: ${subject}`
          }
        ],
        response_format: { type: "json_object" }
      }),
      2,
      60000
    );

    const responseText = cachedResponse ? JSON.stringify(cachedResponse) : (completion?.choices[0].message?.content || "{}");
    let planJSON;
    
    try {
      planJSON = JSON.parse(responseText);
    } catch (parseError) {
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planJSON = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse JSON response");
      }
    }

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

    const cleanedPlan = cleanValue(planJSON);

    const { user, sessionId } = accessContext;

    await prisma.studyPlan.create({
      data: {
        userId: user?.id,
        sessionId,
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
