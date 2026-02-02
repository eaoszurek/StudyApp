import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, getOrCreateAnonymousSession } from "@/lib/auth";
import { handleApiError } from "@/utils/apiHelpers";

/**
 * GET - Fetch user's practice tests
 */
export async function GET() {
  try {
    const user = await getServerSession();
    let sessionId: string | undefined;

    if (!user) {
      sessionId = await getOrCreateAnonymousSession();
    }

    // Fetch practice tests
    const practiceTests = await prisma.practiceTest.findMany({
      where: user
        ? { userId: user.id }
        : { sessionId },
      orderBy: { createdAt: "desc" },
    });

    // Parse JSON questions for each test
    const testsWithParsedQuestions = practiceTests.map((test) => ({
      id: test.id,
      section: test.section,
      topic: test.topic,
      difficulty: test.difficulty,
      questions: JSON.parse(test.questions),
      passage: test.passage,
      score: test.score,
      createdAt: test.createdAt,
    }));

    return NextResponse.json({ practiceTests: testsWithParsedQuestions });
  } catch (error: any) {
    return handleApiError(error);
  }
}

