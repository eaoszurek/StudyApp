"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession, SessionUser } from "@/lib/auth";

const FREE_TIER_LIMIT = 1;

export interface AccessContext {
  user: SessionUser | null;
}

export interface PremiumGateResult {
  allowed: boolean;
  hasSubscription: boolean;
  usageCount: number;
  limit: number;
}

export async function getAccessContext(): Promise<AccessContext> {
  const user = await getServerSession();
  return { user };
}

function hasActiveSubscription(user: SessionUser | null): boolean {
  return user?.subscriptionStatus === "ACTIVE" || user?.subscriptionStatus === "TRIALING";
}

function getMonthStart(): Date {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return monthStart;
}

export async function checkPremiumGate(context: AccessContext): Promise<PremiumGateResult> {
  // Dev-only QA bypass for local smoke tests. Never enable in production.
  if (process.env.NODE_ENV !== "production" && process.env.BYPASS_PREMIUM_GATE === "true") {
    return {
      allowed: true,
      hasSubscription: true,
      usageCount: 0,
      limit: FREE_TIER_LIMIT,
    };
  }

  if (hasActiveSubscription(context.user)) {
    return {
      allowed: true,
      hasSubscription: true,
      usageCount: 0,
      limit: FREE_TIER_LIMIT,
    };
  }

  if (!context.user?.id) {
    return {
      allowed: false,
      hasSubscription: false,
      usageCount: FREE_TIER_LIMIT,
      limit: FREE_TIER_LIMIT,
    };
  }

  const monthStart = getMonthStart();
  const whereBase = { userId: context.user.id };

  const [flashcardCount, practiceCount, studyPlanCount, lessonCount] = await Promise.all([
    prisma.flashcardSet.count({
      where: { ...whereBase, createdAt: { gte: monthStart } },
    }),
    prisma.practiceTest.count({
      where: { ...whereBase, createdAt: { gte: monthStart } },
    }),
    prisma.studyPlan.count({
      where: { ...whereBase, createdAt: { gte: monthStart } },
    }),
    prisma.microLesson.count({
      where: { ...whereBase, createdAt: { gte: monthStart } },
    }),
  ]);

  const usageCount = flashcardCount + practiceCount + studyPlanCount + lessonCount;
  const allowed = usageCount < FREE_TIER_LIMIT;

  return {
    allowed,
    hasSubscription: false,
    usageCount,
    limit: FREE_TIER_LIMIT,
  };
}
