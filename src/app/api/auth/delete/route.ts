import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, deleteSession } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { handleApiError } from "@/utils/apiHelpers";

/**
 * DELETE - Delete user account and all associated data
 */
export async function DELETE() {
  try {
    const user = await getServerSession();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to delete your account." },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const cancellationError = await cancelStripeSubscriptions(dbUser);
    if (cancellationError) return cancellationError;

    // Delete user (cascade will handle related data)
    // This will automatically delete:
    // - Sessions
    // - Accounts
    // - FlashcardSets (removed)
    // - PracticeTests
    // - StudyPlans
    // - MicroLessons
    await prisma.user.delete({
      where: { id: dbUser.id },
    });

    // Clear session cookie
    await deleteSession();

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

type UserForDeletion = {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING" | null;
};

const TERMINAL_STRIPE_SUBSCRIPTION_STATUSES = new Set(["canceled", "incomplete_expired"]);

async function cancelStripeSubscriptions(user: UserForDeletion): Promise<NextResponse | null> {
  const hasKnownPaidSubscription =
    Boolean(user.stripeSubscriptionId) ||
    (Boolean(user.stripeCustomerId) &&
      (user.subscriptionStatus === "ACTIVE" ||
        user.subscriptionStatus === "TRIALING" ||
        user.subscriptionStatus === "PAST_DUE"));

  if (!hasKnownPaidSubscription) {
    return null;
  }

  if (!stripe) {
    return NextResponse.json(
      { error: "Unable to delete account while subscription cancellation is unavailable. Please contact support." },
      { status: 500 }
    );
  }

  const subscriptionsToCancel = new Set<string>();

  if (user.stripeSubscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      if (!TERMINAL_STRIPE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
        subscriptionsToCancel.add(subscription.id);
      }
    } catch (error: unknown) {
      if ((error as { code?: string })?.code !== "resource_missing") {
        throw error;
      }
    }
  }

  if (user.stripeCustomerId) {
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 100,
    });

    for (const subscription of subscriptions.data) {
      if (!TERMINAL_STRIPE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
        subscriptionsToCancel.add(subscription.id);
      }
    }
  }

  for (const subscriptionId of subscriptionsToCancel) {
    await stripe.subscriptions.cancel(subscriptionId);
  }

  return null;
}

