import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { z } from "zod";
import { cleanText, truncateText, ensureTaskDuration, ensureBoldEmphasis } from "@/utils/aiValidation";
import { validateApiKey, handleApiError, withRetry, getCachedValue, setCachedValue } from "@/utils/apiHelpers";
import { checkPremiumGate, getAccessContext } from "@/utils/premiumGate";
import { prisma } from "@/lib/prisma";

// Zod schema for input validation
const StudyPlanRequestSchema = z.object({
  answers: z.object({
    targetScore: z.string().max(20).optional(),
    testDate: z.string().max(50).optional(),
    weakestSection: z.string().max(100).optional(),
    hoursPerDay: z.string().max(20).optional(),
    studyStyle: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  }),
  performanceData: z.object({
    averageScore: z.number().optional(),
    totalSessions: z.number().optional(),
    weakestSection: z.string().max(100).optional(),
  }).nullable().optional(),
});

export async function POST(req: Request) {
  try {
    // Validate API key
    const apiKeyError = validateApiKey();
    if (apiKeyError) return apiKeyError;

    // Parse and validate request body
    const body = await req.json();
    const validationResult = StudyPlanRequestSchema.safeParse(body);

    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.issues);
      return NextResponse.json(
        { 
          error: validationResult.error.issues[0]?.message || "Invalid request",
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const { answers, performanceData } = validationResult.data;

    const accessContext = await getAccessContext();
    const gate = await checkPremiumGate(accessContext);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: "Free tier limit reached. Upgrade to Premium for unlimited access." },
        { status: 402 }
      );
    }

    const {
      targetScore,
      testDate,
      weakestSection,
      hoursPerDay,
      studyStyle,
      notes,
    } = answers;
    
    // Use performance data if available, otherwise use user's input
    const actualWeakestSection = (performanceData && performanceData.weakestSection) ? performanceData.weakestSection : weakestSection;
    const currentScore = (performanceData && performanceData.averageScore) ? performanceData.averageScore : null;
    const totalSessions = (performanceData && performanceData.totalSessions) ? performanceData.totalSessions : 0;

    // Create completion with timeout
    const cacheKey = `generate-personalized-plan:${JSON.stringify({ answers, performanceData })}`;
    const cachedResponse = getCachedValue<any>(cacheKey);
    const completion = cachedResponse
      ? null
      : await withRetry(
      () => getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert SAT tutor creating personalized study plans for students inside a specific app. Your role is to be encouraging, realistic, and supportive - like a tutor helping a student reach their goals. Acknowledge their current level, celebrate their progress, and create a plan that feels achievable and motivating. Be specific with strategies and explain WHY each recommendation helps them improve.

DO NOT use markdown lists or headings. DO NOT write paragraphs. DO NOT include emojis.
You may use **bold** for emphasis only (1-2 per section).
ALWAYS output structured sections.

Required JSON format:
{
  "overview": "string",
  "weeklyPlan": [
    {
      "week": 1,
      "focus": "string",
      "tasks": ["string", "string"]
    }
  ],
  "dailyPlan": [
    {
      "day": "string",
      "tasks": ["string", "string"]
    }
  ],
  "practiceTests": ["string", "string"],
  "strategies": ["string", "string"]
}

RULES (Tutor-like, encouraging approach):
- The plan MUST focus on in-app features only. Use these features as the core actions:
  * Practice Tests
  * Flashcards
  * Micro-Lessons
  * Study Plans
  * Progress tracking/review
- Do NOT mention group sessions, forums, external communities, tutoring services, or off-platform tools.
- Do NOT ask the student to use external resources or links. Keep everything doable inside the app.
- Separate Reading & Writing and Math tasks explicitly.
- Each task should reference a specific SAT skill category (not vague topics).
- Keep sessions short (15–30 minutes) and realistic.
- Only recommend actions that exist inside this app: Practice Tests, Flashcards, Micro-Lessons, Study Plans, Progress tracking.
- Do NOT include tasks like taking notes, watching videos, or using external materials.
- Use app-specific language like "Complete a Practice Test", "Review Flashcards", "Do a Micro-Lesson", "Check Progress".
- Use the user's input: test date, current score, target score, hours per day, strengths, weaknesses, preferred study style.
- Use ALL provided answers to shape the plan; do not ignore any configuration inputs.
- If performance data is provided, use ACTUAL performance metrics (current score, weakest section from practice) instead of user estimates.
- Overview: Give an encouraging summary (2-3 sentences). Acknowledge their goal, mention current progress if available, and express confidence in their ability to improve. If current score is known, frame the gap positively (e.g., "You're currently at X, and with focused practice, reaching Y is absolutely achievable").
- WeeklyPlan: 4-8 weeks depending on timeline. Each week has a main focus (1 short phrase) and 4-6 specific, actionable tasks. Make tasks feel achievable and explain their purpose briefly.
- DailyPlan: Create realistic daily tasks based on time available. Include 7 days (Monday-Sunday) with 2-4 tasks per day. Vary the tasks to keep it engaging.
- Each task must start with "Reading & Writing:" or "Math:" so it is easy to scan.
- PracticeTests: Schedule full-length tests (every 1-2 weeks). List as strings like "Week 2: Full-length practice test", "Week 4: Full-length practice test". Explain why these checkpoints matter.
- Strategies: Give encouraging, practical improvement strategies for weak areas (3-5 strategies). Frame them positively (e.g., "Focus on..." rather than "You're weak at..."). Make them specific and actionable.
- Be concise, structured, and encouraging - never use long paragraphs.
- Adjust difficulty based on target score: 1400+ = more hard questions, lower scores = focus on fundamentals.
- Focus extra practice on weakest section (use actual performance data if available), but frame it as "building strength" rather than "fixing weakness".
- Make schedule realistic and achievable based on hours per day - set students up for success.
- If student has already done practice tests, acknowledge their progress positively and adjust plan accordingly. Celebrate their commitment.

Only output the JSON object. No extra text.`,
        },
        {
          role: "user",
          content: `Create a personalized SAT study plan with these details:
- Target Score: ${targetScore || "Not specified"}
- Time until SAT: ${testDate || "Not specified"}
- Weakest Section: ${actualWeakestSection || "Not specified"}${performanceData ? ` (based on actual practice performance)` : ""}
- Hours per day available: ${hoursPerDay || "Not specified"}
- Study Style: ${studyStyle || "Not specified"}
${currentScore ? `- Current Estimated Score: ${currentScore} (from ${totalSessions} practice test${totalSessions !== 1 ? 's' : ''})` : ""}
${notes ? `- Additional Notes: ${notes}` : ""}
${performanceData ? `- Performance Data: Student has completed ${totalSessions} practice test${totalSessions !== 1 ? 's' : ''} with an average score of ${currentScore}. Use this actual data to create a more targeted plan.` : ""}

Generate a complete study plan with weekly plan, daily plan, practice test schedule, and improvement strategies.${currentScore && targetScore ? ` Focus on closing the gap from ${currentScore} to ${targetScore}.` : ""}`,
        },
      ],
      response_format: { type: "json_object" },
      }),
      2,
      60000
    );

    const responseText = cachedResponse ? JSON.stringify(cachedResponse) : (completion?.choices[0].message?.content || "{}");
    let planJSON;

    try {
      planJSON = JSON.parse(responseText);
    } catch (parseError) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planJSON = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse JSON response");
      }
    }

    const enforceFeatureTask = (task: string): string => {
      const lower = task.toLowerCase();
      const hasFeature =
        lower.includes("practice test") ||
        lower.includes("flashcard") ||
        lower.includes("micro-lesson") ||
        lower.includes("study plan") ||
        lower.includes("progress");
      if (hasFeature) return task;
      return `15–20 min: Micro-Lessons on ${actualWeakestSection || "priority SAT skills"}`;
    };

    const getTaskCap = (hours?: string, planType: "daily" | "weekly" = "daily") => {
      const normalized = (hours || "").toLowerCase();
      if (normalized.includes("30 min")) return planType === "daily" ? 2 : 3;
      if (normalized.includes("1 hour")) return planType === "daily" ? 3 : 4;
      if (normalized.includes("2 hours")) return planType === "daily" ? 4 : 5;
      if (normalized.includes("3+")) return planType === "daily" ? 5 : 6;
      return planType === "daily" ? 3 : 4;
    };

    const clampTasks = (tasks: string[], planType: "daily" | "weekly") => {
      const cap = getTaskCap(hoursPerDay, planType);
      return tasks.slice(0, cap);
    };

    const addTaskSectionPrefix = (task: string): string => {
      if (!task || typeof task !== "string") return task;
      if (/^Reading\s*&\s*Writing:/i.test(task) || /^Math:/i.test(task)) return task;
      const lower = task.toLowerCase();
      const isMath = /math|algebra|equation|linear|quadratic|function|geometry|percent|ratio|statistics|probability|graph|slope|circle|inequal|exponent|radical|system/i.test(lower);
      const isRW = /reading|writing|grammar|punctuation|transition|evidence|vocabulary|syntax|boundary|rhetorical|concision|agreement|modifier/i.test(lower);
      if (isMath && !isRW) return `Math: ${task}`;
      if (isRW && !isMath) return `Reading & Writing: ${task}`;
      return `Reading & Writing: ${task}`;
    };

    // Clean and validate plan data
    const cleanedPlan = {
      overview: ensureBoldEmphasis(cleanText(truncateText(planJSON.overview || "", 500))),
      weeklyPlan: (planJSON.weeklyPlan || []).map((week: any) => ({
        week: week.week || 1,
        focus: ensureBoldEmphasis(cleanText(truncateText(week.focus || "", 100))),
        tasks: clampTasks(
          (week.tasks || []).map((task: string) =>
            ensureBoldEmphasis(
              addTaskSectionPrefix(
                ensureTaskDuration(enforceFeatureTask(cleanText(truncateText(task, 200))))
              )
            )
          ),
          "weekly"
        ),
      })),
      dailyPlan: (planJSON.dailyPlan || []).map((day: any) => ({
        day: ensureBoldEmphasis(cleanText(truncateText(day.day || "", 50))),
        tasks: clampTasks(
          (day.tasks || []).map((task: string) =>
            ensureBoldEmphasis(
              addTaskSectionPrefix(
                ensureTaskDuration(enforceFeatureTask(cleanText(truncateText(task, 200))))
              )
            )
          ),
          "daily"
        ),
      })),
      practiceTests: (planJSON.practiceTests || []).map((test: string) =>
        ensureBoldEmphasis(ensureTaskDuration(enforceFeatureTask(cleanText(truncateText(test, 150)))))
      ),
      strategies: (planJSON.strategies || []).map((strategy: string) =>
        ensureBoldEmphasis(cleanText(truncateText(strategy, 200)))
      ),
    };

    // Transform to match frontend format while preserving new format
    const transformedPlan = {
      // New format fields
      overview: cleanedPlan.overview,
      weeklyPlan: cleanedPlan.weeklyPlan,
      dailyPlan: cleanedPlan.dailyPlan,
      practiceTests: cleanedPlan.practiceTests,
      strategies: cleanedPlan.strategies,
      // Legacy format for frontend compatibility
      timeframe: studyStyle === "Short daily sessions" ? "daily" : "weekly",
      days: cleanedPlan.dailyPlan,
    };

    const { user, sessionId } = accessContext;

    await prisma.studyPlan.create({
      data: {
        userId: user?.id,
        sessionId,
        plan: JSON.stringify(transformedPlan),
      },
    });

    if (!cachedResponse) {
      setCachedValue(cacheKey, transformedPlan);
    }

    return NextResponse.json(transformedPlan);
  } catch (error: any) {
    return handleApiError(error);
  }
}

