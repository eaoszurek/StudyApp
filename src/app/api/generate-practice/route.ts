import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  validateQuestionFormat,
  cleanMathNotation,
  cleanText,
  removeDuplicates,
  truncateText,
  applyBoldToMarkedTarget,
  ensureSingleSkill,
  ensureBoldEmphasis,
  formatEquationLineBreaks,
  isPlaceholderOptionText,
  normalizeForSimilarity,
  areNearDuplicateQuestions,
  likelySatStyleQuestion,
  hasGenericSatStem,
} from "@/utils/aiValidation";
import { questionAlignsWithLockedTopic } from "@/utils/practiceTopicAlignment";
import {
  questionAlignsWithLockedDifficulty,
  type LockedDifficulty,
} from "@/utils/practiceDifficultyAlignment";

const GraphDataSchema = z.object({
  type: z.enum(["bar", "line", "scatter"]),
  labels: z.array(z.string()),
  datasets: z.array(
    z.object({
      label: z.string(),
      data: z.array(z.number()),
      scatterData: z.array(z.object({ x: z.number(), y: z.number() })),
    })
  ),
  xLabel: z.string(),
  yLabel: z.string(),
});

const QuestionExplanationIncorrectSchema = z.object({
  A: z.string().nullable(),
  B: z.string().nullable(),
  C: z.string().nullable(),
  D: z.string().nullable(),
});

const GeneratedQuestionSchema = z.object({
  passage: z.string().nullable(),
  question: z.string(),
  options: z.array(z.string()),
  section: z.enum(["Reading & Writing", "Math"]),
  skillCategory: z.string(),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation_correct: z.string(),
  explanation_incorrect: QuestionExplanationIncorrectSchema,
  strategy_tip: z.string(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  graphData: GraphDataSchema.nullable(),
  desmosExpression: z.string().nullable(),
});

const PracticeResponseSchema = z.object({
  passage: z.string().nullable(),
  questions: z.array(GeneratedQuestionSchema),
});
import { validateApiKey, handleApiError, withRetry, getCachedValue, setCachedValue } from "@/utils/apiHelpers";
import { rateLimit } from "@/lib/rate-limit";
import { checkPremiumGate, getAccessContext } from "@/utils/premiumGate";
import { prisma } from "@/lib/prisma";

// Allow longer-running generations in hosted environments (best effort; platform limits still apply)
export const maxDuration = 300;

// Validate API key on module load
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set in environment variables");
}

