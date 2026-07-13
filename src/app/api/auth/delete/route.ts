import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, deleteSession } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { handleApiError } from "@/utils/apiHelpers";

function isLocallyBillable(status: string | null | undefined): boolean {
  return status === "ACTIVE" || status === "TRIALING" || status === "PAST_DUE";
}

function isStripeSubscriptionBillable(status: string): boolean {
  return status === "active" || status === "trialing" || status === "past_due" || status === "unpaid";
}

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

    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasKnownBillableSubscription =
      isLocallyBillable(account.subscriptionStatus) ||
      Boolean(account.stripeSubscriptionId && account.subscriptionStatus !== "CANCELLED");

    if (hasKnownBillableSubscription && !stripe) {
      return NextResponse.json(
        { error: "Cancel your subscription before deleting your account." },
        { status: 409 }
      );
    }

    if (stripe && (account.stripeSubscriptionId || account.stripeCustomerId)) {
      const subscriptionsToCancel = new Set<string>();

      if (account.stripeSubscriptionId && account.subscriptionStatus !== "CANCELLED") {
        subscriptionsToCancel.add(account.stripeSubscriptionId);
      }

      if (account.stripeCustomerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: account.stripeCustomerId,
          status: "all",
          limit: 10,
        });

        for (const subscription of subscriptions.data) {
          if (isStripeSubscriptionBillable(subscription.status)) {
            subscriptionsToCancel.add(subscription.id);
          }
        }
      }

      for (const subscriptionId of subscriptionsToCancel) {
        try {
          await stripe.subscriptions.cancel(subscriptionId);
        } catch (error: any) {
          if (error?.code === "resource_missing") {
            continue;
          }
          console.error("Failed to cancel Stripe subscription before account deletion:", error);
          return NextResponse.json(
            { error: "Cancel your subscription before deleting your account." },
            { status: 409 }
          );
        }
      }
    }

    // Delete user (cascade will handle related data)
    // This will automatically delete:
    // - Sessions
    // - Accounts
    // - FlashcardSets (removed)
    // - PracticeTests
    // - StudyPlans
    // - MicroLessons
    await prisma.user.delete({
      where: { id: user.id },
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

