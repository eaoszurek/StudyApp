import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { handleApiError } from "@/utils/apiHelpers";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET - Export all user data (GDPR data portability)
 */
export async function GET() {
  try {
    const user = await getServerSession();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to export your data." },
        { status: 401 }
      );
    }

    const rl = rateLimit(`export:${user.id}`, { limit: 3, windowSeconds: 3600 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Export limit reached. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const [userData, flashcardSets, practiceTests, studyPlans, microLessons] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true,
            subscriptionStatus: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.flashcardSet.findMany({ where: { userId: user.id }, take: 1000 }),
        prisma.practiceTest.findMany({ where: { userId: user.id }, take: 1000 }),
        prisma.studyPlan.findMany({ where: { userId: user.id }, take: 1000 }),
        prisma.microLesson.findMany({ where: { userId: user.id }, take: 1000 }),
      ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      account: userData,
      flashcardSets,
      practiceTests,
      studyPlans,
      microLessons,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="peakprep-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
