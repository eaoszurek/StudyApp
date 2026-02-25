import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { z } from "zod";
import { validateQuestionFormat, cleanMathNotation, cleanText, removeDuplicates, truncateText, applyBoldToMarkedTarget, ensureSingleSkill, ensureBoldEmphasis } from "@/utils/aiValidation";
import { validateApiKey, handleApiError, withRetry, getCachedValue, setCachedValue } from "@/utils/apiHelpers";
import { checkPremiumGate, getAccessContext } from "@/utils/premiumGate";
import { prisma } from "@/lib/prisma";

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

    const { section, questionCount = 5, topic, difficulty } = validationResult.data;

    const accessContext = await getAccessContext();
    const gate = await checkPremiumGate(accessContext);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: "Free tier limit reached. Upgrade to Premium for unlimited access." },
        { status: 402 }
      );
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
- Match real SAT question style: clear, specific, evidence-based`,
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
- Include questions that test both correctness and effectiveness`,
    };

    // Create completion with timeout
    const cacheKey = `generate-practice:${JSON.stringify({ section, questionCount, topic, difficulty })}`;
    const cachedResponse = getCachedValue<any>(cacheKey);

    const getModelPayload = async (requestedCount: number) => {
      const timeoutMs = requestedCount >= 20 ? 150000 : requestedCount >= 10 ? 100000 : 60000;
      const completion = await withRetry(
        () => getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
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
  "passage": "string (REQUIRED for reading section only - 3-6 sentences that all questions reference. Omit this field for math and writing sections.)",
  "questions": [
    {
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
- For READING sections: You MUST provide a "passage" field at the root level with 3-6 sentences that all questions reference. Each question's "question" field should ONLY contain the question text itself (e.g., "What is the main idea?" or "As used in line 3, 'elaborate' most nearly means..."). NEVER include the passage text in the question field - the passage is displayed separately above all questions.
- explanation_correct: Detailed, tutor-like explanation (3-5 sentences) that:
  * For MATH: Walk through each step clearly, explain WHY each step works, mention key formulas/concepts, and help the student understand the approach
  * For READING: Cite specific passage evidence, explain the reasoning process, connect to question type, and show how to find the answer
  * For WRITING: Name the grammar rule/concept clearly, explain why it's correct with examples, show the fix, and help them recognize similar patterns
  * Use encouraging language like "Here's how to approach this..." or "The key insight here is..."
- explanation_incorrect: Object with explanations for EACH wrong answer (A, B, C, D) explaining:
  * Why students might choose this answer (common mistake)
  * What misconception leads to this choice
  * How to avoid this mistake in the future
  * Only include the wrong ones
- strategy_tip: One helpful, encouraging tip (1-2 sentences) that feels like a tutor's advice for tackling similar questions. Be specific and actionable.

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
- For READING questions ONLY: You MUST provide a separate "passage" field in the root JSON object (not in each question). The passage should be 3-6 sentences that all questions in this set reference.
- question: 
  * MATH: The question text with any necessary context or word problem setup
  * READING: ONLY the question text itself (e.g., "What is the main idea of the passage?" or "As used in line 5, 'elaborate' most nearly means..."). DO NOT repeat the passage in the question field.
  * WRITING: A short passage with the revision target **bolded** inside the passage (example: "The committee **decide** to meet weekly.").
- options: array of exactly four answer choices as strings ["A text", "B text", "C text", "D text"].
  * For WRITING: Include "NO CHANGE" as an option when the underlined portion is already correct
- correctAnswer: one of "A", "B", "C", "D".
- explanation_correct: Detailed 2-4 sentence explanation with step-by-step reasoning.
- explanation_incorrect: Object with keys for wrong answers (e.g., {"B": "reason", "C": "reason", "D": "reason"}) - only include wrong ones.
- strategy_tip: One helpful tip for tackling similar questions.

DIFFICULTY ENFORCEMENT:
- Hard questions must not be simple plug-and-chug. Include a non-obvious setup, multiple steps, or conceptual traps.
- Easy questions must remain truly basic, not medium in disguise.
- If you cannot produce the requested difficulty, rework the question until it matches.

CRITICAL FOR READING: 
- Put the passage in a separate "passage" field at the root level of your JSON response
- Each question's "question" field should ONLY contain the question text, never the passage
- The passage will be displayed once above all questions, so never repeat it in individual questions

SAT AUTHENTICITY REQUIREMENTS:
- Questions must feel like real SAT questions, not generic test questions
- Use SAT-style wording: precise, academic, clear
- Include realistic distractors (wrong answers that test-takers might choose)
- Math: Include word problems with real-world contexts
- Reading: Passages should be excerpt-quality, not simplified
- Writing: Test practical editing skills, not obscure grammar rules
 - Reading questions must target a specific claim, inference, or detail (avoid generic main-idea prompts)

EXPLANATION QUALITY REQUIREMENTS (Tutor-like approach):
- MATH: Brief, SAT-style explanation (2-4 sentences). Focus on why the correct answer works and ONE common mistake. Use step-by-step only for Hard questions.
- READING: Guide them through finding the answer. Say "Let's look at the passage..." Quote specific evidence and explain HOW it supports the answer. Connect to question type and show the thinking process.
- WRITING: Teach the grammar rule clearly. Say "This is testing..." Explain the rule, show why the correct answer works, and help them recognize similar patterns. Make it feel like a mini-lesson.
- For wrong answers: Be empathetic. Say "Students often choose this because..." Explain the common mistake, what misconception leads to it, and how to avoid it. Help them learn from the mistake.
- Use **bold** sparingly to highlight key rule names or critical steps.

Make questions as similar as possible to actual SAT questions in style, wording, and format.
Do not output anything except the JSON.`,
        },
        {
          role: "user",
          content: `Generate ${requestedCount} SAT ${section} questions.${
            topic ? ` Focus on: ${topic}.` : ""
          }${difficulty && difficulty !== "Mixed" ? ` All questions must be ${difficulty.toUpperCase()} difficulty.` : ""}`,
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

    const transformQuestions = (rawQuestions: any[], passage?: string) => {
      return rawQuestions
        .map((q: any, index: number) => {
          // Clean and validate question
          let questionText = cleanMathNotation(cleanText(q.question || ""));
          
          // For reading questions, remove passage text from question if it's duplicated
          if (section === "reading" && passage && questionText) {
            // Check if question text contains passage (indicating duplication)
            const passageFirst50 = passage.substring(0, 50).trim();
            if (questionText.includes(passageFirst50)) {
              // If question contains passage text, try to remove it
              questionText = questionText.replace(passage, "").trim();
              // Also handle case where passage might be at the start followed by question
              const passageStart = passage.split(/[.!?]/)[0]?.trim();
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
            const bolded = applyBoldToMarkedTarget(questionText);
            questionText = bolded.text;
            if (!bolded.valid) {
              return null;
            }
          }
          
          // Clean options
          const cleanedOptions: Record<string, string> = {};
          if (Array.isArray(q.options)) {
            q.options.forEach((opt: string, i: number) => {
              const letter = String.fromCharCode(65 + i);
              cleanedOptions[letter] = cleanMathNotation(cleanText(truncateText(opt, 200)));
            });
          } else {
            // Fallback if already in object format
            cleanedOptions.A = cleanMathNotation(cleanText(truncateText(q.options.A || q.options[0] || "", 200)));
            cleanedOptions.B = cleanMathNotation(cleanText(truncateText(q.options.B || q.options[1] || "", 200)));
            cleanedOptions.C = cleanMathNotation(cleanText(truncateText(q.options.C || q.options[2] || "", 200)));
            cleanedOptions.D = cleanMathNotation(cleanText(truncateText(q.options.D || q.options[3] || "", 200)));
          }
          
          // Clean explanations (increased limits for better quality)
          let explanationCorrect = cleanText(truncateText(q.explanation_correct || q.explanation || "", 500));
          const explanationIncorrect: Record<string, string> = {};
          if (q.explanation_incorrect && typeof q.explanation_incorrect === "object") {
            Object.entries(q.explanation_incorrect).forEach(([letter, reason]) => {
              if (letter !== q.correctAnswer && reason) {
                explanationIncorrect[letter] = cleanText(truncateText(reason as string, 300));
              }
            });
          }
          
          let strategyTip = cleanText(truncateText(q.strategy_tip || "", 200));
          
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
        })
        .filter((q: any) => q !== null);
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
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const remaining = questionCount - transformedAll.length;
        if (remaining <= 0) break;
        const requestedCount = section === "reading" ? remaining : Math.min(10, remaining);
        const data = await getModelPayload(requestedCount);
        const localPassage = data.passage;
        if (section === "reading") {
          passage = localPassage;
          transformedAll = transformQuestions(data.questions, passage);
          break;
        }
        passage = passage || localPassage;
        transformedAll = transformedAll.concat(transformQuestions(data.questions, passage));
        const unique = removeDuplicates(transformedAll, (q: any) => q.question.toLowerCase().trim());
        if (unique.length >= questionCount) {
          transformedAll = unique;
          break;
        }
      }
    }
    
    // Remove duplicate questions based on question text
    const uniqueQuestions = removeDuplicates(transformedAll, (q: any) => q.question.toLowerCase().trim());

    const finalQuestions = uniqueQuestions.length >= questionCount
      ? uniqueQuestions.slice(0, questionCount)
      : transformedAll.slice(0, questionCount);

    if (finalQuestions.length < questionCount) {
      throw new Error("Failed to generate enough valid questions.");
    }

    if (section === "reading" && !passage) {
      throw new Error("Reading passage is required for reading questions.");
    }

    const normalizedQuestions = finalQuestions.map((q: any, idx: number) => ({ ...q, id: idx + 1 }));

    if (!cacheIsValid && normalizedQuestions.length === questionCount) {
      setCachedValue(cacheKey, { passage, questions: normalizedQuestions });
    }

    // Get userId or sessionId for saving
    const { user, sessionId } = accessContext;

    // Save to database
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

    const responseBody = cachedResponse
      ? { passage: cachedResponse.passage, questions: normalizedQuestions }
      : { passage, questions: normalizedQuestions };

    return NextResponse.json({
      id: practiceTest.id, // Return test ID so we can update score later
      section: section,
      passage: responseBody.passage,
      questions: responseBody.questions,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

