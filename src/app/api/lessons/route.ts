import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, getOrCreateAnonymousSession } from "@/lib/auth";
import { handleApiError } from "@/utils/apiHelpers";

/**
 * GET - Fetch user's micro lessons
 */
export async function GET() {
  try {
    const user = await getServerSession();
    let sessionId: string | undefined;

    if (!user) {
      sessionId = await getOrCreateAnonymousSession();
    }

    // Fetch micro lessons
    const microLessons = await prisma.microLesson.findMany({
      where: user
        ? { userId: user.id }
        : { sessionId },
      orderBy: { createdAt: "desc" },
    });

    // Parse JSON lesson for each micro lesson
    const lessonsWithParsedData = microLessons.map((lesson) => {
      let parsedLesson;
      try {
        parsedLesson = JSON.parse(lesson.lesson);
      } catch {
        parsedLesson = {};
      }
      return {
        id: lesson.id,
        topic: lesson.topic,
        lesson: parsedLesson,
        createdAt: lesson.createdAt,
      };
    });

    return NextResponse.json({ microLessons: lessonsWithParsedData });
  } catch (error: any) {
    return handleApiError(error);
  }
}

