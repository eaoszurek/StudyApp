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
  ensureSingleSkill,
  formatEquationLineBreaks,
  isPlaceholderOptionText,
  normalizeForSimilarity,
  areNearDuplicateQuestions,
  areAuditNearDuplicateStems,
  passesAuditMathSignal,
  passesAuditRwSignal,
  likelySatStyleQuestion,
  hasGenericSatStem,
} from "@/utils/aiValidation";
import { getMathTopicDomain } from "@/data/topics";
import {
  questionAlignsWithLockedTopic,
  skillExactlyMatchesTopic,
} from "@/utils/practiceTopicAlignment";
import {
  questionAlignsWithLockedDifficulty,
  looksLikeTrivialOneStepLinear,
  type LockedDifficulty,
} from "@/utils/practiceDifficultyAlignment";
import {
  computeFingerprint,
  computeFingerprints,
  parseFingerprintList,
  mergeFingerprints,
  takeRecentFingerprints,
  makeStemPreview,
  PROMPT_FINGERPRINT_LIMIT,
  PROMPT_RECENT_STEMS_LIMIT,
} from "@/utils/questionFingerprint";

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

const GeneratedQuestionSchema = z.object({
  // Internal-only working memory used by the model for self-verification.
  // Stripped from the response server-side; never sent to the client.
  _scratchpad: z.string().nullable(),
  passage: z.string().nullable(),
  question: z.string(),
  options: z.array(z.string()),
  section: z.enum(["Reading & Writing", "Math"]),
  skillCategory: z.string(),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  graphData: GraphDataSchema.nullable(),
  desmosExpression: z.string().nullable(),
  passageDomain: z.string().nullable(),
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
const FREE_PRACTICE_TEST_MAX_QUESTIONS = 50;

// Validate API key on module load
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set in environment variables");
}

function isRwSection(section: string): boolean {
  return section === "reading" || section === "writing" || section === "reading-writing";
}

function isConventionSkill(skill: string): boolean {
  const s = skill.toLowerCase();
  return (
    s.includes("sentence boundaries") ||
    s.includes("form, structure") ||
    s.includes("transitions") ||
    s.includes("rhetorical synthesis")
  );
}

// Zod schema for input validation
const PracticeRequestSchema = z.object({
  section: z.enum(["math", "reading", "writing", "reading-writing"], {
    message: "Section must be math, reading, writing, or reading-writing",
  }),
  questionCount: z.number().int().min(1).max(50).default(5),
  topic: z.string().max(200).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard", "Mixed"]).optional(),
  existingTestId: z.string().optional(),
});

class FreePracticeAppendLimitError extends Error {}
class PracticeAppendTargetMissingError extends Error {}

function parseStoredQuestions(questions: string | null): unknown[] {
  try {
    if (!questions) return [];
    const parsed = JSON.parse(questions);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function wouldExceedFreePracticeAppendLimit(
  existingQuestions: readonly unknown[],
  appendCount: number
): boolean {
  return existingQuestions.length + appendCount > FREE_PRACTICE_TEST_MAX_QUESTIONS;
}

function isCurrentFreeTierMonth(date: Date): boolean {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return date >= monthStart;
}

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

    const gate = await checkPremiumGate(accessContext);
    let existingPracticeTest: {
      id: string;
      questions: string | null;
      passage: string | null;
      createdAt: Date;
    } | null = null;

    if (existingTestId) {
      existingPracticeTest = await prisma.practiceTest.findFirst({
        where: { id: existingTestId, userId: accessContext.user.id },
        select: { id: true, questions: true, passage: true, createdAt: true },
      });

      if (!existingPracticeTest) {
        return NextResponse.json(
          { error: "Existing practice test not found for this user/session." },
          { status: 404 }
        );
      }

      const existingQuestions = parseStoredQuestions(existingPracticeTest.questions);
      if (
        !gate.hasSubscription &&
        (!isCurrentFreeTierMonth(existingPracticeTest.createdAt) ||
          wouldExceedFreePracticeAppendLimit(existingQuestions, questionCount))
      ) {
        return NextResponse.json(
          {
            error:
              "Free starter practice checkpoints can include up to 50 questions. Unlock Plus for unlimited practice.",
          },
          { status: 402 }
        );
      }
    } else {
      if (!gate.allowed) {
        return NextResponse.json(
          { error: "Free starter limit reached. Unlock Plus for $5/month to continue." },
          { status: 402 }
        );
      }
    }

    // Load this user's recent question fingerprints so we can avoid regenerating
    // questions they've already seen across past sessions.
    let seenFingerprintList: string[] = [];
    try {
      const userFingerprintRecord = await prisma.user.findUnique({
        where: { id: accessContext.user.id },
        select: { seenQuestionFingerprints: true },
      });
      seenFingerprintList = parseFingerprintList(
        userFingerprintRecord?.seenQuestionFingerprints
      );
    } catch (fpReadError) {
      console.warn("Failed to load seen fingerprints:", fpReadError);
    }
    const seenFingerprintSet = new Set(seenFingerprintList);
    const fingerprintsForPrompt = takeRecentFingerprints(seenFingerprintList, PROMPT_FINGERPRINT_LIMIT);

    // Pull a small sample of recent stems from prior practice tests for the
    // model to use as semantic context (not just opaque hashes). Lightweight:
    // we read the most recent test's questions JSON, no aggregation across tests.
    let recentStemPreviews: string[] = [];
    try {
      const recentTests = await prisma.practiceTest.findMany({
        where: { userId: accessContext.user.id },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { questions: true },
      });
      const stems: string[] = [];
      for (const t of recentTests) {
        if (!t.questions) continue;
        try {
          const arr = JSON.parse(t.questions);
          if (!Array.isArray(arr)) continue;
          for (const q of arr) {
            const stem = String(q?.question || "").trim();
            if (stem) stems.push(stem);
            if (stems.length >= PROMPT_RECENT_STEMS_LIMIT) break;
          }
        } catch {
          // skip malformed rows
        }
        if (stems.length >= PROMPT_RECENT_STEMS_LIMIT) break;
      }
      recentStemPreviews = stems.slice(0, PROMPT_RECENT_STEMS_LIMIT).map((s) => makeStemPreview(s));
    } catch (fpReadError) {
      console.warn("Failed to load recent stems for fingerprint prompt:", fpReadError);
    }

    const sectionGuidelines = {
      math: `[MATH SECTION - Official SAT Skill Domains (Digital SAT)]
Generate questions aligned with these four content domains. Approximate test share is shown; pick sub-skills from the list using their EXACT names for skillCategory.

**Algebra (about 35% of the section, roughly 13–15 questions) — linear relationships**
- Linear Equations — solving in one or two variables
- Linear Functions — interpret and graph (e.g. f(x) = mx + b)
- Systems of Equations — two linear equations simultaneously
- Linear Inequalities — solve and graph in one or two variables

**Advanced Math (about 35%, roughly 13–15 questions) — non-linear and higher-degree**
- Quadratic Equations — factoring, quadratic formula, parabolas
- Polynomials — add, subtract, multiply
- Non-linear Functions — exponential growth and decay, radical equations, other non-linearity
- Rational Expressions — simplify and solve; variables in denominators; excluded values

**Problem-Solving and Data Analysis (about 15%, roughly 5–7 questions) — quantitative reasoning in context**
- Ratios & Rates — unit conversion, proportional relationships, scaling
- Percentages — percent change, increase, and decrease
- Statistics — mean, median, mode, range, standard deviation
- Data Interpretation — scatterplots, histograms, box-and-whisker plots, tables, trends

**Geometry and Trigonometry (about 15%, roughly 5–7 questions) — space and right-triangle math**
- Area & Volume — plane figures and 3D solids (e.g. prisms, cylinders) with standard formulas
- Triangles — isosceles, equilateral, special right (30-60-90, 45-45-90), Pythagorean ideas
- Trigonometry — sine, cosine, tangent (SOH CAH TOA) in right triangles
- Circles — arc length, sector area, equation of a circle in the plane

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
      reading: `[READING & WRITING SECTION — Official Digital SAT Skill Domains]
Digital SAT Reading and Writing use ONE section with FOUR content domains and exactly TEN sub-skills. Every question's skillCategory MUST be one of the ten skills below — no synonyms, no renamings.

**Information and Ideas (~26% of the R&W section):**
- Central Ideas and Details — main claim, primary purpose, key supporting facts of a short passage.
- Command of Evidence — point to the sentence, detail, OR quantitative data (graph/table) that best supports a given claim. Covers both textual and quantitative evidence.
- Inferences — draw a logical conclusion that must be true based on the passage, without overreaching.

**Craft and Structure (~28% of the R&W section):**
- Words in Context — determine the meaning of a high-utility academic word or phrase from surrounding context.
- Text Structure and Purpose — analyze how the passage is organized, the author's overall purpose, or the function of a specific sentence within the text.
- Cross-Text Connections — compare two short related texts: agreement, disagreement, shared evidence, or differing conclusions.

**Expression of Ideas (~20% of the R&W section):**
- Rhetorical Synthesis — given a bulleted list of notes (at least 3 short factual bullets), choose the sentence that best accomplishes a stated writing goal.
- Transitions — choose the logical connecting word or phrase (however, therefore, for example, nevertheless, etc.) that fits the relationship between ideas.

**Standard English Conventions (~26% of the R&W section):**
- Sentence Boundaries — punctuation that joins or separates clauses (periods, semicolons, colons, comma splices, run-ons, fragments, coordinating conjunctions).
- Form, Structure, and Sense — subject-verb agreement, pronoun-antecedent agreement, verb tense and aspect, modifier placement, parallel structure, possessives, and clear reference.

PASSAGE TYPE VARIETY: Literature (fiction / literary nonfiction), history & social studies (documents, speeches, essays), and science (biology, chemistry, physics, earth science). Paired texts only appear on Cross-Text Connections questions.

CRITICAL R&W REQUIREMENTS:
- Every "passage" MUST contain at least 2 complete sentences (each ending in . ! or ?). Aim for 2–6 sentences, roughly 30–120 words.
- Rhetorical Synthesis is the ONLY exception: its passage is a bulleted note list with at least 3 bullets, each a short factual statement. Prefix bullets with "- " or "• ".
- Cross-Text Connections passages contain TWO short texts in the same "passage" field, clearly labeled "Text 1" and "Text 2", each with at least 2 complete sentences.
- Use authentic SAT-style language: academic, formal, precise. Avoid slang and first-person opinion.
- Questions must be answerable from the passage alone; do not require outside knowledge.
- Vary sub-skills inside a set — no two questions in a 5-question block share the same skillCategory.
- Aim for the domain distribution 26 / 28 / 20 / 26 across sets of 4+ questions.
- Never output line numbers or passage-labels inside the "question" field.`,
      writing: `[READING & WRITING SECTION — Official Digital SAT Skill Domains]
Digital SAT Reading and Writing use ONE section with FOUR content domains and exactly TEN sub-skills. Every question's skillCategory MUST be one of the ten skills below — no synonyms, no renamings.

**Information and Ideas (~26% of the R&W section):**
- Central Ideas and Details — main claim or key supporting facts of a short passage.
- Command of Evidence — point to the sentence, detail, OR quantitative data (graph/table) that best supports a given claim.
- Inferences — draw a logical conclusion that must be true based on the passage.

**Craft and Structure (~28% of the R&W section):**
- Words in Context — meaning of a high-utility academic word or phrase from surrounding context.
- Text Structure and Purpose — how the passage is organized or the function of a specific sentence within the text.
- Cross-Text Connections — compare two short related texts.

**Expression of Ideas (~20% of the R&W section):**
- Rhetorical Synthesis — bulleted notes; pick the sentence that best achieves a stated goal.
- Transitions — choose the logical connecting word/phrase that fits the relationship between ideas.

**Standard English Conventions (~26% of the R&W section):**
- Sentence Boundaries — punctuation that joins/separates clauses (periods, semicolons, colons, commas, run-ons, fragments).
- Form, Structure, and Sense — subject-verb agreement, pronoun-antecedent agreement, verb tense/aspect, modifier placement, parallel structure, possessives.

CRITICAL WRITING REQUIREMENTS:
- Every "passage" MUST contain at least 2 complete sentences (each ending in . ! or ?). Aim for 2–4 sentences.
- Rhetorical Synthesis is the ONLY exception: its passage is a bulleted note list with at least 3 bullets, each prefixed with "- " or "• ".
- Cross-Text Connections passages contain TWO short texts labeled "Text 1" and "Text 2", each with at least 2 complete sentences.
- The "passage" is plain text — NEVER wrap words in brackets, **asterisks**, <angle brackets>, or __underscores__. No underline markers. No markdown.
- For Standard English Conventions questions, the "question" field MUST clearly identify the target word, phrase, or punctuation using standard double quotes inside the stem. Examples:
  * "Which choice best replaces \"they're\" in the sentence?"
  * "Which choice of punctuation best completes the sentence after \"Tuesday\"?"
  * "Which choice, if inserted after \"scientists\", best fits the context?"
- Use the LITERAL symbol for punctuation ( , ; : . — ! ? " ' ). Do NOT spell punctuation out (never write "comma", "semicolon", "period" etc.).
- Use digits for numbers (write 5, 12, 2024 — never "five", "twelve", "two thousand twenty-four").
- For Standard English Conventions items, focus on ONE specific rule per question. Grammar errors (subject-verb, pronoun, verb tense, modifier, parallel structure) are ALWAYS tagged "Form, Structure, and Sense". Run-ons, comma splices, fragments, and sentence-joining punctuation are ALWAYS tagged "Sentence Boundaries".
- Include "NO CHANGE" as an option when appropriate. It must be correct only sometimes (~20–30% of items). Write it exactly as "NO CHANGE".
- Never include a second option identical to the currently targeted word/phrase when "NO CHANGE" is present.
- In each 5-question block, vary the four answer choices; do not reuse the same option set across multiple questions.
- Test common SAT grammar errors, not obscure rules.
- Match real SAT style: clear, unambiguous, tests practical editing skills.`,
    };

    (sectionGuidelines as Record<string, string>)["reading-writing"] = `${sectionGuidelines.reading}

ADDITIONAL CONVENTIONS & EXPRESSION RULES (combined Digital SAT R&W section):
- The "passage" is plain text — NEVER wrap words in brackets, **asterisks**, <angle brackets>, or __underscores__.
- For Standard English Conventions questions, the "question" field MUST clearly identify the target word, phrase, or punctuation using standard double quotes inside the stem.
- Use the LITERAL symbol for punctuation ( , ; : . — ! ? " ' ). Do NOT spell punctuation out.
- Include "NO CHANGE" as an option when appropriate (~20–30% of convention items). Write it exactly as "NO CHANGE".
- Never include a second option identical to the currently targeted word/phrase when "NO CHANGE" is present.`;

    // Canonical Digital SAT R&W sub-skills. Every reading/writing question's
    // skillCategory MUST be exactly one of these strings (see SKILL CATEGORY LOCK).
    const satRwQuestionTypes = [
      "Central Ideas and Details",
      "Command of Evidence",
      "Inferences",
      "Words in Context",
      "Text Structure and Purpose",
      "Cross-Text Connections",
      "Rhetorical Synthesis",
      "Transitions",
      "Sentence Boundaries",
      "Form, Structure, and Sense",
    ];

    const CANONICAL_RW_SKILLS = new Set(satRwQuestionTypes);

    // Normalizes any legacy / synonym / stray skill names the model may emit back
    // to the canonical 10 R&W sub-skills. Keys are lowercased; unknown values fall
    // through to a section-appropriate default below.
    const rwSkillAliases: Record<string, string> = {
      // Information and Ideas
      "main idea": "Central Ideas and Details",
      "main ideas": "Central Ideas and Details",
      "supporting details": "Central Ideas and Details",
      "central ideas": "Central Ideas and Details",
      "central ideas & details": "Central Ideas and Details",
      "summarizing": "Central Ideas and Details",
      "summary": "Central Ideas and Details",
      "textual evidence": "Command of Evidence",
      "command of evidence (textual)": "Command of Evidence",
      "command of evidence (quantitative)": "Command of Evidence",
      "evaluating evidence": "Command of Evidence",
      "analyzing arguments": "Inferences",
      "inference": "Inferences",
      // Craft and Structure
      "vocabulary in context": "Words in Context",
      "vocab in context": "Words in Context",
      "word choice": "Words in Context",
      "text structure": "Text Structure and Purpose",
      "author's purpose": "Text Structure and Purpose",
      "authors purpose": "Text Structure and Purpose",
      "point of view": "Text Structure and Purpose",
      "rhetorical analysis": "Text Structure and Purpose",
      "comparing texts": "Cross-Text Connections",
      "cross-text connections": "Cross-Text Connections",
      "cross text connections": "Cross-Text Connections",
      "paired passages": "Cross-Text Connections",
      // Expression of Ideas
      "sentence placement": "Rhetorical Synthesis",
      "paragraph organization": "Rhetorical Synthesis",
      "logical sequence": "Rhetorical Synthesis",
      "rhetorical synthesis": "Rhetorical Synthesis",
      "transitions": "Transitions",
      // Standard English Conventions — boundaries
      "boundaries": "Sentence Boundaries",
      "sentence boundaries": "Sentence Boundaries",
      "punctuation": "Sentence Boundaries",
      "commas": "Sentence Boundaries",
      "colons": "Sentence Boundaries",
      "semicolons": "Sentence Boundaries",
      "colons and semicolons": "Sentence Boundaries",
      "linking clauses": "Sentence Boundaries",
      "run-ons": "Sentence Boundaries",
      "comma splices": "Sentence Boundaries",
      "fragments": "Sentence Boundaries",
      // Standard English Conventions — form/structure/sense
      "form, structure, and sense": "Form, Structure, and Sense",
      "form, structure & sense": "Form, Structure, and Sense",
      "subject-verb agreement": "Form, Structure, and Sense",
      "subject verb agreement": "Form, Structure, and Sense",
      "pronoun-antecedent agreement": "Form, Structure, and Sense",
      "pronoun antecedent agreement": "Form, Structure, and Sense",
      "pronoun agreement": "Form, Structure, and Sense",
      "verb tense": "Form, Structure, and Sense",
      "verb tense & aspect": "Form, Structure, and Sense",
      "verb tense and aspect": "Form, Structure, and Sense",
      "modifiers": "Form, Structure, and Sense",
      "modifier placement": "Form, Structure, and Sense",
      "parallel structure": "Form, Structure, and Sense",
      "conciseness": "Form, Structure, and Sense",
      "precision": "Form, Structure, and Sense",
      "idioms": "Form, Structure, and Sense",
      "idioms and word choice": "Form, Structure, and Sense",
      "apostrophes": "Form, Structure, and Sense",
      "possessives": "Form, Structure, and Sense",
    };

    const canonicalizeRwSkill = (input: string | null | undefined, forSection: "reading" | "writing"): string => {
      const trimmed = (input || "").trim();
      if (!trimmed) {
        return forSection === "reading" ? "Central Ideas and Details" : "Form, Structure, and Sense";
      }
      if (CANONICAL_RW_SKILLS.has(trimmed)) return trimmed;
      const aliased = rwSkillAliases[trimmed.toLowerCase()];
      if (aliased) return aliased;
      // Unknown — fall back based on section default.
      return forSection === "reading" ? "Central Ideas and Details" : "Form, Structure, and Sense";
    };

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

    const seenStemsBlock =
      recentStemPreviews.length > 0
        ? `RECENT QUESTION STEMS THIS USER HAS ALREADY SEEN (do NOT repeat these — vary scenario, numbers, passage content, and answer choices):\n${recentStemPreviews
            .map((s, i) => `  ${i + 1}. ${s}`)
            .join("\n")}\n`
        : "";
    const seenFingerprintsBlock =
      fingerprintsForPrompt.length > 0
        ? `PREVIOUSLY SEEN QUESTIONS (do not regenerate; fingerprint hashes for reference): ${fingerprintsForPrompt.join(", ")}\n`
        : "";

    const mathDifficultyRules = `MATH DIFFICULTY RULES (non-negotiable):
- Easy: a SINGLE direct operation; the answer is a whole number; no setup required; no fractions, no negatives, no multi-step reasoning. The student should be able to answer in one step.
- Medium: 2–3 discrete steps; requires writing AND solving an equation; may involve fractions, negatives, or moderate algebraic manipulation; a clear method must be chosen.
- Hard: multi-step reasoning that connects TWO concepts; abstract or non-obvious setup; the answer is not immediately apparent; at least one distractor MUST mirror a predictable student mistake (e.g. solving for x instead of 2x, sign error, forgetting to distribute, off-by-one, picking the intermediate value instead of the final answer).
`;

    const rwDifficultyRules = `READING & WRITING DIFFICULTY RULES (non-negotiable):
- Easy: the answer is DIRECTLY STATED in the passage; no inference is required; vocabulary is plain.
- Medium: the answer requires combining TWO pieces of passage information OR understanding tone/purpose; vocabulary is moderate.
- Hard: the answer requires distinguishing between TWO very close options; the passage uses complex syntax or advanced vocabulary; wrong answers are designed to exploit common misreadings (too broad, too narrow, opposite meaning, out of scope).
`;

    const distractorRules = `DISTRACTOR RULES (apply to every question):
- Every wrong answer MUST be plausible: a student who misread or made one specific error would choose it.
- No answer should be obviously absurd or dismissible at a glance.
- Math wrong answers must come from a specific, predictable mistake: forgetting to distribute, solving for x instead of 2x, sign error, computing the wrong sub-step, dropping a unit, off-by-one.
- R&W wrong answers must come from real misreadings of the passage: too broad, too narrow, opposite meaning, or out of scope.
`;

    const rwStemTemplatesBlock = `READING & WRITING STEM TEMPLATES — use one of these stems verbatim (or with the noted blank filled in). Do not invent new stems:
1. "Which choice completes the text with the most logical and precise word or phrase?"
2. "Which choice most logically completes the text?"
3. "Which choice best states the main purpose of the text?"
4. "Which choice best describes the overall structure of the text?"
5. "Which choice best describes the function of the underlined sentence in the text as a whole?"
6. "As used in the text, what does the word ___ most nearly mean?"
7. "Which choice best maintains the sentence pattern already established in the text?"
8. "Which transition word or phrase most logically connects the two sentences?"
9. "Which finding, if true, would most directly support the claim?"
10. "Based on the texts, how would [Author 2] most likely respond to [Author 1's] claim that ___?"
11. "For a research report on ___, which choice most effectively uses relevant information from the notes?"

PASSAGE/STIMULUS REQUIREMENT: every R&W question MUST include a passage or stimulus of authentic SAT length and tone (typically 40–150 words; ≥3 short bullets for Rhetorical Synthesis; two short texts labeled "Text 1" / "Text 2" for Cross-Text Connections).

STEM VARIETY RULE: No two questions in a set may use the same stem template. If you used "Which choice most logically completes the text?" for question 1, you MUST use a different stem for every subsequent question. Vary the skill being tested AND the wording of the question every single time.`;

    const mathWordingRules = `MATH WORDING RULES (non-negotiable):
- State only what is needed to solve. No filler, no fluff.
- Introduce variables explicitly: "Let x represent..." (or equivalent).
- Word problems must end with a direct question: "What is the value of x?", "How many ___ are there?", "What is the total ___?".
- Never explain inside the question what concept is being tested.
- Use plain text math notation: x^2, sqrt(), pi, >=, <=. Do not use LaTeX.`;

    const selfVerificationBlock = `SELF-VERIFICATION (mandatory before you finalize each question):
- Silently solve the question yourself from scratch. Confirm that the option you marked correct EXACTLY matches your solution.
- For MATH questions: write your step-by-step working into the "_scratchpad" field. The scratchpad will not be shown to the user but it MUST contain real working — do not leave it blank for math items.
- For READING & WRITING questions: in "_scratchpad", briefly note WHICH sentence(s) of the passage justify the correct answer and WHY each distractor is wrong (one short line each is fine). Every answer choice MUST be grounded in the passage text — DO NOT introduce outside facts, rules, or information not present in the passage or official SAT guidelines.
- If, after self-verification, you have ANY doubt about the correct answer, regenerate the entire question rather than returning a potentially wrong answer.`;

    const buildSystemPrompt = (requestedCount: number) => `You are an expert SAT question generator trained on the Digital SAT framework. Create questions that feel authentic and closely match real Digital SAT style in wording, difficulty, and format. Return ONLY valid JSON — no markdown, no extra text.

{
  "passage": "string or null",
  "questions": [
    {
      "_scratchpad": "internal step-by-step working (mandatory for math; brief justification for R&W)",
      "passage": "string or null",
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "section": "Reading & Writing" | "Math",
      "skillCategory": "specific SAT sub-skill (e.g. 'Linear Equations', 'Data Interpretation', 'Transitions', 'Words in Context')",
      "correctAnswer": "A" | "B" | "C" | "D",
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
  section !== "math"
    ? `- SKILL CATEGORY LOCK: For reading and writing, \`skillCategory\` MUST be EXACTLY one of these 10 strings — no synonyms, no renamings, no inventions:\n  ${satRwQuestionTypes.map((s) => `"${s}"`).join(", ")}\n  Never use "Main Idea", "Supporting Details", "Textual Evidence", "Vocabulary in Context", "Word Choice", "Author's Purpose", "Point of View", "Rhetorical Analysis", "Comparing Texts", "Paired Passages", "Sentence Placement", "Paragraph Organization", "Logical Sequence", "Conciseness", "Precision", "Boundaries" (unqualified), "Punctuation", "Commas", "Apostrophes", "Colons", "Semicolons", "Idioms", "Subject-Verb Agreement", "Pronoun-Antecedent Agreement", "Pronoun Agreement", "Verb Tense", "Modifiers", "Parallel Structure", or "Linking Clauses". Map them: grammar errors (subject-verb, pronoun, verb tense, modifiers, parallel structure, possessives) → "Form, Structure, and Sense"; run-ons, comma splices, fragments, and clause-joining punctuation → "Sentence Boundaries"; word-choice/vocabulary in context → "Words in Context"; author purpose / structure / function → "Text Structure and Purpose"; notes-to-sentence goal items → "Rhetorical Synthesis"; paired-passage comparison → "Cross-Text Connections".`
    : ""
}
${
  topicLocked
    ? `- TOPIC LOCK (STRICT): You are locked to the topic: "${topicTrimmed}". Every element of every question — the setup, the solution method, and the skill being tested — MUST directly involve "${topicTrimmed}" and nothing else. The skillCategory field MUST equal "${topicTrimmed}" exactly. If you cannot generate a question purely about "${topicTrimmed}", say so by emitting fewer questions instead of drifting to an adjacent topic. DO NOT drift to other SAT domains.`
    : `- Each question must use a DIFFERENT skillCategory — no two questions in a 5-question block share the same sub-skill. Use specific sub-skill names (e.g. "Linear Equations", "Ratios & Rates", "Transitions", "Words in Context") — not broad domain names like "Algebra" or "Advanced Math".`
}
${
  difficultyLocked && difficulty && difficulty !== "Mixed"
    ? `- DIFFICULTY LOCK: Every question must be ${difficulty.toUpperCase()} per the rubric below. Do not mix in other difficulties.`
    : `- Tag each question with its TRUE difficulty. Roughly 20% Easy, 60% Medium, 20% Hard.`
}

${mathDifficultyRules}
${rwDifficultyRules}
${distractorRules}
${section === "math" ? mathWordingRules : rwStemTemplatesBlock}
${selfVerificationBlock}

${seenFingerprintsBlock}${seenStemsBlock}${
  seenStemsBlock || seenFingerprintsBlock
    ? "Do not generate a question that tests the same concept in the same way as any of the previously seen questions above. Vary the scenario, numbers, passage content, and answer choices every time.\n"
    : ""
}
${sectionGuidelines[section as keyof typeof sectionGuidelines] || sectionGuidelines.math}

FORMAT BY SECTION:
- Math: Self-contained questions. Use Digital SAT stems ("What value of x satisfies…", "Function f is defined by…", "In the xy-plane…"). At least 1 word problem per 5 questions. Vary types (equations, word problems, functions, geometry).
- Reading: "passage" field = 30–150 words, excerpt style (never "This passage is about…"). MUST contain AT LEAST 2 complete sentences, each ending in . ! or ?. "question" field = ONLY the question text, never the passage text. EXCEPTION: Rhetorical Synthesis items use a bulleted note list instead of prose (at least 3 bullets, each prefixed with "- " or "• "). Cross-Text Connections items contain TWO short texts labeled "Text 1" and "Text 2", each with at least 2 complete sentences.

PASSAGE TOPIC ROTATION (mandatory):
Each passage in a set MUST come from a different domain. Cycle through these in order, one per question:
1. Literary fiction or literary nonfiction (a character, narrator, or personal essay)
2. History or social studies (a speech, letter, document, or argument from history)
3. Natural science (biology, chemistry, physics, or earth science — a study, finding, or explanation)
4. Humanities (art, philosophy, linguistics, or cultural analysis)
5. Social science (economics, psychology, sociology, or political science)

Never use the same domain twice in a row. Never generate two passages about the same subject matter within a single test session.
- Writing: "passage" field = plain sentence/paragraph WITHOUT any brackets, bold, or underline markup. MUST contain AT LEAST 2 complete sentences (unless the question is Rhetorical Synthesis, in which case the passage is a ≥3-bullet note list). The "question" field must quote the exact word/phrase/punctuation being revised using standard double quotes (e.g., Which choice best replaces "they're" in the sentence?). Use literal punctuation symbols (, ; : . — ! ? ' ") and digits for numbers — never spell them out. "NO CHANGE" as an option only when original is correct (20–30% of questions max). Never repeat identical option sets within a block.

VARIETY: No near-duplicate stems or scenarios. Each question in a set should feel distinct in context and structure.

NO EXPLANATIONS: Do NOT include explanations, rationales, or strategy tips for the user. The "_scratchpad" field is internal; you must still populate it for self-verification but it will be removed before the question reaches the student. Only return the question, options, correctAnswer, difficulty, skillCategory, and _scratchpad fields.

${topicLocked ? `TOPIC REMINDER: "${topicTrimmed}" only — every question must stay on this topic. skillCategory must equal "${topicTrimmed}".` : topic ? `Focus area: ${topic}` : ""}
${difficulty && difficulty !== "Mixed"
  ? `DIFFICULTY REMINDER: All questions must be ${difficulty.toUpperCase()}. Do not water down.`
  : ""}
`;

    // Create completion with timeout
    // Always generate a fresh set so users do not repeatedly receive the same test.
    const shouldUseCache = false;
    const cacheKey = `generate-practice:v5-specific-skills:${JSON.stringify({ section, questionCount, topic, difficulty })}`;
    const cachedResponse = shouldUseCache ? getCachedValue<any>(cacheKey) : null;

    const MAX_BLOCK_ATTEMPTS = topicLocked || difficultyLocked ? 6 : 3;
    const MAX_SET_ATTEMPTS = strictConfigNoFallback ? 3 : 2;
    const isSmallSet = questionCount <= 5;
    const isAppendBatch = Boolean(existingPracticeTest);
    const generationStartedAt = Date.now();
    const generationDeadlineMs = isSmallSet
      ? 72000
      : strictConfigNoFallback
      ? questionCount >= 20
        ? 195000
        : questionCount >= 10
          ? 135000
          : 105000
      : questionCount >= 20
        ? 240000
        : questionCount >= 10
          ? 120000
          : 65000;
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
      : `- Each question must target exactly ONE specific SAT sub-skill. Math examples: "Linear Equations", "Systems of Equations", "Quadratic Equations", "Non-linear Functions", "Ratios & Rates", "Data Interpretation", "Area & Volume", "Triangles", "Trigonometry", "Circles". R&W examples: "Central Ideas and Details", "Command of Evidence", "Words in Context", "Transitions", "Sentence Boundaries", "Form, Structure, and Sense". Do NOT use broad domain names like "Algebra" or "Standard English Conventions" — always give the specific sub-skill name.\n- Each question in a set must have a DIFFERENT skillCategory (no two questions share the same sub-skill within a 5-question block).`;

    const varietyRequirementsBlock = topicLocked
      ? `VARIETY (topic-locked mode):
- Change scenarios, wording, and stem structure between questions, but remain 100% on "${topicTrimmed}".
- Never repeat the same question template with only different numbers — each stem must be structurally distinct.
- Do not introduce other SAT topics to create variety.`
      : `VARIETY REQUIREMENTS (all sections):
- Avoid repeating question stems or near-identical scenarios within a set (including across 5-question blocks).
- Never reuse the same stem template with only different numbers.
- Math: include at least one word problem per 5 questions, plus non-word problems; vary domains and representations (equations, graphs, tables).
- Reading/Writing: vary question types across official SAT domains and avoid identical phrasing.`;

    const authenticityMathBullet = topicLocked
      ? `- Math: Authentic Digital SAT style for "${topicTrimmed}" only; word problems only when they genuinely fit this topic (do not use generic algebra word problems as filler).`
      : `- Math: Include word problems with real-world contexts`;

    const sectionForAlignment =
      section === "reading-writing"
        ? "reading"
        : (section as "math" | "reading" | "writing");

    const applyConfigFilters = <
      T extends {
        question?: string;
        passage?: string | null;
        skillCategory?: string;
        skillFocus?: string;
        correctAnswer?: string;
        options?: Record<string, string> | string[] | null;
        difficulty?: string;
      },
    >(
      list: T[],
      options: { strictDifficulty?: boolean } = {}
    ): T[] => {
      let out = list;
      if (topicLocked) {
        const exactMatch = out.filter((q) =>
          skillExactlyMatchesTopic(topicTrimmed, q.skillCategory || q.skillFocus || "")
        );
        const alignedMatch = out.filter((q) =>
          questionAlignsWithLockedTopic(topicTrimmed, sectionForAlignment, {
            question: String(q.question || ""),
            skillCategory: q.skillCategory,
            skillFocus: q.skillFocus,
          })
        );
        out = exactMatch.length > 0 ? exactMatch : alignedMatch;
      }
      if (difficultyLocked && difficulty && difficulty !== "Mixed") {
        const lockedDiff = difficulty as LockedDifficulty;
        const strict = out.filter((q) =>
          questionAlignsWithLockedDifficulty({
            question: String(q.question || ""),
            passage: q.passage,
            section: sectionForAlignment,
            locked: lockedDiff,
          })
        );
        if (strict.length > 0 || options.strictDifficulty) {
          out = strict;
        } else {
          // Topic+difficulty locked: prefer strict matches, but keep plausible items
          // rather than returning zero questions (503).
          out = out.filter((q) => {
            const stem = String(q.question || "");
            if (lockedDiff === "Hard") {
              return !looksLikeTrivialOneStepLinear(stem);
            }
            if (lockedDiff === "Easy") {
              return stem.length <= 280;
            }
            return stem.length >= 40;
          });
        }
      }
      // Cross-session fingerprint dedup: drop anything the user has already seen.
      if (seenFingerprintSet.size > 0) {
        out = out.filter((q) => {
          const fp = computeFingerprint({
            question: String(q.question || ""),
            options: q.options ?? null,
            correctAnswer: q.correctAnswer,
            skillCategory: q.skillCategory,
            skillFocus: q.skillFocus,
          });
          return !fp || !seenFingerprintSet.has(fp);
        });
      }
      return out;
    };

    const getModelPayload = async (
      requestedCount: number,
      extraInstructions = "",
      options: { timeoutMs?: number; attempts?: number } = {}
    ) => {
      const modelCount = isAppendBatch
        ? Math.min(50, requestedCount + Math.max(3, Math.ceil(requestedCount * 0.75)))
        : Math.min(50, requestedCount + Math.max(2, Math.ceil(requestedCount * 0.35)));
      const timeoutMs =
        options.timeoutMs ??
        (isSmallSet
          ? 52000
          : strictConfigNoFallback
          ? requestedCount >= 20
            ? 60000
            : requestedCount >= 10
              ? 50000
              : 40000
          : requestedCount >= 20
            ? 50000
            : requestedCount >= 10
              ? 40000
              : 30000);
      const attempts = options.attempts ?? (isSmallSet ? 2 : requestedCount >= 15 ? 2 : 1);
      let lastModelError: unknown;
      for (const modelName of modelCandidates) {
        try {
          const completion = await withRetry(
            () => getOpenAIClient().chat.completions.create({
      model: modelName,
      temperature: section === "math" ? 0.3 : 0.7,
      max_tokens: Math.min(16000, Math.max(3000, requestedCount * 1200)),
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(requestedCount),
        },
        {
          role: "user",
          content: `Generate ${modelCount} SAT ${section} questions (use the best ${requestedCount}; extra items may be discarded).${
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
          const data = (completion.choices[0].message as any).parsed ??
            JSON.parse(completion.choices[0].message?.content || "{}");
    
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
          // Capture the model's self-verification scratchpad before any cleanup.
          // Stripped from the persisted/returned shape; logged server-side when
          // LOG_AI_SCRATCHPADS=1 for debugging hallucinated answers.
          const rawScratchpad = typeof q._scratchpad === "string" ? q._scratchpad.trim() : "";
          if (process.env.LOG_AI_SCRATCHPADS === "1" && rawScratchpad) {
            console.info("[ai-scratchpad]", {
              skill: q.skillCategory || q.skillFocus,
              difficulty: q.difficulty,
              scratchpad: rawScratchpad.slice(0, 600),
            });
          }

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
          if (isRwSection(section) && passageForQuestion && questionText) {
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
          if (isRwSection(section) && (!questionText || questionText.trim().length === 0)) {
            questionText = "Which choice is best supported by the passage?";
          }


          
          // Truncate if too long
          questionText = truncateText(questionText, 500);

          let finalPassage = passageForQuestion;
          if (isRwSection(section)) {
            // Strip any residual bracket/bold/angle/underscore markup the model may still emit.
            const stripMarkup = (text: string) =>
              text
                .replace(/\[([^\]]+)\]/g, "$1")
                .replace(/\*\*(.+?)\*\*/g, "$1")
                .replace(/__(.+?)__/g, "$1")
                .replace(/<([^>]+)>/g, "$1");
            if (finalPassage) finalPassage = stripMarkup(finalPassage);
            questionText = stripMarkup(questionText);
          }

          if (isRwSection(section) && finalPassage) {
            const words = String(finalPassage).trim().split(/\s+/).filter(Boolean).length;
            if (words < 25 || words > 250) {
              console.warn(`Soft filter: passage word count ${words} outside 25-250 range, keeping question`);
            }

            // Hard filter: every reading/writing passage must have at least 2 complete
            // sentences (ending in . ! or ?). Rhetorical Synthesis is the only exception —
            // its passage is a bulleted note list (≥3 short bullets).
            const countSentences = (text: string) =>
              (text.match(/[.!?](?=\s|$|["')\]])/g) || []).length;
            const bulletCount = (finalPassage.match(/(^|\n)\s*[-•*]\s+\S/g) || []).length;
            const skillLabel = String(q.skillCategory || q.skillFocus || "").toLowerCase();
            const isRhetSynth = skillLabel.includes("rhetorical synthesis");

            const passesSentenceRule = isRhetSynth
              ? bulletCount >= 3
              : countSentences(finalPassage) >= 2;

            if (!passesSentenceRule) {
              console.warn("Soft filter: passage failed 2-sentence rule, dropping question", {
                isRhetSynth,
                sentences: countSentences(finalPassage),
                bullets: bulletCount,
              });
              return null;
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

          const skillLabelForValidation = String(q.skillCategory || q.skillFocus || "");
          if (
            section === "writing" ||
            (section === "reading-writing" && isConventionSkill(skillLabelForValidation))
          ) {
            const targetPhrase = extractMarkedTarget(questionText) || extractMarkedTarget(finalPassage || "");
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

          if (section === "math" && !passesAuditMathSignal(questionText)) {
            console.warn("Hard filter: math question failed audit SAT signal check");
            return null;
          }

          if (
            isRwSection(section) &&
            !passesAuditRwSignal(questionText, String(finalPassage || ""), String(passage || ""))
          ) {
            console.warn("Hard filter: R&W question failed audit SAT signal check");
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
            console.warn("Soft filter: question did not pass SAT-style heuristics, keeping");
          }

          if (
            isRwSection(section) &&
            hasGenericSatStem(questionText) &&
            String(finalPassage || "").length < 140
          ) {
            console.warn("Soft filter: generic SAT stem with short passage, keeping");
          }

          if (section === "writing" || section === "reading-writing") {
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
          
          // Explanations are generated on demand at review time — keep empty here.
          const explanationCorrect = "";
          const explanationIncorrect: Record<string, string> = {};
          const strategyTip = "";
          
          // Validate question format
          const validation = validateQuestionFormat({
            question: questionText,
            options: Object.values(cleanedOptions),
            correctAnswer: q.correctAnswer,
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
            const sectionDefaults: Record<string, string> = {
              math: "Problem Solving",
              reading: "Reading Comprehension",
              writing: "Grammar & Usage",
              "reading-writing": "Reading & Writing",
            };
            skillFocus = sectionDefaults[section] || section.charAt(0).toUpperCase() + section.slice(1);
          }

          // Reading/Writing MUST use one of the canonical 10 sub-skills. Map any
          // synonyms (e.g. "Main Idea", "Punctuation", "Subject-Verb Agreement") to
          // their canonical parent before saving so the result-grid rollups stay clean.
          if (section !== "math") {
            const rwSection = section === "writing" ? "writing" : "reading";
            skillFocus = canonicalizeRwSkill(skillFocus, rwSection);
          }

          const skillCategory = ensureSingleSkill(skillFocus, skillFocus);

          // Self-verification gate: prefer math Hard items with scratchpad, but do not
          // drop otherwise-valid questions (caused 503s and slow retry loops).
          if (
            section === "math" &&
            questionDifficulty === "Hard" &&
            rawScratchpad.replace(/\s+/g, "").length < 8
          ) {
            console.warn("Hard math question missing scratchpad; keeping question");
          }

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
            passageDomain: q.passageDomain || null,
            // Internal-only — stripped before persist/response. See stripInternalFields().
            _scratchpad: rawScratchpad,
          };
        });

      return transformed.flatMap((q) => (q ? [q] : []));
    };

    /**
     * Strip internal-only fields (e.g. `_scratchpad`) before persisting to the DB
     * or returning to the client. Always call before the final response or
     * Prisma write.
     */
    const stripInternalFields = <T extends Record<string, any>>(question: T): T => {
      const cleaned: Record<string, any> = { ...question };
      delete cleaned._scratchpad;
      return cleaned as T;
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
      const raw = String(text || "");
      const bracketMatch = raw.match(/\[([^\]]+)\]/);
      if (bracketMatch?.[1]) return bracketMatch[1].trim();
      const boldMatch = raw.match(/\*\*([^*]+)\*\*/);
      if (boldMatch?.[1]) return boldMatch[1].trim();
      // Writing questions now quote the target word/phrase with standard or curly quotes.
      const quoteMatch = raw.match(/["“]([^"”]{1,80})["”]/);
      if (quoteMatch?.[1]) return quoteMatch[1].trim();
      const singleQuoteMatch = raw.match(/['‘]([^'’]{1,80})['’]/);
      if (singleQuoteMatch?.[1]) return singleQuoteMatch[1].trim();
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
      return pool.some((existing) => {
        const existingStem = String(existing?.question || "");
        const existingPassage = String(existing?.passage || "");
        const stemNearDuplicate = areAuditNearDuplicateStems(candidateStem, existingStem, 0.92);
        if (!stemNearDuplicate) return false;
        if (section === "math") return true;
        return (
          candidatePassage.length > 20 &&
          existingPassage.length > 20 &&
          areNearDuplicateQuestions(candidatePassage, existingPassage, 0.82)
        );
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

    const existingQuestionsForGeneration: any[] = parseStoredQuestions(
      existingPracticeTest?.questions ?? null
    );

    const existingRwSignatures = new Set<string>();
    if (isRwSection(section)) {
      for (let start = 0; start < existingQuestionsForGeneration.length; start += 5) {
        const firstInBlock = existingQuestionsForGeneration[start];
        if (!firstInBlock) continue;
        const signature = getPassageSignature(getRwSignatureSource(firstInBlock));
        if (signature) {
          existingRwSignatures.add(signature);
        }
      }
    }

    const isWordProblem = (text: string) => {
      return /percent|ratio|rate|speed|distance|time|hours|minutes|miles|cost|price|profit|loss|revenue|tickets|students|people|population|temperature|degrees|area|volume|length|width|height|mi|km|dollars|\$|per\s+hour|per\s+minute|per\s+day/i.test(text);
    };

    const getMathDomain = (skill: string) => getMathTopicDomain(skill);

    const passesPassageRotation = (questions: any[]) => {
      if (!isRwSection(section)) return true;
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

    const passesUniqueSkillCategories = (questions: any[]) => {
      if (topicLocked) return true;
      const blockSize = 5;
      for (let start = 0; start < questions.length; start += blockSize) {
        const block = questions.slice(start, start + blockSize);
        const seen = new Set<string>();
        for (const q of block) {
          const skill = normalizeCompare(String(q.skillCategory || q.skillFocus || ""));
          if (!skill) continue;
          if (seen.has(skill)) return false;
          seen.add(skill);
        }
      }
      return true;
    };

    const filterUniqueSkillCategories = (questions: any[]) => {
      // Do not drop questions here — that caused partial sets (9/10, 18/20).
      // Skill variety is enforced via passesUniqueSkillCategories during generation retries.
      return questions;
    };

    const passesAuditStemUniqueness = (questions: any[]) => {
      for (let i = 0; i < questions.length; i += 1) {
        for (let j = i + 1; j < questions.length; j += 1) {
          if (
            areAuditNearDuplicateStems(
              String(questions[i]?.question || ""),
              String(questions[j]?.question || ""),
              0.92
            )
          ) {
            return false;
          }
        }
      }
      return true;
    };

    const passesRwBlockStemUniqueness = (questions: any[]) => {
      if (section === "math") return true;
      const blockSize = 5;
      for (let start = 0; start < questions.length; start += blockSize) {
        const block = questions.slice(start, start + blockSize);
        for (let i = 0; i < block.length; i += 1) {
          for (let j = i + 1; j < block.length; j += 1) {
            if (
              areAuditNearDuplicateStems(
                String(block[i]?.question || ""),
                String(block[j]?.question || ""),
                0.92
              )
            ) {
              return false;
            }
          }
        }
      }
      return true;
    };

    const passesSetConstraints = (questions: any[]) => {
      const mathVarietyOk = topicLocked && section === "math" ? true : passesMathVariety(questions);
      const mathWordProblemsOk =
        topicLocked && section === "math" ? true : passesMathWordProblemQuota(questions);
      const mathStemUniquenessOk = section !== "math" || passesAuditStemUniqueness(questions);
      const rwBlockStemOk = passesRwBlockStemUniqueness(questions);
      return (
        passesPassageRotation(questions) &&
        mathVarietyOk &&
        mathWordProblemsOk &&
        mathStemUniquenessOk &&
        rwBlockStemOk &&
        passesWritingOptionVariety(questions) &&
        passesUniqueSkillCategories(questions)
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
            const usedDomains = transformedAll
              .map((q: any) => String(q.passageDomain || "")).filter(Boolean);
            const domainHint = usedDomains.length > 0
              ? ` Passage domains already used in this session: ${[...new Set(usedDomains)].join(", ")}. You MUST pick a completely different domain for this block.`
              : "";

            const rwBlockExtra = topicLocked
              ? `This is block ${blockIndex + 1} of ${blockCounts.length}. Generate exactly ${count} questions. TOPIC LOCK: every question must target "${topicTrimmed}" only.${difficultyLocked && difficulty && difficulty !== "Mixed" ? ` All ${difficulty} difficulty.` : ""} Each question must use a DISTINCT stem (vary wording; do not repeat the same template).${domainHint}`
              : `This is block ${blockIndex + 1} of ${blockCounts.length}. Generate exactly ${count} questions for this block only. Each question must use a DISTINCT stem wording — never repeat the same question template within this block.${domainHint}`;
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

            if (isRwSection(section) && unique.some((q) => !q.passage)) {
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
            : "FAST MODE: Return a complete, valid set in one response. Prioritize speed while keeping SAT style and valid JSON. Each question must use a DIFFERENT skillCategory.";
        const fastData = await getModelPayload(questionCount, fastExtra, {
          attempts: 1,
          timeoutMs: Math.floor(generationDeadlineMs * 0.4),
        });
        const fastTransformed = filterUniqueSkillCategories(
          dedupeAndFilterNearDuplicates(
            applyConfigFilters(transformQuestions(fastData.questions, fastData.passage))
          )
        ).slice(0, questionCount);
        const hasEnough = fastTransformed.length >= questionCount;
        const rwHasPassages =
          section === "math" || fastTransformed.every((q: any) => !!q.passage);
        const constraintsOk = passesSetConstraints(fastTransformed);
        const nearEnough = fastTransformed.length >= questionCount - 1;
        const mathStemsOk =
          section !== "math" || passesAuditStemUniqueness(fastTransformed);
        if (
          fastTransformed.length > 0 &&
          rwHasPassages &&
          mathStemsOk &&
          (hasEnough || (nearEnough && isSmallSet)) &&
          (constraintsOk || topicLocked || isSmallSet || hasEnough)
        ) {
          passage = fastData.passage;
          transformedAll = fastTransformed;
        }
      } catch (fastPathError) {
        console.warn("Fast-path generation failed, falling back to block mode:", fastPathError);
      }

      // Small sets use fast path + top-up only. Long sets use block mode until full count.
      const skipBlockMode = isSmallSet || transformedAll.length >= questionCount;

      if (!skipBlockMode && transformedAll.length < questionCount) {
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
              if (isRwSection(section) && block.questions.some((q) => !q.passage)) {
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
            if (rwRepairPasses >= 3) {
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
        if (!passesSetConstraints(transformedAll) && setAttempt < MAX_SET_ATTEMPTS - 1) {
          // Keep partial progress for top-up rather than discarding the whole set.
          if (transformedAll.length < Math.ceil(questionCount * 0.6)) {
            continue;
          }
        }
        break;
      }
      }
    }

    // If deadline is hit, continue with whatever we have and fill the rest using fallback questions.
    
    // Remove duplicate questions based on question text
    const uniqueQuestions = dedupeAndFilterNearDuplicates(transformedAll);

    let finalQuestions = uniqueQuestions.length >= questionCount
      ? uniqueQuestions.slice(0, questionCount)
      : transformedAll.slice(0, questionCount);

    finalQuestions = filterUniqueSkillCategories(
      filterAgainstExistingQuestions(finalQuestions)
    );

    // Top-up loop if the first generation came up short.
    const maxTopUpPasses = isAppendBatch ? 14 : isSmallSet ? 8 : Math.max(10, Math.ceil(questionCount / 2));
    for (let topUpPass = 0; topUpPass < maxTopUpPasses && finalQuestions.length < questionCount; topUpPass += 1) {
      const missing = questionCount - finalQuestions.length;
      const allowPastDeadline =
        isSmallSet || isAppendBatch || missing <= Math.max(5, Math.ceil(questionCount * 0.25));
      if (isPastDeadline() && !allowPastDeadline) break;
      try {
        const chunkSize = Math.min(5, missing);
        const existingStemHint = [...finalQuestions, ...existingQuestionsForGeneration]
          .map((q: any) => String(q.question || "").slice(0, 100))
          .filter(Boolean)
          .slice(isAppendBatch ? -25 : -12);
        const dedupeHint =
          existingStemHint.length > 0
            ? ` Do NOT repeat these stems or scenarios: ${existingStemHint.join(" | ")}.`
            : "";
        const usedSkills = finalQuestions
          .map((q: any) => String(q.skillCategory || q.skillFocus || "").trim())
          .filter(Boolean);
        const skillHint =
          !topicLocked && usedSkills.length > 0
            ? ` Each new question MUST use a different skillCategory than: ${usedSkills.join(", ")}.`
            : "";
        const topUpExtra = `TOP-UP: Generate exactly ${chunkSize} additional SAT ${section} questions, distinct stems and scenarios from prior items.${dedupeHint}${skillHint} Valid JSON, concise.${topicLocked ? ` TOPIC LOCK: "${topicTrimmed}" only.` : ""}${difficultyLocked && difficulty && difficulty !== "Mixed" ? ` All ${difficulty} difficulty.` : ""}`;
        const topUpData = await getModelPayload(chunkSize, topUpExtra, {
          attempts: 2,
          timeoutMs: isSmallSet ? 40000 : 50000,
        });
        const topUpTransformed = applyConfigFilters(
          transformQuestions(topUpData.questions, topUpData.passage)
        );
        const combined = filterUniqueSkillCategories(
          dedupeAndFilterNearDuplicates([...finalQuestions, ...topUpTransformed])
        );
        finalQuestions = filterAgainstExistingQuestions(combined).slice(0, questionCount);
      } catch (topUpError) {
        console.warn("Practice generation top-up failed:", topUpError);
        break;
      }
    }

    if (finalQuestions.length < questionCount) {
      let emergencyAttempts = 0;
      while (finalQuestions.length < questionCount && emergencyAttempts < 4) {
        emergencyAttempts += 1;
      try {
        const missing = questionCount - finalQuestions.length;
        const existingStemHint = [...finalQuestions, ...existingQuestionsForGeneration]
          .map((q: any) => String(q.question || "").slice(0, 100))
          .filter(Boolean)
          .slice(isAppendBatch ? -25 : -12);
        const emergencyExtra = `EMERGENCY TOP-UP (attempt ${emergencyAttempts}): Generate exactly ${missing} more SAT ${section} questions. Each must use a canonical Digital SAT stem (e.g. "Which choice completes the text with the most logical and precise word or phrase?" or "Which choice best states the main purpose of the text?"). Distinct from: ${existingStemHint.join(" | ")}.${topicLocked ? ` TOPIC LOCK: "${topicTrimmed}".` : ""}`;
        const emergencyData = await getModelPayload(missing, emergencyExtra, {
          attempts: 3,
          timeoutMs: 60000,
        });
        const emergencyTransformed = applyConfigFilters(
          transformQuestions(emergencyData.questions, emergencyData.passage)
        );
        const combined = filterUniqueSkillCategories(
          dedupeAndFilterNearDuplicates([...finalQuestions, ...emergencyTransformed])
        );
        const next = filterAgainstExistingQuestions(combined).slice(0, questionCount);
        if (next.length <= finalQuestions.length) break;
        finalQuestions = next;
      } catch (emergencyError) {
        console.warn("Emergency practice top-up failed:", emergencyError);
        break;
      }
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

    if (isRwSection(section) && !passage && finalQuestions.every((q: any) => !q.passage)) {
      throw new Error("Reading passage is required for reading questions.");
    }

    // Compute fingerprints from the final question set BEFORE we strip internal
    // fields so we can append them to the user's seen-list for next time.
    const newFingerprints = computeFingerprints(
      finalQuestions.map((q: any) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        skillCategory: q.skillCategory,
        skillFocus: q.skillFocus,
      }))
    );

    const normalizedQuestions = finalQuestions
      .map((q: any) => stripInternalFields(q))
      .map((q: any, idx: number) => ({ ...q, id: idx + 1 }));

    if (shouldUseCache && !cacheIsValid && normalizedQuestions.length === questionCount) {
      setCachedValue(cacheKey, { passage, questions: normalizedQuestions });
    }

    const { user } = accessContext;

    let practiceTestId = existingPracticeTest?.id;
    let responseQuestions = normalizedQuestions;
    let responsePassage = passage;

    if (existingPracticeTest) {
      const appendResult = await prisma.$transaction(async (tx) => {
        const latestPracticeTest = await tx.practiceTest.findFirst({
          where: { id: existingPracticeTest.id, userId: user.id },
          select: { id: true, questions: true, passage: true, createdAt: true },
        });

        if (!latestPracticeTest) {
          throw new PracticeAppendTargetMissingError();
        }

        const existingQuestions = parseStoredQuestions(latestPracticeTest.questions);
        if (
          !gate.hasSubscription &&
          (!isCurrentFreeTierMonth(latestPracticeTest.createdAt) ||
            wouldExceedFreePracticeAppendLimit(existingQuestions, normalizedQuestions.length))
        ) {
          throw new FreePracticeAppendLimitError();
        }

        const offset = existingQuestions.length;
        const appended = normalizedQuestions.map((q: any, idx: number) => ({
          ...q,
          id: offset + idx + 1,
        }));
        const mergedQuestions = [...existingQuestions, ...appended];
        const mergedPassage = latestPracticeTest.passage || passage || null;

        await tx.practiceTest.update({
          where: { id: latestPracticeTest.id },
          data: {
            questions: JSON.stringify(mergedQuestions),
            passage: mergedPassage,
          },
        });

        return {
          appended,
          mergedPassage,
        };
      });
      practiceTestId = existingPracticeTest.id;
      responseQuestions = appendResult.appended;
      responsePassage = appendResult.mergedPassage || undefined;
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

    // Append the newly generated fingerprints to the user's seen-list so future
    // generations can avoid them. Single update; capped to MAX_FINGERPRINTS in
    // mergeFingerprints.
    if (newFingerprints.length > 0) {
      try {
        const merged = mergeFingerprints(seenFingerprintList, newFingerprints);
        await prisma.user.update({
          where: { id: user.id },
          data: { seenQuestionFingerprints: JSON.stringify(merged) },
        });
      } catch (fpWriteError) {
        console.warn("Failed to persist seen fingerprints:", fpWriteError);
      }
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
    if (error instanceof FreePracticeAppendLimitError) {
      return NextResponse.json(
        {
          error:
            "Free starter practice checkpoints can include up to 50 questions. Unlock Plus for unlimited practice.",
        },
        { status: 402 }
      );
    }

    if (error instanceof PracticeAppendTargetMissingError) {
      return NextResponse.json(
        { error: "Existing practice test not found for this user/session." },
        { status: 404 }
      );
    }

    return handleApiError(error);
  }
}