// Zod schema for input validation
const PracticeRequestSchema = z.object({
  section: z.enum(["math", "reading", "writing"], {
    message: "Section must be math, reading, or writing",
  }),
  questionCount: z.number().int().min(1).max(50).default(5),
  topic: z.string().max(200).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard", "Mixed"]).optional(),
  existingTestId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Validate API key
    const apiKeyError = validateApiKey();
    if (apiKeyError) return apiKeyError;

    // Parse and validate request body
    const body = await req.json();
    const validationResult = PracticeRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { section, questionCount = 5, topic, difficulty, existingTestId } = validationResult.data;
    const topicTrimmed = (topic ?? "").trim();
    const topicLocked = Boolean(topicTrimmed);
    const difficultyLocked = Boolean(difficulty && difficulty !== "Mixed");
    // Topic lock must remain strict to avoid cross-topic drift.
    // Difficulty lock can still be respected while allowing fallback completion.
    const strictConfigNoFallback = topicLocked;

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

    let existingPracticeTest: { id: string; questions: string | null; passage: string | null } | null = null;

    if (existingTestId) {
      existingPracticeTest = await prisma.practiceTest.findFirst({
        where: { id: existingTestId, userId: accessContext.user.id },
        select: { id: true, questions: true, passage: true },
      });

      if (!existingPracticeTest) {
        return NextResponse.json(
          { error: "Existing practice test not found for this user/session." },
          { status: 404 }
        );
      }
    } else {
      const gate = await checkPremiumGate(accessContext);
      if (!gate.allowed) {
        return NextResponse.json(
          { error: "Free starter limit reached. Unlock Plus for $5/month to continue." },
          { status: 402 }
        );
      }
    }

    const sectionGuidelines = {
      math: `[MATH SECTION - Official SAT Skill Domains]
Generate questions aligned with these SAT Math skill domains:

**Heart of Algebra (35% of section):**
- Linear equations, systems of equations, linear inequalities, linear functions, graphing, slope/intercepts
- Word problems involving linear relationships
- Real-world scenarios (cost, distance, time, etc.)

**Problem Solving & Data Analysis (15% of section):**
- Ratios, proportions, percentages, unit conversions
- Statistics: mean, median, mode, range, standard deviation
- Data interpretation: tables, charts, scatterplots, line graphs
- Probability: simple and compound events
- Percent increase/decrease, percent error

**Passport to Advanced Math (35% of section):**
- Quadratic equations: factoring, completing the square, quadratic formula
- Polynomials: operations, factoring, polynomial functions
- Exponential functions: growth/decay, compound interest
- Radical expressions: simplifying, operations
- Rational expressions: simplifying, operations
- Nonlinear functions: quadratic, exponential, radical

**Additional Topics (15% of section):**
- Geometry: area, perimeter, volume, surface area, angles, triangles, circles
- Circle equations: standard form, center, radius
- Trigonometry: SOHCAHTOA, right triangles, unit circle basics
- Complex numbers: operations, i² = -1
- Coordinate geometry: distance, midpoint, transformations

CRITICAL SAT MATH REQUIREMENTS:
- Use SAT-appropriate numbers (avoid overly complex calculations)
- Questions should be solvable without calculator (unless it's a calculator-allowed section)
- Include word problems that test real-world application
- Use realistic scenarios: science, business, social studies contexts
- NO special characters like ^ - use actual superscripts (x², x³) or write "to the power of"
- Match real SAT question style: clear, concise, unambiguous wording
- Include questions that test conceptual understanding, not just computation
- Avoid repetitive stems like "What is the value of x?" (use varied, SAT-style phrasing)
- Vary question formats within a set: equation solving, word problems, data interpretation, geometry, functions
- Avoid near-duplicate setups that only swap numbers; change context and structure
- Include at least 1 word problem in each 5-question chunk of a math set
- For each SAT Math subcategory included, include at least one word problem that fits that subcategory
- One-step equations should be rare and only appear early in the set
- For MIXED difficulty math sets, order questions to progress: early Easy→Medium, middle Medium, late Medium→Hard`,
      reading: `[READING SECTION - Official SAT Skill Domains]
Generate questions aligned with these SAT Reading skill domains:

**Information & Ideas (28% of section):**
- Main idea: central claim or primary purpose
- Supporting details: specific evidence, examples, data
- Central ideas: key themes and concepts
- Summarizing: condensing main points
- Textual evidence: "Which choice provides the best evidence for the answer to the previous question?"

**Craft & Structure (28% of section):**
- Vocabulary in context: determine meaning from surrounding text
- Word choice: why author chose specific words (tone, precision, connotation)
- Text structure: how passage is organized (chronological, cause-effect, compare-contrast)
- Author's purpose: inform, persuade, entertain, analyze
- Point of view: first-person, third-person, perspective
- Rhetorical analysis: how author uses language to achieve purpose

**Integration of Knowledge & Ideas (14% of section):**
- Comparing texts: similarities and differences between passages
- Analyzing arguments: evaluate reasoning, identify assumptions
- Evaluating evidence: assess strength of support
- Data interpretation: analyze graphs, charts, tables in context

**Passage Types (must include variety):**
1. Literature: fiction, literary nonfiction (1 passage)
2. History/Social Studies: historical documents, speeches, essays (1-2 passages)
3. Science: biology, chemistry, physics, earth science (2-3 passages)
4. Paired passages: two related passages with comparison questions

CRITICAL SAT READING REQUIREMENTS:
- Passages should be 3-6 sentences for micro-practice (real SAT: 500-750 words)
- Use authentic SAT-style language: academic, formal, precise
- Include diverse passage types across questions
- Questions must reference specific lines or evidence from passage
- Include "best evidence" questions that reference previous answers
- Vocabulary questions should test context clues, not memorization
- Questions should test reasoning, not just recall
- Match real SAT question style: clear, specific, evidence-based
- Vary question types within a set (vocab-in-context, evidence, inference, structure, purpose, data) and avoid repeating stems`,
      writing: `[WRITING SECTION - Official SAT Skill Domains]
Generate questions aligned with these SAT Writing skill domains:

**Expression of Ideas (24% of section):**
- Transitions: logical connectors (however, therefore, furthermore, etc.)
- Sentence placement: where should a sentence be inserted?
- Paragraph organization: logical order of sentences
- Rhetorical synthesis: combine information from multiple sources
- Logical sequence: chronological, cause-effect, spatial order
- Conciseness: eliminate redundancy, wordiness
- Precision: choose most precise word
- Style and tone: maintain consistency

**Standard English Conventions (26% of section):**
- Subject-verb agreement: singular/plural matching
- Pronoun agreement: pronoun-antecedent matching, case (I/me, who/whom)
- Verb tense: consistency, correct tense usage
- Parallel structure: lists, comparisons, correlative conjunctions
- Modifier placement: misplaced and dangling modifiers
- Punctuation:
  * Commas: lists, introductory elements, nonessential clauses, compound sentences
  * Apostrophes: possessives, contractions
  * Colons: introduce lists, explanations
  * Semicolons: join independent clauses, separate list items with commas
- Idioms: correct preposition usage, common phrases
- Word choice: correct vs. incorrect word usage
- Sentence boundaries: run-ons, fragments, comma splices

CRITICAL SAT WRITING REQUIREMENTS:
- Provide a sentence or short paragraph with an underlined portion
- Show the full sentence/paragraph with the underlined part clearly marked
- Focus on ONE specific grammar rule or writing concept per question
- Include "NO CHANGE" as an option when appropriate
- "NO CHANGE" must be correct only sometimes (roughly 20-30% of writing questions). It must NOT be the correct answer for most items in a set.
- If you include a no-change choice, write it exactly as "NO CHANGE" (not "No change to X", not paraphrased).
- Never include a second option that is identical to the currently underlined word/phrase when "NO CHANGE" is present.
- In each 5-question block, vary the four answer choices; do not reuse the same option set across multiple questions.
- Test common SAT grammar errors, not obscure rules
- Questions should test editing skills, not just identification
- Match real SAT question style: clear, unambiguous, test practical editing skills
- Include questions that test both correctness and effectiveness
- Vary question types within a set (transitions, boundaries, concision, precision, synthesis) and avoid repeating stems`,
    };

    const satRwQuestionTypes = [
      "Central Ideas & Details",
      "Command of Evidence (Textual)",
      "Command of Evidence (Quantitative)",
      "Inferences",
      "Words in Context",
      "Cross-text Connections",
      "Rhetorical Synthesis",
      "Transitions",
      "Boundaries",
      "Form, Structure & Sense",
      "Subject-Verb Agreement",
      "Pronoun-Antecedent Agreement",
      "Verb Tense & Aspect",
      "Modifiers",
      "Linking Clauses",
    ];

    const satStemTemplates = [
      "Which choice completes the text with the most logical and precise word or phrase?",
      "Which choice most logically completes the text?",
      "Which finding from the study, if true, would most directly support the researcher's claim?",
      "Which choice best states the main purpose of the text?",
      "Which choice best describes the overall structure of the text?",
      "Which choice best describes the function of the underlined sentence?",
      "As used in the text, what does the word ___ most nearly mean?",
      "Based on the texts, how would Author 2 most likely respond to Author 1's claim?",
      "Which transition word or phrase best connects the two sentences?",
      "Which choice best maintains the sentence pattern already established in the text?",
      "For a research report, which choice most effectively uses relevant information from the notes?",
    ];

    const buildSystemPrompt = (requestedCount: number) => `You are an expert SAT question generator trained on the Digital SAT framework. Create questions that feel authentic and closely match real Digital SAT style in wording, difficulty, and format. Return ONLY valid JSON — no markdown, no extra text.

{
  "passage": "string or null",
  "questions": [
    {
      "passage": "string or null",
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "section": "Reading & Writing" | "Math",
      "skillCategory": "specific SAT sub-skill (e.g. 'Linear Equations', 'Transitions', 'Vocabulary in Context')",
      "correctAnswer": "A" | "B" | "C" | "D",
      "explanation_correct": "string",
      "explanation_incorrect": { "A": "string|null", "B": "string|null", "C": "string|null", "D": "string|null" },
      "strategy_tip": "string",
      "difficulty": "Easy" | "Medium" | "Hard",
      "graphData": null,
      "desmosExpression": null
    }
  ]
}

ABSOLUTE RULES:
- Generate exactly ${requestedCount} questions.
- Always exactly 4 options (A–D). Never use placeholder text ("text", "string", "option", "answer").
- Distractors must be plausible near-misses — wrong for one specific, testable reason (sign error, misread detail, wrong operation, constraint miss).
- Never output anything except the JSON.
${
  topicLocked
    ? `- TOPIC LOCK: Every question tests ONLY "${topicTrimmed}". skillCategory must be "${topicTrimmed}" or a direct sub-skill. Do NOT drift to other SAT domains.`
    : `- Each question must use a DIFFERENT skillCategory — no two questions in a 5-question block share the same sub-skill. Use specific sub-skill names (e.g. "Linear Equations", "Transitions", "Vocabulary in Context") — not broad domain names.`
}
${
  difficultyLocked && difficulty && difficulty !== "Mixed"
    ? `- DIFFICULTY LOCK: Every question must be ${difficulty.toUpperCase()} per the rubric below. Do not mix in other difficulties.`
    : `- Tag each question with its TRUE difficulty. Roughly 20% Easy, 60% Medium, 20% Hard.`
}

DIFFICULTY RUBRIC (SAT-calibrated):
- Easy (SAT ~400–500): 1–2 direct steps, no hidden traps, clear unambiguous setup.
- Medium (SAT ~550–650): 2–3 steps, requires method selection or mild abstraction.
- Hard (SAT ~700+): Multi-concept reasoning, non-obvious setup, deliberate trap answer included. A short or concise question can still be Hard — length alone does not determine difficulty.

${sectionGuidelines[section as keyof typeof sectionGuidelines] || sectionGuidelines.math}

FORMAT BY SECTION:
- Math: Self-contained questions. Use Digital SAT stems ("What value of x satisfies…", "Function f is defined by…", "In the xy-plane…"). At least 1 word problem per 5 questions. Vary types (equations, word problems, functions, geometry).
- Reading: "passage" field = 50–150 words, excerpt style (never "This passage is about…"). "question" field = ONLY the question text, never the passage text. Vary question types (evidence, inference, vocab-in-context, structure, purpose).
- Writing: "passage" field = sentence/paragraph with revision target in [brackets]. "NO CHANGE" as an option only when original is correct (20–30% of questions max). Never repeat identical option sets within a block.

VARIETY: No near-duplicate stems or scenarios. Each question in a set should feel distinct in context and structure.

EXPLANATIONS (keep concise):
- explanation_correct: 1–2 short sentences on why the answer is correct.
- explanation_incorrect: one sentence per wrong choice naming the specific mistake.
- strategy_tip: one short actionable sentence.

${topicLocked ? `TOPIC REMINDER: "${topicTrimmed}" only — every question must stay on this topic.` : topic ? `Focus area: ${topic}` : ""}
${difficulty && difficulty !== "Mixed"
  ? `DIFFICULTY REMINDER: All questions must be ${difficulty.toUpperCase()}. Do not water down.`
  : ""}
`;

    // Create completion with timeout
    // Always generate a fresh set so users do not repeatedly receive the same test.
    const shouldUseCache = false;
    const cacheKey = `generate-practice:v5-specific-skills:${JSON.stringify({ section, questionCount, topic, difficulty })}`;
    const cachedResponse = shouldUseCache ? getCachedValue<any>(cacheKey) : null;

    const MAX_BLOCK_ATTEMPTS = topicLocked || difficultyLocked ? 4 : 2;
    const MAX_SET_ATTEMPTS = strictConfigNoFallback ? 2 : 1;
    const generationStartedAt = Date.now();
    const generationDeadlineMs = strictConfigNoFallback
      ? questionCount >= 20
        ? 180000
        : questionCount >= 10
          ? 120000
          : 90000
      : questionCount >= 20
        ? 120000
        : questionCount >= 10
          ? 75000
          : 55000;
    const isPastDeadline = () => Date.now() - generationStartedAt > generationDeadlineMs;

    const parseModelJson = (responseText: string) => {
      const text = String(responseText || "{}").trim();
      if (!text) return {};
      try {
        return JSON.parse(text);
      } catch {
        // Common fallback: model wraps JSON in code fences.
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenced?.[1]) {
          try {
            return JSON.parse(fenced[1].trim());
          } catch {
            // continue to broad extraction
          }
        }

        // Broad fallback: extract first JSON object span.
        const firstBrace = text.indexOf("{");
        const lastBrace = text.lastIndexOf("}");
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          const sliced = text.slice(firstBrace, lastBrace + 1);
          return JSON.parse(sliced);
        }
        throw new Error("Invalid response format from model.");
      }
    };

    const modelCandidates = Array.from(
      new Set(
        [
          process.env.OPENAI_PRACTICE_MODEL?.trim(),
          "gpt-4o-mini",
          "gpt-4o",
        ].filter(Boolean) as string[]
      )
    );

    const longCriticalSkillRules = topicLocked
      ? `- Each question must assess ONLY the student-selected topic "${topicTrimmed}" (or a clear sub-skill under it). skillCategory must be "${topicTrimmed}" or a tighter sub-label that obviously belongs under that topic. Do NOT use unrelated SAT skills.\n- Vary stems, numbers, and contexts while staying on-topic; do not vary by jumping to other domains.`
      : `- Each question must target exactly ONE specific SAT sub-skill (e.g. "Linear Equations", "Systems of Equations", "Ratios & Proportions", "Quadratic Functions", "Exponential Growth", "Geometry: Triangles", "Trigonometry", "Subject-Verb Agreement", "Pronoun Agreement", "Parallel Structure", "Transitions", "Punctuation: Commas", "Vocabulary in Context", "Textual Evidence", "Author's Purpose"). Do NOT use broad domain names like "Heart of Algebra" or "Standard English Conventions" — always give the specific sub-skill name.\n- Each question in a set must have a DIFFERENT skillCategory (no two questions share the same sub-skill within a 5-question block).`;

    const varietyRequirementsBlock = topicLocked
      ? `VARIETY (topic-locked mode):
- Change scenarios and wording between questions, but remain 100% on "${topicTrimmed}".
- Do not introduce other SAT topics to create variety.`
      : `VARIETY REQUIREMENTS (all sections):
- Avoid repeating question stems or near-identical scenarios within a set.
- Math: include at least one word problem per 5 questions, plus non-word problems; vary domains and representations (equations, graphs, tables).
- Reading/Writing: vary question types across official SAT domains and avoid identical phrasing.`;

    const authenticityMathBullet = topicLocked
      ? `- Math: Authentic Digital SAT style for "${topicTrimmed}" only; word problems only when they genuinely fit this topic (do not use generic algebra word problems as filler).`
      : `- Math: Include word problems with real-world contexts`;

    const sectionForAlignment = section as "math" | "reading" | "writing";

    const applyConfigFilters = <
      T extends {
        question?: string;
        passage?: string | null;
        skillCategory?: string;
        skillFocus?: string;
      },
    >(
      list: T[]
    ): T[] => {
      let out = list;
      if (topicLocked) {
        out = out.filter((q) =>
          questionAlignsWithLockedTopic(topicTrimmed, sectionForAlignment, {
            question: String(q.question || ""),
            skillCategory: q.skillCategory,
            skillFocus: q.skillFocus,
          })
        );
      }
      if (difficultyLocked && difficulty && difficulty !== "Mixed") {
        const lockedDiff = difficulty as LockedDifficulty;
        out = out.filter((q) =>
          questionAlignsWithLockedDifficulty({
            question: String(q.question || ""),
            passage: q.passage,
            section: sectionForAlignment,
            locked: lockedDiff,
          })
        );
      }
      return out;
    };

    const getModelPayload = async (
      requestedCount: number,
      extraInstructions = "",
      options: { timeoutMs?: number; attempts?: number } = {}
    ) => {
      const timeoutMs =
        options.timeoutMs ??
        (strictConfigNoFallback
          ? requestedCount >= 20
            ? 55000
            : requestedCount >= 10
              ? 45000
              : 35000
          : requestedCount >= 20
            ? 45000
            : requestedCount >= 10
              ? 35000
              : 25000);
      const attempts = options.attempts ?? (requestedCount >= 15 ? 2 : 1);
      let lastModelError: unknown;
      for (const modelName of modelCandidates) {
        try {
          const completion = await withRetry(
            () => getOpenAIClient().chat.completions.create({
      model: modelName,
      temperature: 0.45,
      max_tokens: Math.min(8000, Math.max(2400, requestedCount * 700)),
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(requestedCount),
        },
        {
          role: "user",
          content: `Generate ${requestedCount} SAT ${section} questions.${
            topicLocked ? ` REQUIRED TOPIC FOR EVERY QUESTION: "${topicTrimmed}".` : topic ? ` Focus on: ${topic}.` : ""
          }${difficulty && difficulty !== "Mixed" ? ` All questions must be ${difficulty.toUpperCase()} difficulty (SAT-calibrated); do not water down.` : ""}${
            extraInstructions ? ` ${extraInstructions}` : ""
          }`,
        },
      ],
      response_format: zodResponseFormat(PracticeResponseSchema, "practice_tests"),
            }),
            attempts,
            timeoutMs
          );
          const responseText = completion.choices[0].message?.content || "{}";
          const data = parseModelJson(responseText);
    
          if (!Array.isArray(data.questions) || data.questions.length === 0) {
            throw new Error("Invalid response format from model.");
          }
    
          // Clean passage if provided
          if (data.passage && typeof data.passage === "string") {
            data.passage = cleanText(truncateText(data.passage, 2000));
          }

          return data;
        } catch (modelError: any) {
          lastModelError = modelError;
          const msg = String(modelError?.message || "").toLowerCase();
          const isModelSupportError =
            modelError?.status === 400 &&
            (msg.includes("model") || msg.includes("unsupported") || msg.includes("not found"));
          const isTimeout = msg.includes("timeout");

          // Try another model candidate if this one is unavailable or timed out.
          if (isModelSupportError || isTimeout) {
            console.warn(`Model ${modelName} failed, trying fallback model.`, modelError?.message || modelError);
            continue;
          }
          throw modelError;
        }
      }
      throw lastModelError ?? new Error("Model generation failed.");
    };

    const sanitizeGraphData = (input: any) => {
      if (!input || typeof input !== "object") return undefined;
      const graphType = String(input.type || "").toLowerCase();
      if (!["bar", "line", "scatter"].includes(graphType)) return undefined;
      const labels = Array.isArray(input.labels)
        ? input.labels.map((label: any) => cleanText(truncateText(String(label || ""), 40))).filter(Boolean).slice(0, 20)
        : [];
      if (labels.length === 0 && graphType !== "scatter") return undefined;
      const rawDatasets = Array.isArray(input.datasets) ? input.datasets.slice(0, 3) : [];
      if (rawDatasets.length === 0) return undefined;

      const datasets = rawDatasets
        .map((dataset: any) => {
          const label = cleanText(truncateText(String(dataset?.label || "Dataset"), 40));
          const data = Array.isArray(dataset?.data) ? dataset.data : [];
          const scatterData = Array.isArray(dataset?.scatterData) ? dataset.scatterData : data;
          if (graphType === "scatter") {
            const scatterPoints = scatterData
              .map((point: any) => {
                const x = Number(point?.x);
                const y = Number(point?.y);
                if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
                return { x, y };
              })
              .filter(Boolean)
              .slice(0, 40);
            if (scatterPoints.length === 0) return null;
            return { label, data: scatterPoints };
          }
          const numericData = data
            .map((value: any) => Number(value))
            .filter((value: number) => Number.isFinite(value))
            .slice(0, labels.length || 20);
          if (numericData.length === 0) return null;
          return { label, data: numericData };
        })
        .filter(Boolean);

      if (datasets.length === 0) return undefined;
      return {
        type: graphType,
        labels: graphType === "scatter" ? [] : labels,
        datasets,
        xLabel: cleanText(truncateText(String(input.xLabel || ""), 30)),
        yLabel: cleanText(truncateText(String(input.yLabel || ""), 30)),
      };
    };

    const sanitizeDesmosExpression = (input: any) => {
      if (typeof input !== "string") return undefined;
      const trimmed = input.trim();
      if (!trimmed) return undefined;
      if (trimmed.length > 120) return undefined;
      if (!/^[A-Za-z0-9+\-*/^=().,_\s|<>]+$/.test(trimmed)) return undefined;
      return trimmed;
    };

    const transformQuestions = (rawQuestions: any[], passage?: string): Record<string, any>[] => {
      const transformed: Array<Record<string, any> | null> = rawQuestions
        .map((q: any, index: number) => {
          const rawPassageForQuestion =
            typeof q.passage === "string" && q.passage.trim().length > 0 ? q.passage.trim() : passage;
          const passageForQuestion =
            typeof rawPassageForQuestion === "string" && rawPassageForQuestion.length > 0
              ? cleanMathNotation(cleanText(rawPassageForQuestion))
              : rawPassageForQuestion;

          // Clean and validate question
          let questionText = cleanMathNotation(cleanText(q.question || ""));
          if (section === "math") {
            questionText = formatEquationLineBreaks(questionText);
          }
          
          // For reading questions, remove passage text from question if it's duplicated
          if (section === "reading" && passageForQuestion && questionText) {
            // Check if question text contains passage (indicating duplication)
            const passageFirst50 = passageForQuestion.substring(0, 50).trim();
            if (questionText.includes(passageFirst50)) {
              // If question contains passage text, try to remove it
              questionText = questionText.replace(passageForQuestion, "").trim();
              // Also handle case where passage might be at the start followed by question
              const passageStart = passageForQuestion.split(/[.!?]/)[0]?.trim();
              if (passageStart && questionText.startsWith(passageStart)) {
                questionText = questionText.substring(passageStart.length).trim();
              }
            }
          }

          // Ensure reading question text never ends up blank after cleanup.
          if (section === "reading" && (!questionText || questionText.trim().length === 0)) {
            questionText = "Which choice is best supported by the passage?";
          }


          
          // Truncate if too long
          questionText = truncateText(questionText, 500);

          let finalPassage = passageForQuestion;
          if (section === "writing") {
            if (passageForQuestion) {
              const withTargetMarkup = ensureWritingTargetMarkup(passageForQuestion);
              const boldedPassage = applyBoldToMarkedTarget(withTargetMarkup);
              finalPassage = boldedPassage.valid ? boldedPassage.text : withTargetMarkup;
              // Keep brackets/underlines in the passage, not the question prompt text.
              questionText = questionText.replace(/\[([^\]]+)\]/g, "$1");
            } else {
              const withTargetMarkup = ensureWritingTargetMarkup(questionText);
              const bolded = applyBoldToMarkedTarget(withTargetMarkup);
              questionText = bolded.valid ? bolded.text : withTargetMarkup;
            }
          }

          if ((section === "reading" || section === "writing") && finalPassage) {
            const words = String(finalPassage).trim().split(/\s+/).filter(Boolean).length;
            if (words < 25 || words > 250) {
              console.warn(`Soft filter: passage word count ${words} outside 25-250 range, keeping question`);
            }
          }
          
          // Clean options
          const cleanedOptions: Record<string, string> = {};
          if (Array.isArray(q.options)) {
            q.options.slice(0, 4).forEach((opt: string, i: number) => {
              const letter = String.fromCharCode(65 + i);
              const normalizedRaw = cleanMathNotation(cleanText(truncateText(opt, 200)))
                .replace(/^\s*[A-D][\)\.\:\-]\s*/i, "")
                .replace(/^\s*[A-D]\s+/i, "");
              cleanedOptions[letter] = normalizedRaw;
            });
          } else {
            // Fallback if already in object format
            cleanedOptions.A = cleanMathNotation(cleanText(truncateText(q.options.A || q.options[0] || "", 200)))
              .replace(/^\s*[A-D][\)\.\:\-]\s*/i, "")
              .replace(/^\s*[A-D]\s+/i, "");
            cleanedOptions.B = cleanMathNotation(cleanText(truncateText(q.options.B || q.options[1] || "", 200)))
              .replace(/^\s*[A-D][\)\.\:\-]\s*/i, "")
              .replace(/^\s*[A-D]\s+/i, "");
            cleanedOptions.C = cleanMathNotation(cleanText(truncateText(q.options.C || q.options[2] || "", 200)))
              .replace(/^\s*[A-D][\)\.\:\-]\s*/i, "")
              .replace(/^\s*[A-D]\s+/i, "");
            cleanedOptions.D = cleanMathNotation(cleanText(truncateText(q.options.D || q.options[3] || "", 200)))
              .replace(/^\s*[A-D][\)\.\:\-]\s*/i, "")
              .replace(/^\s*[A-D]\s+/i, "");
          }
          if (!cleanedOptions.A || !cleanedOptions.B || !cleanedOptions.C || !cleanedOptions.D) {
            return null;
          }

          if (section === "writing") {
            const targetPhrase = extractMarkedTarget(finalPassage || questionText);
            const normalizedTarget = normalizeCompare(targetPhrase);
            const normalizedOptions = Object.entries(cleanedOptions).map(([letter, opt]) => {
              const normalized = normalizeWritingOption(opt);
              return [letter, isNoChangeOption(normalized) ? "NO CHANGE" : normalized] as const;
            });
            const deduped = new Set(
              normalizedOptions
                .map(([, opt]) => normalizeCompare(opt))
                .filter(Boolean)
            );
            if (deduped.size < 4) {
              return null;
            }
            if (normalizedOptions.some(([, opt]) => !normalizeCompare(opt))) {
              return null;
            }
            if (
              normalizedTarget &&
              normalizedOptions.some(
                ([, opt]) => !isNoChangeOption(opt) && normalizeCompare(opt) === normalizedTarget
              )
            ) {
              return null;
            }
            normalizedOptions.forEach(([letter, opt]) => {
              cleanedOptions[letter] = opt;
            });
          }

          // Reject placeholder options from model output (e.g., "text", "string", "option")
          const hasPlaceholderOption = Object.values(cleanedOptions).some((opt) =>
            isPlaceholderOptionText(String(opt || ""))
          );
          if (hasPlaceholderOption) {
            return null;
          }

          const normalizedOptionSet = new Set(
            Object.values(cleanedOptions).map((opt) => normalizeCompare(String(opt || ""))).filter(Boolean)
          );
          if (normalizedOptionSet.size < 4) {
            return null;
          }

          if (
            !likelySatStyleQuestion({
              section,
              question: questionText,
              passage: String(finalPassage || ""),
              options: Object.values(cleanedOptions),
            })
          ) {
            console.warn("Soft filter: question did not pass likelySatStyleQuestion, keeping");
          }

          if (
            (section === "reading" || section === "writing") &&
            hasGenericSatStem(questionText) &&
            String(finalPassage || "").length < 140
          ) {
            console.warn("Soft filter: generic SAT stem with short passage, keeping");
          }

          if (section === "writing") {
            const skillLower = String(q.skillCategory || q.skillFocus || "").toLowerCase();
            const questionLower = String(questionText || "").toLowerCase();
            const hasTransitionSkillOrPrompt =
              skillLower.includes("transition") || questionLower.includes("transition");
            if (hasTransitionSkillOrPrompt) {
              const passageText = String(finalPassage || "").toLowerCase();
              const positiveSignals = ["furthermore", "moreover", "additionally", "also"];
              const contrastSignals = ["however", "nevertheless", "in contrast", "by contrast"];
              const hasPositive = positiveSignals.some((w) => passageText.includes(w));
              const hasContrast = contrastSignals.some((w) => passageText.includes(w));
              if (!hasPositive && !hasContrast) {
                console.warn("Soft filter: writing transition question lacks transition signals, keeping");
              }
            }
          }
          
          // Keep explanations concise for faster generation and rendering
          let explanationCorrect = cleanText(truncateText(q.explanation_correct || q.explanation || "", 220));
          const explanationIncorrect: Record<string, string> = {};
          if (q.explanation_incorrect && typeof q.explanation_incorrect === "object") {
            Object.entries(q.explanation_incorrect).forEach(([letter, reason]) => {
              if (letter !== q.correctAnswer && reason) {
                explanationIncorrect[letter] = cleanText(truncateText(reason as string, 140));
              }
            });
          }
          
          let strategyTip = cleanText(truncateText(q.strategy_tip || "", 120));
          if (!explanationCorrect) {
            explanationCorrect = "The correct option best matches the SAT skill tested in this question.";
          }
          
          // Validate question format
          const validation = validateQuestionFormat({
            question: questionText,
            options: Object.values(cleanedOptions),
            correctAnswer: q.correctAnswer,
            explanation_correct: explanationCorrect,
          });
          
          if (!validation.valid) {
            console.warn("Invalid question format:", validation.errors, q);
            return null; // Filter out invalid questions
          }
    
          // Determine difficulty: locked config wins; otherwise trust the model's own difficulty tag
          let questionDifficulty: "Easy" | "Medium" | "Hard" = "Medium";
          if (difficulty && difficulty !== "Mixed") {
            // User selected a specific difficulty — always enforce it
            questionDifficulty = difficulty as "Easy" | "Medium" | "Hard";
          } else if (q.difficulty && ["Easy", "Medium", "Hard"].includes(q.difficulty)) {
            // Trust the model's own assessment — a concise question can still be Hard
            questionDifficulty = q.difficulty;
          } else {
            // Fallback: position-based distribution when model didn't tag
            const easyCount = Math.max(1, Math.round(questionCount * 0.2));
            const hardCount = Math.max(1, Math.round(questionCount * 0.2));
            const hardStart = questionCount - hardCount;
            questionDifficulty = index < easyCount ? "Easy" : index >= hardStart ? "Hard" : "Medium";
          }
    
          // Prefer the AI's specific sub-skill, then fall back to topic, then section defaults
          let skillFocus = q.skillCategory || q.skillFocus || topic;

          if (!skillFocus) {
            const sectionDefaults = {
              math: "Problem Solving",
              reading: "Reading Comprehension",
              writing: "Grammar & Usage",
            };
            skillFocus = sectionDefaults[section as keyof typeof sectionDefaults] || section.charAt(0).toUpperCase() + section.slice(1);
          }
          const skillCategory = ensureSingleSkill(skillFocus, skillFocus);
          explanationCorrect = ensureBoldEmphasis(explanationCorrect, skillCategory);
          strategyTip = ensureBoldEmphasis(strategyTip, skillCategory);
    
          return {
            passage: finalPassage,
            question: questionText,
            options: cleanedOptions,
            correctAnswer: q.correctAnswer,
            explanation: explanationCorrect,
            explanation_correct: explanationCorrect,
            explanation_incorrect: explanationIncorrect,
            strategy_tip: strategyTip,
            difficulty: questionDifficulty,
            skillFocus: skillCategory,
            skillCategory,
            section: section === "math" ? "Math" : "Reading & Writing",
            graphData: sanitizeGraphData(q.graphData),
            desmosExpression: sanitizeDesmosExpression(q.desmosExpression),
          };
        });

      return transformed.flatMap((q) => (q ? [q] : []));
    };

    const normalizeMathStem = (text: string) => {
      return text
        .toLowerCase()
        .replace(/\d+(?:\.\d+)?/g, "#")
        .replace(/\b[xyz]\b/g, "x")
        .replace(/\s+/g, " ")
        .trim();
    };

    const normalizeRwStem = (text: string) =>
      normalizeForSimilarity(String(text || ""))
        .replace(/\bwhich choice\b/g, "choice")
        .replace(/\bbest\b/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const normalizeWritingOption = (text: string) =>
      String(text || "")
        .replace(/^\s*[A-D][\)\.\:\-]\s*/i, "")
        .replace(/^\s*[A-D]\s+/i, "")
        .replace(/\s+/g, " ")
        .trim();

    const isNoChangeOption = (text: string) => /^no\s*change\b/i.test(normalizeWritingOption(text));

    const extractMarkedTarget = (text: string) => {
      const bracketMatch = String(text || "").match(/\[([^\]]+)\]/);
      if (bracketMatch?.[1]) return bracketMatch[1].trim();
      const boldMatch = String(text || "").match(/\*\*([^*]+)\*\*/);
      if (boldMatch?.[1]) return boldMatch[1].trim();
      return "";
    };

    const normalizeCompare = (text: string) =>
      String(text || "")
        .replace(/[“”"']/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const getPassageSignature = (text: string) => {
      return text
        .replace(/\[([^\]]+)\]/g, "$1")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .slice(0, 140);
    };

    const getOptionSignature = (question: any) => {
      const options = Object.values(question?.options || {})
        .map((opt) => normalizeCompare(String(opt || "")))
        .filter(Boolean)
        .sort();
      return options.join("|");
    };

    const getRwSignatureSource = (question: any): string => {
      return String(question?.passage || question?.question || "");
    };

    const getWritingPatternKey = (question: any) => {
      const skill = normalizeCompare(String(question?.skillCategory || question?.skillFocus || ""));
      const questionStem = normalizeRwStem(String(question?.question || ""));
      const options = getOptionSignature(question);
      const hasNoChange = Object.values(question?.options || {}).some((opt) =>
        isNoChangeOption(String(opt || ""))
      );
      const transitionLike = /\btransition|connects|best connects|relationship\b/i.test(questionStem);
      return [skill, hasNoChange ? "has-no-change" : "no-no-change", transitionLike ? "transition" : "non-transition", options].join("::");
    };

    const isNearDuplicateQuestion = (candidate: any, pool: any[]) => {
      const candidateStem = String(candidate?.question || "");
      const candidatePassage = String(candidate?.passage || "");
      const candidateOptions = getOptionSignature(candidate);
      return pool.some((existing) => {
        const existingStem = String(existing?.question || "");
        const existingPassage = String(existing?.passage || "");
        const existingOptions = getOptionSignature(existing);
        const stemNearDuplicate = areNearDuplicateQuestions(candidateStem, existingStem, section === "math" ? 0.9 : 0.8);
        const passageNearDuplicate =
          section === "math"
            ? false
            : candidatePassage.length > 20 &&
              existingPassage.length > 20 &&
              areNearDuplicateQuestions(candidatePassage, existingPassage, 0.82);
        const optionsSame = candidateOptions && existingOptions && candidateOptions === existingOptions;
        return (stemNearDuplicate && optionsSame) || (stemNearDuplicate && passageNearDuplicate);
      });
    };

    const dedupeAndFilterNearDuplicates = (list: any[]) => {
      const deduped = removeDuplicates(list, (q: any) => getDedupKey(q));
      const out: any[] = [];
      for (const q of deduped) {
        if (!isNearDuplicateQuestion(q, out)) {
          out.push(q);
        }
      }
      return out;
    };

    const existingQuestionsForGeneration: any[] = (() => {
      try {
        if (!existingPracticeTest?.questions) return [];
        const parsed = JSON.parse(existingPracticeTest.questions);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();

    const existingRwSignatures = new Set<string>();
    if (section === "reading" || section === "writing") {
      for (let start = 0; start < existingQuestionsForGeneration.length; start += 5) {
        const firstInBlock = existingQuestionsForGeneration[start];
        if (!firstInBlock) continue;
        const signature = getPassageSignature(getRwSignatureSource(firstInBlock));
        if (signature) {
          existingRwSignatures.add(signature);
        }
      }
    }

    const ensureWritingTargetMarkup = (text: string) => {
      if (!text) return text;
      const normalized = text
        .replace(/\*\*(.+?)\*\*/g, "[$1]")
        .replace(/__(.+?)__/g, "[$1]")
        .replace(/<([^>]+)>/g, "[$1]");

      if (/\[[^\]]+\]/.test(normalized)) {
        return normalized;
      }

      const phraseMatch = normalized.match(/([A-Za-z][A-Za-z'’-]*(?:\s+[A-Za-z][A-Za-z'’-]*){1,5})/);
      if (!phraseMatch) {
        return normalized;
      }

      return normalized.replace(phraseMatch[1], `[${phraseMatch[1]}]`);
    };

    const isWordProblem = (text: string) => {
      return /percent|ratio|rate|speed|distance|time|hours|minutes|miles|cost|price|profit|loss|revenue|tickets|students|people|population|temperature|degrees|area|volume|length|width|height|mi|km|dollars|\$|per\s+hour|per\s+minute|per\s+day/i.test(text);
    };

    const getMathDomain = (skill: string) => {
      const normalized = skill.toLowerCase();
      if (/linear|system|inequal|slope|intercept|function|graph/i.test(normalized)) {
        return "Heart of Algebra";
      }
      if (/ratio|percent|stat|data|probab|scatter|table|chart|mean|median|mode|range/i.test(normalized)) {
        return "Problem Solving & Data Analysis";
      }
      if (/quadratic|polynomial|exponent|radical|rational|nonlinear|function/i.test(normalized)) {
        return "Passport to Advanced Math";
      }
      if (/geometry|circle|trig|triangle|angle|complex|coordinate/i.test(normalized)) {
        return "Additional Topics";
      }
      return "Unknown";
    };

    const passesPassageRotation = (questions: any[]) => {
      if (section !== "reading" && section !== "writing") return true;
      const blockSize = 5;
      let lastSignature = "";
      for (let start = 0; start < questions.length; start += blockSize) {
        const block = questions.slice(start, start + blockSize);
        if (block.length === 0) continue;
        const sourceText = getRwSignatureSource(block[0]);
        if (!sourceText || typeof sourceText !== "string") {
          return false;
        }
        const signature = getPassageSignature(sourceText);
        if (!signature || signature === lastSignature) {
          return false;
        }
        lastSignature = signature;
      }
      return true;
    };

    const passesMathVariety = (questions: any[]) => {
      if (section !== "math") return true;
      const domainWordProblem: Record<string, boolean> = {};
      const domainsPresent = new Set<string>();
      questions.forEach((q) => {
        const skill = String(q.skillCategory || q.skillFocus || "");
        const domain = getMathDomain(skill);
        if (domain !== "Unknown") {
          domainsPresent.add(domain);
        }
        if (isWordProblem(String(q.question || ""))) {
          domainWordProblem[domain] = true;
        }
      });
      for (const domain of domainsPresent) {
        if (!domainWordProblem[domain]) return false;
      }
      return true;
    };

    const passesMathWordProblemQuota = (questions: any[]) => {
      if (section !== "math") return true;
      const blockSize = 5;
      for (let start = 0; start < questions.length; start += blockSize) {
        const block = questions.slice(start, start + blockSize);
        if (block.length === 0) continue;
        const wordProblemCount = block.filter((q) => isWordProblem(String(q.question || ""))).length;
        if (wordProblemCount < 1) {
          return false;
        }
      }
      return true;
    };

    const passesWritingOptionVariety = (questions: any[]) => {
      if (section !== "writing") return true;
      const blockSize = 5;

      for (let start = 0; start < questions.length; start += blockSize) {
        const block = questions.slice(start, start + blockSize);
        if (block.length === 0) continue;

        // Avoid repeated identical option sets across a 5-question block.
        const signatures = block.map((q) => {
          const opts = Object.values(q?.options || {})
            .map((opt) => normalizeCompare(normalizeWritingOption(String(opt || ""))))
            .sort();
          return opts.join("|");
        });
        const uniqueSignatures = new Set(signatures);
        const minUnique = Math.max(1, block.length - 1);
        if (uniqueSignatures.size < minUnique) return false;

        // Ensure one canonical NO CHANGE wording only when present, and not overused.
        let noChangeCount = 0;
        const optionFrequency: Record<string, number> = {};
        for (const q of block) {
          const opts = Object.values(q?.options || {}).map((opt) => normalizeWritingOption(String(opt || "")));
          const localSeen = new Set<string>();
          for (const opt of opts) {
            const normalized = normalizeCompare(opt);
            if (!normalized) return false;
            if (isNoChangeOption(opt)) noChangeCount += 1;
            if (!localSeen.has(normalized)) {
              optionFrequency[normalized] = (optionFrequency[normalized] || 0) + 1;
              localSeen.add(normalized);
            }
          }
        }
        if (noChangeCount > Math.max(2, Math.ceil(block.length * 0.4))) return false;

        // A specific non-"NO CHANGE" option should not repeat in every question of the block.
        for (const [opt, count] of Object.entries(optionFrequency)) {
          if (opt !== "no change" && count >= block.length) return false;
        }

        // Do not allow writing items with identical pattern+option signatures.
        const patternKeys = block.map((q) => getWritingPatternKey(q));
        if (new Set(patternKeys).size < block.length) return false;
      }

      return true;
    };

    const passesSetConstraints = (questions: any[]) => {
      const mathVarietyOk = topicLocked && section === "math" ? true : passesMathVariety(questions);
      const mathWordProblemsOk =
        topicLocked && section === "math" ? true : passesMathWordProblemQuota(questions);
      return (
        passesPassageRotation(questions) &&
        mathVarietyOk &&
        mathWordProblemsOk &&
        passesWritingOptionVariety(questions)
      );
    };

    const getDedupKey = (question: any) => {
      const base = String(question?.question || "").toLowerCase().trim();
      if (section === "math") {
        return normalizeMathStem(base);
      }
      const skill = normalizeCompare(String(question?.skillCategory || question?.skillFocus || ""));
      return `${normalizeRwStem(base)}::${skill}`;
    };

    const existingQuestionDedupKeys = new Set(
      existingQuestionsForGeneration.map((q: any) => getDedupKey(q)).filter(Boolean)
    );
    const filterAgainstExistingQuestions = (list: any[]) =>
      list.filter((q: any) => {
        if (existingQuestionDedupKeys.has(getDedupKey(q))) return false;
        return !isNearDuplicateQuestion(q, existingQuestionsForGeneration);
      });

    let passage: string | undefined = undefined;
    let transformedAll: any[] = [];

    const cacheIsValid =
      cachedResponse &&
      Array.isArray(cachedResponse.questions) &&
      cachedResponse.questions.length >= questionCount;

    if (cacheIsValid) {
      passage = cachedResponse.passage;
      transformedAll = cachedResponse.questions;
    } else {
      const blockSize = 5;
      const blockCounts: number[] = [];
      let remaining = questionCount;
      while (remaining > 0) {
        const count = Math.min(blockSize, remaining);
        blockCounts.push(count);
        remaining -= count;
      }

      const buildRwBlock = async (
        blockIndex: number,
        count: number
      ): Promise<{ questions: any[]; passage?: string; signature: string }> => {
        let bestQuestions: any[] = [];
        let bestPassage: string | undefined = undefined;
        for (let attempt = 0; attempt < MAX_BLOCK_ATTEMPTS; attempt += 1) {
          if (isPastDeadline()) break;
          try {
            const rwBlockExtra = topicLocked
              ? `This is block ${blockIndex + 1} of ${blockCounts.length}. Generate exactly ${count} questions. TOPIC LOCK: every question must target "${topicTrimmed}" only.${difficultyLocked && difficulty && difficulty !== "Mixed" ? ` All ${difficulty} difficulty.` : ""}`
              : `This is block ${blockIndex + 1} of ${blockCounts.length}. Generate exactly ${count} questions for this block only.`;
            const data = await getModelPayload(count, rwBlockExtra, { attempts: 1 });
            const blockPassage = data.passage;
            const transformed = applyConfigFilters(transformQuestions(data.questions, blockPassage));
            const unique = dedupeAndFilterNearDuplicates(transformed).slice(0, count);
            if (unique.length > bestQuestions.length) {
              bestQuestions = unique;
              bestPassage = blockPassage;
            }
            if (unique.length < count) continue;

            const signatureSource = getRwSignatureSource(unique[0]);
            const signature = getPassageSignature(signatureSource);
            if (!signature) continue;
            if (existingRwSignatures.has(signature)) continue;

            if ((section === "reading" || section === "writing") && unique.some((q) => !q.passage)) {
              continue;
            }

            return { questions: unique, passage: blockPassage, signature };
          } catch (blockError) {
            // Keep retrying within the block when model output is malformed or incomplete.
            console.warn(`RW block ${blockIndex + 1} attempt ${attempt + 1} failed:`, blockError);
            continue;
          }
        }

        if (bestQuestions.length >= count) {
          const signatureSource = getRwSignatureSource(bestQuestions[0]);
          const signature = getPassageSignature(signatureSource) || `block-${blockIndex}-${Date.now()}`;
          const finalSignature = existingRwSignatures.has(signature)
            ? `partial-block-${blockIndex}-${Date.now()}`
            : signature;
          return { questions: bestQuestions.slice(0, count), passage: bestPassage, signature: finalSignature };
        }

        return {
          questions: bestQuestions.slice(0, count),
          passage: bestPassage,
          signature: `partial-block-${blockIndex}-${Date.now()}`,
        };
      };

      const buildMathBlock = async (blockIndex: number, count: number): Promise<any[]> => {
        let bestQuestions: any[] = [];
        for (let attempt = 0; attempt < MAX_BLOCK_ATTEMPTS; attempt += 1) {
          if (isPastDeadline()) break;
          try {
            const mathBlockInstructions = topicLocked
              ? `This is block ${blockIndex + 1} of ${blockCounts.length}. Generate exactly ${count} SAT Math questions. TOPIC LOCK: every question must be "${topicTrimmed}" only (Digital SAT style).${difficultyLocked && difficulty && difficulty !== "Mixed" ? ` All questions ${difficulty} difficulty.` : ""} Do not include items from unrelated domains. Include a word problem in this block only if it naturally fits "${topicTrimmed}".`
              : `This is block ${blockIndex + 1} of ${blockCounts.length}. Generate exactly ${count} varied SAT Math questions for this block. Include at least one word problem in this block of ${count} questions (target exactly one unless the prompt naturally requires more).`;
            const data = await getModelPayload(count, mathBlockInstructions, { attempts: 1 });
            const transformed = applyConfigFilters(transformQuestions(data.questions, data.passage));
            const unique = dedupeAndFilterNearDuplicates(transformed).slice(0, count);
            if (unique.length > bestQuestions.length) {
              bestQuestions = unique;
            }
            if (unique.length < count) continue;
            return unique;
          } catch (blockError) {
            // Keep retrying within the block when model output is malformed or incomplete.
            console.warn(`Math block ${blockIndex + 1} attempt ${attempt + 1} failed:`, blockError);
            continue;
          }
        }

        if (bestQuestions.length >= count) {
          return bestQuestions.slice(0, count);
        }

        return bestQuestions.slice(0, count);
      };

      // Fast path: one model call for the full set. This is usually much faster than block retries.
      try {
        const fastExtra =
          topicLocked || difficultyLocked
            ? `FAST MODE: One response, valid JSON.${topicLocked ? ` TOPIC LOCK "${topicTrimmed}" for every question.` : ""}${difficultyLocked && difficulty && difficulty !== "Mixed" ? ` All ${difficulty}.` : ""}`
            : "FAST MODE: Return a complete, valid set in one response. Prioritize speed while keeping SAT style and valid JSON.";
        const fastData = await getModelPayload(questionCount, fastExtra, {
          attempts: 1,
          timeoutMs: questionCount >= 20 ? 45000 : 35000,
        });
        const fastTransformed = dedupeAndFilterNearDuplicates(
          applyConfigFilters(transformQuestions(fastData.questions, fastData.passage))
        ).slice(0, questionCount);
        const hasEnough = fastTransformed.length >= questionCount;
        const rwHasPassages =
          section === "math" || fastTransformed.every((q: any) => !!q.passage);
        if (hasEnough && rwHasPassages) {
          passage = fastData.passage;
          transformedAll = fastTransformed;
        }
      } catch (fastPathError) {
        console.warn("Fast-path generation failed, falling back to block mode:", fastPathError);
      }

      for (
        let setAttempt = transformedAll.length >= questionCount ? MAX_SET_ATTEMPTS : 0;
        setAttempt < MAX_SET_ATTEMPTS;
        setAttempt += 1
      ) {
        if (isPastDeadline()) {
          break;
        }
        passage = undefined;
        transformedAll = [];

        if (section === "math") {
          const mathBlocks = await Promise.all(
            blockCounts.map((count, idx) => buildMathBlock(idx, count))
          );
          transformedAll = dedupeAndFilterNearDuplicates(mathBlocks.flat()).slice(0, questionCount);
        } else {
          const rwBlocks: Array<{ questions: any[]; passage?: string; signature: string } | null> = Array.from(
            { length: blockCounts.length },
            () => null
          );

          let rwRepairPasses = 0;
          while (true) {
            const missingIndexes = rwBlocks
              .map((block, idx) => (block === null ? idx : -1))
              .filter((idx) => idx >= 0);

            if (missingIndexes.length > 0) {
              const generated = await Promise.all(
                missingIndexes.map((idx) => buildRwBlock(idx, blockCounts[idx]))
              );
              generated.forEach((block, i) => {
                rwBlocks[missingIndexes[i]] = block;
              });
            }

            const invalidIndexes = new Set<number>();
            let previousSignature = "";
            for (let i = 0; i < rwBlocks.length; i += 1) {
              const block = rwBlocks[i];
              if (!block) {
                invalidIndexes.add(i);
                continue;
              }
              if (block.questions.length < blockCounts[i]) {
                invalidIndexes.add(i);
                continue;
              }
              if ((section === "reading" || section === "writing") && block.questions.some((q) => !q.passage)) {
                invalidIndexes.add(i);
                continue;
              }
              if (!block.signature || block.signature === previousSignature) {
                invalidIndexes.add(i);
                continue;
              }
              previousSignature = block.signature;
            }

            if (invalidIndexes.size === 0) {
              break;
            }
            rwRepairPasses += 1;
            if (rwRepairPasses >= 2) {
              break;
            }

            invalidIndexes.forEach((idx) => {
              rwBlocks[idx] = null;
            });
          }

          const orderedBlocks = rwBlocks.filter(Boolean) as Array<{ questions: any[]; passage?: string; signature: string }>;
          if (orderedBlocks[0]?.passage) {
            passage = orderedBlocks[0].passage;
          }
          transformedAll = orderedBlocks.flatMap((block) => block.questions);
          transformedAll = dedupeAndFilterNearDuplicates(transformedAll).slice(0, questionCount);
        }

        if (transformedAll.length < questionCount) {
          continue;
        }
        // Prefer strict SAT constraints, but prioritize returning a valid set in time.
        // A fully valid/clean set is still enforced by transform + question-level validation.
        if (!passesSetConstraints(transformedAll) && setAttempt < MAX_SET_ATTEMPTS - 1) {
          break;
        }
        break;
      }
    }

    // If deadline is hit, continue with whatever we have and fill the rest using fallback questions.
    
    // Remove duplicate questions based on question text
    const uniqueQuestions = dedupeAndFilterNearDuplicates(transformedAll);

    let finalQuestions = uniqueQuestions.length >= questionCount
      ? uniqueQuestions.slice(0, questionCount)
      : transformedAll.slice(0, questionCount);

    finalQuestions = filterAgainstExistingQuestions(finalQuestions);

    // Single top-up pass if the first generation came up short.
    if (finalQuestions.length < questionCount && !isPastDeadline()) {
      try {
        const missing = questionCount - finalQuestions.length;
        const chunkSize = Math.min(5, missing);
        const topUpExtra = `TOP-UP: Generate exactly ${chunkSize} additional SAT ${section} questions, distinct from prior stems. Valid JSON, concise.${topicLocked ? ` TOPIC LOCK: "${topicTrimmed}" only.` : ""}${difficultyLocked && difficulty && difficulty !== "Mixed" ? ` All ${difficulty} difficulty.` : ""}`;
        const topUpData = await getModelPayload(chunkSize, topUpExtra, {
          attempts: 1,
          timeoutMs: 30000,
        });
        const topUpTransformed = applyConfigFilters(
          transformQuestions(topUpData.questions, topUpData.passage)
        );
        const combined = dedupeAndFilterNearDuplicates([...finalQuestions, ...topUpTransformed]);
        finalQuestions = filterAgainstExistingQuestions(combined).slice(0, questionCount);
      } catch (topUpError) {
        console.warn("Practice generation top-up failed:", topUpError);
      }
    }

    if (finalQuestions.length === 0) {
      return NextResponse.json(
        {
          error: "Could not generate any valid questions this attempt. Please try again.",
          requested: questionCount,
          received: 0,
        },
        { status: 503 }
      );
    }

    const partialWarning =
      finalQuestions.length < questionCount
        ? `Generated ${finalQuestions.length} of ${questionCount} requested questions.`
        : undefined;

    if (section === "reading" && !passage && finalQuestions.every((q: any) => !q.passage)) {
      throw new Error("Reading passage is required for reading questions.");
    }

    const normalizedQuestions = finalQuestions.map((q: any, idx: number) => ({ ...q, id: idx + 1 }));

    if (shouldUseCache && !cacheIsValid && normalizedQuestions.length === questionCount) {
      setCachedValue(cacheKey, { passage, questions: normalizedQuestions });
    }

    const { user } = accessContext;

    let practiceTestId = existingPracticeTest?.id;
    let responseQuestions = normalizedQuestions;
    let responsePassage = passage;

    if (existingPracticeTest) {
      const existingQuestions: any[] = (() => {
        try {
          if (!existingPracticeTest?.questions) return [];
          const parsed = JSON.parse(existingPracticeTest.questions);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

      const offset = existingQuestions.length;
      const appended = normalizedQuestions.map((q: any, idx: number) => ({
        ...q,
        id: offset + idx + 1,
      }));
      const mergedQuestions = [...existingQuestions, ...appended];
      const mergedPassage = existingPracticeTest.passage || passage || null;

      await prisma.practiceTest.update({
        where: { id: existingPracticeTest.id },
        data: {
          questions: JSON.stringify(mergedQuestions),
          passage: mergedPassage,
        },
      });
      practiceTestId = existingPracticeTest.id;
      responseQuestions = appended;
      responsePassage = mergedPassage || undefined;
    } else {
      // Save to database for a new test
      const practiceTest = await prisma.practiceTest.create({
        data: {
          userId: user.id,
          section: section,
          topic: topic || null,
          difficulty: difficulty || null,
          questions: JSON.stringify(normalizedQuestions),
          passage: passage || null,
        },
      });
      practiceTestId = practiceTest.id;
    }

    const responseBody = cachedResponse
      ? { passage: cachedResponse.passage, questions: normalizedQuestions }
      : { passage, questions: normalizedQuestions };

    return NextResponse.json({
      id: practiceTestId,
      section: section,
      passage: existingPracticeTest ? responsePassage : responseBody.passage,
      questions: existingPracticeTest ? responseQuestions : responseBody.questions,
      ...(partialWarning && { warning: partialWarning }),
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

