import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { handleApiError } from "@/utils/apiHelpers";
import { z } from "zod";

const ScoreUpdateSchema = z.object({
  scaledScore: z.number().int().min(200).max(800),
  rawScore: z.number().int().min(0),
  maxRawScore: z.number().int().min(1),
  timeSpent: z.number().int().min(0).optional(),
  answers: z.array(z.enum(["A", "B", "C", "D"]).nullable()),
});

type SkillWeaknessEntry = { attempts: number; misses: number };
type SkillWeaknessesMap = Record<string, SkillWeaknessEntry>;

/**
 * PATCH - Update practice test score (requires sign-in)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const body = await req.json();
    const validationResult = ScoreUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { scaledScore, rawScore, maxRawScore, timeSpent, answers } = validationResult.data;

    if (rawScore > maxRawScore) {
      return NextResponse.json(
        { error: "rawScore cannot be greater than maxRawScore" },
        { status: 400 }
      );
    }

    const test = await prisma.practiceTest.findFirst({
      where: { id, userId: user.id },
    });

    if (!test) {
      return NextResponse.json(
        { error: "Practice test not found" },
        { status: 404 }
      );
    }

    // Update the test with score
    await prisma.practiceTest.update({
      where: { id },
      data: {
        scaledScore,
        rawScore,
        maxRawScore,
        timeSpent,
        completedAt: new Date(),
        score: scaledScore, // Keep legacy field for backwards compatibility
      },
    });

    // Aggregate per-skill attempt/miss counts across sessions
    try {
      const parsedQuestions: Array<{ skillCategory?: string; skillFocus?: string; correctAnswer?: string }> =
        JSON.parse(test.questions || "[]");
      if (Array.isArray(parsedQuestions) && answers.length > 0) {
        const currentUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { skillWeaknesses: true },
        });
        const existing =
          currentUser?.skillWeaknesses &&
          typeof currentUser.skillWeaknesses === "object" &&
          !Array.isArray(currentUser.skillWeaknesses)
            ? (currentUser.skillWeaknesses as SkillWeaknessesMap)
            : {};

        const updated: SkillWeaknessesMap = { ...existing };

        parsedQuestions.forEach((q, idx) => {
          const skill = String(q.skillCategory || q.skillFocus || "").trim();
          if (!skill) return;
          const userAnswer = answers[idx] ?? null;
          if (userAnswer === null) return;

          const entry = updated[skill] ?? { attempts: 0, misses: 0 };
          entry.attempts += 1;
          if (userAnswer !== q.correctAnswer) {
            entry.misses += 1;
          }
          updated[skill] = entry;
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { skillWeaknesses: updated },
        });
      }
    } catch (weaknessError) {
      console.warn("Failed to update skillWeaknesses:", weaknessError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}

