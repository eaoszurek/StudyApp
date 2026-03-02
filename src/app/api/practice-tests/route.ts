import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { handleApiError } from "@/utils/apiHelpers";

/**
 * GET - Fetch user's practice tests (requires sign-in)
 */
export async function GET() {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const practiceTests = await prisma.practiceTest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Parse JSON questions for each test
    const testsWithParsedQuestions = practiceTests.map((test) => {
      let questions;
      try {
        questions = JSON.parse(test.questions);
      } catch {
        questions = [];
      }
      return {
        id: test.id,
        section: test.section,
        topic: test.topic,
        difficulty: test.difficulty,
        questions,
        passage: test.passage,
        score: test.score,
        createdAt: test.createdAt,
      };
    });

    return NextResponse.json({ practiceTests: testsWithParsedQuestions });
  } catch (error: any) {
    return handleApiError(error);
  }
}

