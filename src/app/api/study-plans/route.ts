import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { handleApiError } from "@/utils/apiHelpers";

/**
 * GET - Fetch user's study plans (requires sign-in)
 */
export async function GET() {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const studyPlans = await prisma.studyPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Parse JSON plan for each study plan
    const plansWithParsedData = studyPlans.map((plan) => {
      let parsedPlan;
      try {
        parsedPlan = JSON.parse(plan.plan);
      } catch {
        parsedPlan = {};
      }
      return {
        id: plan.id,
        plan: parsedPlan,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      };
    });

    return NextResponse.json({ studyPlans: plansWithParsedData });
  } catch (error: any) {
    return handleApiError(error);
  }
}

