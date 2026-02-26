import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, getOrCreateAnonymousSession } from "@/lib/auth";
import { handleApiError } from "@/utils/apiHelpers";

/**
 * GET - Fetch user's flashcard sets
 */
export async function GET() {
  try {
    const user = await getServerSession();
    let sessionId: string | undefined;

    if (!user) {
      sessionId = await getOrCreateAnonymousSession();
    }

    // Fetch flashcard sets
    const flashcardSets = await prisma.flashcardSet.findMany({
      where: user
        ? { userId: user.id }
        : { sessionId },
      orderBy: { createdAt: "desc" },
    });

    // Parse JSON cards for each set
    const setsWithParsedCards = flashcardSets.map((set) => {
      let cards;
      try {
        cards = JSON.parse(set.cards);
      } catch {
        cards = [];
      }
      return {
        id: set.id,
        title: set.title,
        topic: set.topic,
        cards,
        createdAt: set.createdAt,
        updatedAt: set.updatedAt,
      };
    });

    return NextResponse.json({ flashcardSets: setsWithParsedCards });
  } catch (error: any) {
    return handleApiError(error);
  }
}

