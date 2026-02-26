import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { z } from "zod";
import { validateQuestionFormat, cleanMathNotation, cleanText, removeDuplicates, truncateText, applyBoldToMarkedTarget, ensureSingleSkill, ensureBoldEmphasis, formatEquationLineBreaks } from "@/utils/aiValidation";
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

    const accessContext = await getAccessContext();
    const rlKey = `ai:${accessContext.user?.id ?? accessContext.sessionId ?? "anon"}`;
    const rl = rateLimit(rlKey, { limit: 25, windowSeconds: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a moment." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    let existingPracticeTest: { id: string; questions: string | null; passage: string | null } | null = null;

    if (existingTestId) {
      const whereOwnership = accessContext.user?.id
        ? { id: existingTestId, userId: accessContext.user.id }
        : { id: existingTestId, sessionId: accessContext.sessionId };
      existingPracticeTest = await prisma.practiceTest.findFirst({
        where: whereOwnership,
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
          { error: "Free tier limit reached. Upgrade to Premium for unlimited access." },
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
- Test common SAT grammar errors, not obscure rules
- Questions should test editing skills, not just identification
- Match real SAT question style: clear, unambiguous, test practical editing skills
- Include questions that test both correctness and effectiveness
- Vary question types within a set (transitions, boundaries, concision, precision, synthesis) and avoid repeating stems`,
    };

    // Create completion with timeout
    const shouldUseCache = !existingTestId;
    const cacheKey = `generate-practice:${JSON.stringify({ section, questionCount, topic, difficulty })}`;
    const cachedResponse = shouldUseCache ? getCachedValue<any>(cacheKey) : null;

    const MAX_BLOCK_ATTEMPTS = 4;
    const MAX_SET_ATTEMPTS = 3;

    const getModelPayload = async (requestedCount: number, extraInstructions = "") => {
      const timeoutMs = requestedCount >= 20 ? 150000 : requestedCount >= 10 ? 100000 : 60000;
      const completion = await withRetry(
        () => getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: Math.min(3600, Math.max(900, requestedCount * 360)),
      messages: [
        {
          role: "system",
          content: `You are an expert SAT tutor helping a student improve their score. Your role is to create practice questions and provide clear, step-by-step explanations that help students understand not just WHAT the answer is, but WHY it's correct. Think like a high-performing student helping a peer - be encouraging, clear, and educational.

Your explanations should:
- Break down complex problems into manageable steps
- Explain the reasoning behind each step
- Use a supportive but professional tone
- Help students learn from mistakes, not just memorize answers
- Provide strategy tips that feel like a tutor's advice

Output MUST be valid JSON using this exact structure:

{
  "passage": "string (OPTIONAL for reading. For reading, you may include a root passage OR include a 'passage' field per question.)",
  "questions": [
    {
      "passage": "string (OPTIONAL for reading questions only - 3-6 sentences). If present, the question must reference this passage.",
      "question": "string (for reading: ONLY the question text, never include the passage. The passage is shown separately above all questions.)",
      "options": ["string", "string", "string", "string"],
      "section": "Reading & Writing" | "Math",
      "skillCategory": "string (single SAT skill category)",
      "correctAnswer": "A",
      "explanation_correct": "string",
      "explanation_incorrect": {
        "A": "string (if A is wrong)",
        "B": "string (if B is wrong)",
        "C": "string (if C is wrong)",
        "D": "string (if D is wrong)"
      },
      "strategy_tip": "string",
      "difficulty": "Easy" | "Medium" | "Hard"
    }
  ]
}

CRITICAL RULES:
- Generate exactly the number of questions requested (${requestedCount}).
- Use ONLY four options: A, B, C, D.
- NEVER use special characters like ^. Use actual superscripts (x², x³) or write "to the power of".
- No markdown formatting.
- You may use **bold** for emphasis only (1-2 per explanation/strategy tip). Do not use markdown lists or headings.
- Each question must target exactly ONE SAT skill category.
- Do NOT reuse or closely mimic official SAT wording or passages. All content must be original but SAT-style.
- Each question MUST include a "difficulty" field ("Easy", "Medium", or "Hard") that matches the actual complexity.
- For READING sections: Provide passages and keep them separate from the question text. Use either a root "passage" for all questions OR include a "passage" field on each question. If using per-question passages, ensure a NEW passage every 5 questions.
- explanation_correct: Keep concise (1-2 short sentences). Explain the key reason the correct answer works.
- explanation_incorrect: For each wrong option, write one short sentence naming the mistake.
- strategy_tip: One short actionable sentence.

DIFFICULTY LEVELS (must change complexity):
- EASY: 
  * Math: Single-step problems, basic concepts, straightforward calculations, minimal setup
  * Reading: Direct information retrieval, simple vocabulary, clear main idea
  * Writing: Obvious errors, common grammar rules, simple corrections
- MEDIUM: 
  * Math: Multi-step problems, moderate reasoning, some word problems, requires choosing a method
  * Reading: Requires inference, moderate vocabulary, passage analysis
  * Writing: Subtle errors, requires understanding context, moderate complexity
- HARD: 
  * Math: Complex multi-step problems, non-obvious setup, multi-concept, tricky wording or constraints
  * Reading: Deep inference, sophisticated vocabulary, complex passage analysis, paired passages
  * Writing: Subtle errors, multiple rules involved, requires careful analysis

${sectionGuidelines[section as keyof typeof sectionGuidelines] || sectionGuidelines.math}

${topic ? `- Focus on topic: ${topic}` : ""}
${difficulty && difficulty !== "Mixed"
  ? `- All questions must be ${difficulty.toUpperCase()} difficulty and match the SAT-specific difficulty rubric above. Do NOT water down difficulty.`
  : "- Use realistic SAT distribution: 20% Easy, 60% Medium, 20% Hard. Tag each question with the correct difficulty and make sure the hard questions are genuinely challenging SAT-level items."}

FORMATTING REQUIREMENTS:
- For READING questions ONLY: Provide a separate passage that questions reference. Either use the root "passage" or a per-question "passage" field. If using per-question passages, provide a NEW passage every 5 questions.
- question: 
  * MATH: The question text with any necessary context or word problem setup
  * READING: ONLY the question text itself (e.g., "What is the main idea of the passage?" or "As used in line 5, 'elaborate' most nearly means..."). DO NOT repeat the passage in the question field.
  * WRITING: A short passage with the revision target wrapped in [brackets] inside the passage (example: "The committee [decide] to meet weekly."). Provide a NEW passage every 5 questions.
- options: array of exactly four answer choices as strings ["A text", "B text", "C text", "D text"].
  * For WRITING: Include "NO CHANGE" as an option when the underlined portion is already correct
- correctAnswer: one of "A", "B", "C", "D".
- explanation_correct: 1-2 short sentences.
- explanation_incorrect: object with short 1-sentence reasons for wrong answers only.
- strategy_tip: one short actionable sentence.

DIFFICULTY ENFORCEMENT:
- Hard questions must not be simple plug-and-chug. Include a non-obvious setup, multiple steps, or conceptual traps.
- Easy questions must remain truly basic, not medium in disguise.
- If you cannot produce the requested difficulty, rework the question until it matches.

VARIETY REQUIREMENTS (all sections):
- Avoid repeating question stems or near-identical scenarios within a set.
- Math: include at least one word problem per 5 questions, plus non-word problems; vary domains and representations (equations, graphs, tables).
- Reading/Writing: vary question types across official SAT domains and avoid identical phrasing.

CRITICAL FOR READING: 
- Put the passage in a separate field (root "passage" or per-question "passage")
- Each question's "question" field should ONLY contain the question text, never the passage
- If using per-question passages, rotate to a NEW passage every 5 questions

SAT AUTHENTICITY REQUIREMENTS:
- Questions must feel like real SAT questions, not generic test questions
- Use SAT-style wording: precise, academic, clear
- Include realistic distractors (wrong answers that test-takers might choose)
- Math: Include word problems with real-world contexts
- Reading: Passages should be excerpt-quality, not simplified
- Writing: Test practical editing skills, not obscure grammar rules
 - Reading questions must target a specific claim, inference, or detail (avoid generic main-idea prompts)

EXPLANATION QUALITY REQUIREMENTS (Concise but useful):
- Keep all explanation fields short and direct to reduce verbosity.
- Prioritize the key reason each answer is right/wrong over long walkthroughs.
- Use **bold** sparingly for only one key phrase if needed.

Make questions as similar as possible to actual SAT questions in style, wording, and format.
Do not output anything except the JSON.`,
        },
        {
          role: "user",
          content: `Generate ${requestedCount} SAT ${section} questions.${
            topic ? ` Focus on: ${topic}.` : ""
          }${difficulty && difficulty !== "Mixed" ? ` All questions must be ${difficulty.toUpperCase()} difficulty.` : ""}${
            extraInstructions ? ` ${extraInstructions}` : ""
          }`,
        },
      ],
      response_format: { type: "json_object" },
        }),
        2,
        timeoutMs
      );
      const responseText = completion.choices[0].message?.content || "{}";
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
    
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("Invalid response format from model.");
      }
    
      // Clean passage if provided
      if (data.passage && typeof data.passage === "string") {
        data.passage = cleanText(truncateText(data.passage, 2000));
      }

      return data;
    };

    const transformQuestions = (rawQuestions: any[], passage?: string): Record<string, any>[] => {
      const transformed: Array<Record<string, any> | null> = rawQuestions
        .map((q: any, index: number) => {
          const passageForQuestion =
            typeof q.passage === "string" && q.passage.trim().length > 0 ? q.passage.trim() : passage;

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

          if (section === "reading") {
            const lowered = questionText.toLowerCase();
            if (lowered.includes("main idea") || lowered.includes("main purpose")) {
              questionText = "Which statement is directly supported by the passage?";
            }
          }
          
          // Truncate if too long
          questionText = truncateText(questionText, 500);

          if (section === "writing") {
            const withTargetMarkup = ensureWritingTargetMarkup(questionText);
            const bolded = applyBoldToMarkedTarget(withTargetMarkup);
            questionText = bolded.valid ? bolded.text : withTargetMarkup;
          }
          
          // Clean options
          const cleanedOptions: Record<string, string> = {};
          if (Array.isArray(q.options)) {
            q.options.forEach((opt: string, i: number) => {
              const letter = String.fromCharCode(65 + i);
              const normalized = cleanMathNotation(cleanText(truncateText(opt, 200)))
                .replace(/^\s*[A-D][\)\.\:\-]\s*/i, "")
                .replace(/^\s*[A-D]\s+/i, "");
              cleanedOptions[letter] = normalized;
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
    
          // Determine difficulty based on question complexity (if not provided)
          let questionDifficulty: "Easy" | "Medium" | "Hard" = "Medium";
          if (difficulty === "Mixed" && section === "math") {
            const easyCount = Math.max(1, Math.round(questionCount * 0.2));
            const hardCount = Math.max(1, Math.round(questionCount * 0.2));
            const hardStart = questionCount - hardCount;
            questionDifficulty = index < easyCount ? "Easy" : index >= hardStart ? "Hard" : "Medium";
          } else if (q.difficulty && ["Easy", "Medium", "Hard"].includes(q.difficulty)) {
            questionDifficulty = q.difficulty;
          } else if (difficulty && difficulty !== "Mixed") {
            questionDifficulty = difficulty as "Easy" | "Medium" | "Hard";
          } else if (difficulty === "Mixed") {
            const easyCount = Math.max(1, Math.round(questionCount * 0.2));
            const hardCount = Math.max(1, Math.round(questionCount * 0.2));
            const hardStart = questionCount - hardCount;
            questionDifficulty = index < easyCount ? "Easy" : index >= hardStart ? "Hard" : "Medium";
          }
    
          // Extract skill focus from question or topic
          // If topic is provided, use it; otherwise try to infer from question content
          let skillFocus = q.skillFocus || topic;
          
          // If no skill focus provided, use a default based on section
          if (!skillFocus) {
            const sectionDefaults = {
              math: "Heart of Algebra",
              reading: "Information & Ideas",
              writing: "Standard English Conventions",
            };
            skillFocus = sectionDefaults[section as keyof typeof sectionDefaults] || section.charAt(0).toUpperCase() + section.slice(1);
          }
          const skillCategory = ensureSingleSkill(skillFocus, skillFocus);
          explanationCorrect = ensureBoldEmphasis(explanationCorrect, skillCategory);
          strategyTip = ensureBoldEmphasis(strategyTip, skillCategory);
    
          return {
            passage: passageForQuestion,
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

    const getPassageSignature = (text: string) => {
      return text
        .replace(/\[([^\]]+)\]/g, "$1")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .slice(0, 140);
    };

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
        const sourceText =
          section === "reading"
            ? block[0]?.passage
            : block[0]?.question;
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

    const passesSetConstraints = (questions: any[]) => {
      return (
        passesPassageRotation(questions) &&
        passesMathVariety(questions) &&
        passesMathWordProblemQuota(questions)
      );
    };

    const getDedupKey = (question: any) => {
      const base = String(question?.question || "").toLowerCase().trim();
      if (section === "math") {
        return normalizeMathStem(base);
      }
      return base;
    };

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
          const data = await getModelPayload(
            count,
            `This is block ${blockIndex + 1} of ${blockCounts.length}. Generate exactly ${count} questions for this block only.`
          );
          const blockPassage = data.passage;
          const transformed = transformQuestions(data.questions, blockPassage);
          const unique = removeDuplicates(transformed, (q: any) => getDedupKey(q)).slice(0, count);
          if (unique.length > bestQuestions.length) {
            bestQuestions = unique;
            bestPassage = blockPassage;
          }
          if (unique.length < count) continue;

          const signatureSource = section === "reading"
            ? String(unique[0]?.passage || "")
            : String(unique[0]?.question || "");
          const signature = getPassageSignature(signatureSource);
          if (!signature) continue;

          if (section === "reading" && unique.some((q) => !q.passage)) {
            continue;
          }

          return { questions: unique, passage: blockPassage, signature };
        }

        if (bestQuestions.length >= count) {
          const signatureSource = section === "reading"
            ? String(bestQuestions[0]?.passage || "")
            : String(bestQuestions[0]?.question || "");
          const signature = getPassageSignature(signatureSource) || `block-${blockIndex}-${Date.now()}`;
          return { questions: bestQuestions.slice(0, count), passage: bestPassage, signature };
        }

        throw new Error(`Failed to generate enough valid questions for block ${blockIndex + 1}.`);
      };

      const buildMathBlock = async (blockIndex: number, count: number): Promise<any[]> => {
        let bestQuestions: any[] = [];
        for (let attempt = 0; attempt < MAX_BLOCK_ATTEMPTS; attempt += 1) {
          const data = await getModelPayload(
            count,
            `This is block ${blockIndex + 1} of ${blockCounts.length}. Generate exactly ${count} varied SAT Math questions for this block. Include at least one word problem in this block of ${count} questions (target exactly one unless the prompt naturally requires more).`
          );
          const transformed = transformQuestions(data.questions, data.passage);
          const unique = removeDuplicates(transformed, (q: any) => getDedupKey(q)).slice(0, count);
          if (unique.length > bestQuestions.length) {
            bestQuestions = unique;
          }
          if (unique.length < count) continue;
          return unique;
        }

        if (bestQuestions.length >= count) {
          return bestQuestions.slice(0, count);
        }

        throw new Error(`Failed to generate enough valid math questions for block ${blockIndex + 1}.`);
      };

      for (let setAttempt = 0; setAttempt < MAX_SET_ATTEMPTS; setAttempt += 1) {
        passage = undefined;
        transformedAll = [];

        if (section === "math") {
          const mathBlocks = await Promise.all(
            blockCounts.map((count, idx) => buildMathBlock(idx, count))
          );
          transformedAll = removeDuplicates(mathBlocks.flat(), (q: any) => getDedupKey(q)).slice(0, questionCount);
        } else {
          const rwBlocks: Array<{ questions: any[]; passage?: string; signature: string } | null> = Array.from(
            { length: blockCounts.length },
            () => null
          );

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
              if (section === "reading" && block.questions.some((q) => !q.passage)) {
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

            invalidIndexes.forEach((idx) => {
              rwBlocks[idx] = null;
            });
          }

          const orderedBlocks = rwBlocks.filter(Boolean) as Array<{ questions: any[]; passage?: string; signature: string }>;
          if (orderedBlocks[0]?.passage) {
            passage = orderedBlocks[0].passage;
          }
          transformedAll = orderedBlocks.flatMap((block) => block.questions);
          transformedAll = removeDuplicates(transformedAll, (q: any) => getDedupKey(q)).slice(0, questionCount);
        }

        if (transformedAll.length < questionCount) {
          continue;
        }
        if (!passesSetConstraints(transformedAll) && setAttempt < MAX_SET_ATTEMPTS - 1) {
          continue;
        }
        break;
      }
    }
    
    // Remove duplicate questions based on question text
    const uniqueQuestions = removeDuplicates(transformedAll, (q: any) => getDedupKey(q));

    const finalQuestions = uniqueQuestions.length >= questionCount
      ? uniqueQuestions.slice(0, questionCount)
      : transformedAll.slice(0, questionCount);

    if (finalQuestions.length < questionCount || !passesSetConstraints(finalQuestions)) {
      throw new Error("Failed to generate enough valid questions.");
    }

    if (section === "reading" && !passage && finalQuestions.every((q: any) => !q.passage)) {
      throw new Error("Reading passage is required for reading questions.");
    }

    const normalizedQuestions = finalQuestions.map((q: any, idx: number) => ({ ...q, id: idx + 1 }));

    if (shouldUseCache && !cacheIsValid && normalizedQuestions.length === questionCount) {
      setCachedValue(cacheKey, { passage, questions: normalizedQuestions });
    }

    // Get userId or sessionId for saving
    const { user, sessionId } = accessContext;

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
          userId: user?.id,
          sessionId,
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
      id: practiceTestId, // Return test ID so we can update score later
      section: section,
      passage: existingPracticeTest ? responsePassage : responseBody.passage,
      questions: existingPracticeTest ? responseQuestions : responseBody.questions,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

