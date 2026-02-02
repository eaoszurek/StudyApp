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
});

/**
 * PATCH - Update practice test score
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getServerSession();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validationResult = ScoreUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { scaledScore, rawScore, maxRawScore, timeSpent } = validationResult.data;

    // Verify the test belongs to the user
    const test = await prisma.practiceTest.findFirst({
      where: {
        id,
        userId: user.id,
      },
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}

