import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, getOrCreateAnonymousSession } from "@/lib/auth";
import { handleApiError } from "@/utils/apiHelpers";

/**
 * GET - Fetch user's study plans
 */
export async function GET() {
  try {
    const user = await getServerSession();
    let sessionId: string | undefined;

    if (!user) {
      sessionId = await getOrCreateAnonymousSession();
    }

    // Fetch study plans
    const studyPlans = await prisma.studyPlan.findMany({
      where: user
        ? { userId: user.id }
        : { sessionId },
      orderBy: { createdAt: "desc" },
    });

    // Parse JSON plan for each study plan
    const plansWithParsedData = studyPlans.map((plan) => ({
      id: plan.id,
      plan: JSON.parse(plan.plan),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }));

    return NextResponse.json({ studyPlans: plansWithParsedData });
  } catch (error: any) {
    return handleApiError(error);
  }
}

