import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { z } from "zod";
import { validateFlashcardFormat, cleanMathNotation, cleanText, removeDuplicates, truncateText, ensureFlashcardBackFormat, ensureSingleSkill, ensureBoldEmphasis } from "@/utils/aiValidation";
import { validateApiKey, handleApiError, withRetry, getCachedValue, setCachedValue } from "@/utils/apiHelpers";
import { checkPremiumGate, getAccessContext } from "@/utils/premiumGate";
import { prisma } from "@/lib/prisma";

// Zod schema for input validation
const FlashcardRequestSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(200, "Topic is too long").trim(),
});

export async function POST(req: Request) {
  try {
    // Validate API key
    const apiKeyError = validateApiKey();
    if (apiKeyError) return apiKeyError;

    // Parse and validate request body
    const body = await req.json();
    const validationResult = FlashcardRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { topic } = validationResult.data;

    const accessContext = await getAccessContext();
    const gate = await checkPremiumGate(accessContext);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: "Free tier limit reached. Upgrade to Premium for unlimited access." },
        { status: 402 }
      );
    }

    // Create completion with timeout
    const cacheKey = `generate-flashcards:${JSON.stringify({ topic })}`;
    const cachedResponse = getCachedValue<any>(cacheKey);
    const completion = cachedResponse
      ? null
      : await withRetry(
      () => getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert SAT tutor creating flashcards to help students master key concepts. Your explanations should be clear, educational, and supportive - like a tutor explaining concepts to a student. Make the definitions helpful and memorable, not just technical.

CRITICAL FORMAT RULES:
- Each flashcard must follow this EXACT format: TERM — SAT tests: ... | How it appears: ... | Tip: ...
- "front" field = SAT skill or rule name (1-4 words)
- "back" field = "TERM — SAT tests: ... | How it appears: ... | Tip: ..." followed by optional examples
- TERM must be 1-4 words
- SAT tests: 8-20 words describing what the SAT is testing
- How it appears: 8-20 words describing how it shows up on the SAT
- Tip: 6-16 words with a quick recognition tip or mini-example
- Use an em dash (—) to separate term and back content
- After the definition, add 1-2 examples as a bulleted list if helpful (use • for bullets)
- Examples should be concise, SAT-appropriate, and illustrate the concept clearly
- NO ^ symbol for exponents - use actual superscript characters (e.g., x², x³, not x^2)
- NO decorative symbols except bullets for examples
- Keep explanations concise and test-oriented (avoid lecture-style)
- Use **bold** sparingly inside SAT tests/How it appears/Tip to emphasize 1-2 key terms

EXAMPLES OF CORRECT FORMAT:
- front: "Quadratic Formula"
  back: "Quadratic Formula — SAT tests: solving ax² + bx + c = 0 efficiently | How it appears: choose correct roots or steps | Tip: **Identify** a, b, c before plugging in
• x² + 5x + 6 = 0 → x = -2 or x = -3
• 2x² - 8x + 6 = 0 → x = 1 or x = 3"

- front: "Parallel Lines"
  back: "Parallel Lines — SAT tests: **equal slopes** and non-intersection | How it appears: compare equations or graphs | Tip: match slopes first
• y = 2x + 3 and y = 2x - 5 are parallel
• Both have slope m = 2"

- front: "Subject-Verb Agreement"
  back: "Subject-Verb Agreement — SAT tests: matching verb number to subject | How it appears: distractor phrases between subject and verb | Tip: find the **true subject**
• The team wins (singular subject, singular verb)
• The teams win (plural subject, plural verb)"

OUTPUT FORMAT:
{
  "flashcards": [
    {
      "front": "TERM (1-4 words)",
      "back": "TERM — definition (10-25 words, clear and educational)\n• Example 1 (if helpful, concise)\n• Example 2 (if helpful, concise)",
      "difficulty": "Easy" | "Medium" | "Hard",
      "tag": "Vocab" | "Grammar" | "Reading" | "Math No Calculator" | "Math Calculator" | "Functions" | "Statistics" | "Rhetoric"
    }
  ],
  "reviewIntervals": {
    "got-it": "3 days",
    "almost": "1 day",
    "no-idea": "again-today"
  }
}

Generate 10-15 flashcards. Return ONLY valid JSON, no markdown lists or headings, no commentary.

FORMATTING RULES:
- Keep all text clean and professional
- No unbroken blobs of text
- Use line breaks (\n) appropriately for examples
- Ensure definitions are clear and don't repeat the term unnecessarily
- Examples should be concise and SAT-appropriate`,
        },
        {
          role: "user",
          content: `Create SAT flashcards about: ${topic}. Generate 10-15 flashcards following the format: TERM — definition (8-20 words). Add 1-2 bulleted examples (•) under the definition if helpful. Terms must be 1-4 words. Use actual superscripts for exponents (x² not x^2).`,
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

    if (!Array.isArray(data.flashcards)) {
      throw new Error("Invalid response format from model.");
    }

    // Validate and clean flashcards
    const validatedFlashcards = data.flashcards
      .map((card: any) => {
        // Clean math notation
        if (card.front) card.front = cleanMathNotation(cleanText(card.front));
        if (card.back) card.back = cleanMathNotation(cleanText(card.back));
        
        // Truncate if too long (increased limits to preserve examples)
        if (card.front) card.front = truncateText(card.front, 50);
        if (card.back) card.back = truncateText(card.back, 350);
        
        const enforced = ensureFlashcardBackFormat(card);
        card = enforced.card;
        card.back = ensureBoldEmphasis(card.back, card.front);
        card.skillCategory = ensureSingleSkill(card.skillCategory || card.front, card.front);
        if (!card.section) {
          const tag = typeof card.tag === "string" ? card.tag.toLowerCase() : "";
          card.section = tag.includes("math") ? "Math" : "Reading & Writing";
        }
        // Validate format
        const validation = validateFlashcardFormat(card);
        if (!validation.valid) {
          console.warn("Invalid flashcard format:", validation.errors, card);
          return null; // Filter out invalid cards
        }
        
        return card;
      })
      .filter((card: any) => card !== null); // Remove invalid cards

    // Remove duplicates based on front text
    const uniqueFlashcards = removeDuplicates(validatedFlashcards, (card: any) => card.front.toLowerCase().trim());

    // Ensure we have at least 5 cards
    if (uniqueFlashcards.length < 5) {
      throw new Error("Generated too few valid flashcards. Please try again.");
    }

    // Get userId or sessionId for saving
    const { user, sessionId } = accessContext;

    // Save to database
    await prisma.flashcardSet.create({
      data: {
        userId: user?.id,
        sessionId,
        title: topic,
        topic: topic,
        cards: JSON.stringify(uniqueFlashcards),
      },
    });

    if (!cachedResponse) {
      setCachedValue(cacheKey, { flashcards: uniqueFlashcards, reviewIntervals: data.reviewIntervals });
    }

    return NextResponse.json({
      ...(cachedResponse || data),
      flashcards: uniqueFlashcards,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

