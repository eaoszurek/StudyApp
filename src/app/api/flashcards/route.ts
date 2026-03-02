import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { handleApiError } from "@/utils/apiHelpers";

/**
 * GET - Fetch user's flashcard sets (requires sign-in)
 */
export async function GET() {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const flashcardSets = await prisma.flashcardSet.findMany({
      where: { userId: user.id },
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

