"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession, getOrCreateAnonymousSession, SessionUser } from "@/lib/auth";

const FREE_TIER_LIMIT = 1;

export interface AccessContext {
  user: SessionUser | null;
  sessionId?: string;
}

export interface PremiumGateResult {
  allowed: boolean;
  hasSubscription: boolean;
  usageCount: number;
  limit: number;
}

export async function getAccessContext(): Promise<AccessContext> {
  const user = await getServerSession();

  if (user) {
    return { user };
  }

  const sessionId = await getOrCreateAnonymousSession();
  return { user: null, sessionId };
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
  if (hasActiveSubscription(context.user)) {
    return {
      allowed: true,
      hasSubscription: true,
      usageCount: 0,
      limit: FREE_TIER_LIMIT,
    };
  }

  const monthStart = getMonthStart();
  const whereBase = context.user?.id
    ? { userId: context.user.id }
    : { sessionId: context.sessionId };

  if (!("userId" in whereBase) && !whereBase.sessionId) {
    return {
      allowed: false,
      hasSubscription: false,
      usageCount: FREE_TIER_LIMIT,
      limit: FREE_TIER_LIMIT,
    };
  }

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
