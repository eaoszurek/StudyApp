import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, getOrCreateAnonymousSession } from "@/lib/auth";
import { handleApiError } from "@/utils/apiHelpers";

/**
 * GET - Fetch user's score history
 */
export async function GET() {
  try {
    const user = await getServerSession();
    let sessionId: string | undefined;

    if (!user) {
      sessionId = await getOrCreateAnonymousSession();
    }

    // Fetch practice tests with scores
    const practiceTests = await prisma.practiceTest.findMany({
      where: user
        ? { userId: user.id, completedAt: { not: null } } // Only completed tests
        : { sessionId, completedAt: { not: null } },
      select: {
        id: true,
        section: true,
        scaledScore: true,
        rawScore: true,
        maxRawScore: true,
        timeSpent: true,
        difficulty: true,
        topic: true,
        completedAt: true,
        createdAt: true,
      },
      orderBy: { completedAt: "desc" },
    });

    // Convert to score history format
    const sessions = practiceTests
      .filter(test => test.scaledScore !== null && test.rawScore !== null && test.maxRawScore !== null)
      .map(test => ({
        id: test.id,
        date: test.completedAt?.toISOString() || test.createdAt.toISOString(),
        section: test.section as "math" | "reading" | "writing",
        score: {
          scaled: test.scaledScore!,
          raw: test.rawScore!,
          maxRaw: test.maxRawScore!,
        },
        correct: test.rawScore!,
        total: test.maxRawScore!,
        timeSpent: test.timeSpent || undefined,
        difficulty: test.difficulty as "Easy" | "Medium" | "Hard" | "Mixed" | undefined,
        topic: test.topic || undefined,
      }));

    const MIN_ESTIMATE_QUESTIONS = 15;

    // Calculate stats (ignore very short quizzes)
    const totalScores = sessions
      .filter(s => s.total >= MIN_ESTIMATE_QUESTIONS)
      .map(s => s.score.scaled * 2) // Estimate total SAT score (section * 2)
      .filter(s => s > 0);

    const bestScore = totalScores.length > 0 ? Math.max(...totalScores) : 0;
    const averageScore = totalScores.length > 0
      ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length)
      : 0;

    return NextResponse.json({
      sessions,
      bestScore,
      averageScore,
      lastUpdated: sessions.length > 0 ? sessions[0].date : new Date().toISOString(),
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

