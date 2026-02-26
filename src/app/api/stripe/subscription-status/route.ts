/**
 * Get User Subscription Status
 * GET /api/stripe/subscription-status
 * Syncs with Stripe if needed to ensure accurate status
 */

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

function mapSubscriptionStatus(
  stripeStatus: string
): "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING" | null {
  switch (stripeStatus) {
    case "active":
      return "ACTIVE";
    case "canceled":
    case "unpaid":
      return "CANCELLED";
    case "past_due":
      return "PAST_DUE";
    case "trialing":
      return "TRIALING";
    default:
      return null;
  }
}

function pickBestSubscription(subscriptions: Stripe.Subscription[]): Stripe.Subscription | null {
  if (!subscriptions.length) return null;
  const priority = ["active", "trialing", "past_due", "unpaid", "canceled"] as const;
  for (const status of priority) {
    const match = subscriptions.find((sub) => sub.status === status);
    if (match) return match;
  }
  return subscriptions[0] ?? null;
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If we have a Stripe customer, always inspect customer subscriptions and pick the best one.
    if (user.stripeCustomerId && stripe) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: "all",
          limit: 10,
        });

        const subscription = pickBestSubscription(subscriptions.data);
        if (subscription) {
          const newStatus = mapSubscriptionStatus(subscription.status);
          
          await prisma.user.update({
            where: { id: session.id },
            data: {
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: newStatus || "CANCELLED",
            },
          });

          return NextResponse.json({
            subscriptionStatus: newStatus,
            hasSubscription: newStatus === "ACTIVE" || newStatus === "TRIALING",
<<<<<<< Updated upstream
=======
            stripeCustomerId: user.stripeCustomerId,
            stripeSubscriptionId: newStatus ? subscription.id : null,
            synced: true,
>>>>>>> Stashed changes
          });
        }
      } catch (error) {
        console.error("Error fetching subscriptions:", error);
      }
    }

    // If user has a Stripe subscription ID, sync with Stripe to ensure accuracy
    if (user.stripeSubscriptionId && stripe) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const currentStatus = mapSubscriptionStatus(stripeSubscription.status);
        // If stored subscription is inactive, try finding a better one on the same customer.
        if (
          user.stripeCustomerId &&
          currentStatus &&
          currentStatus !== "ACTIVE" &&
          currentStatus !== "TRIALING"
        ) {
          const subscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: "all",
            limit: 10,
          });
          const best = pickBestSubscription(subscriptions.data);
          if (best && best.id !== user.stripeSubscriptionId) {
            const bestStatus = mapSubscriptionStatus(best.status);
            if (bestStatus) {
              await prisma.user.update({
                where: { id: session.id },
                data: {
                  stripeSubscriptionId: best.id,
                  subscriptionStatus: bestStatus,
                },
              });
              return NextResponse.json({
                subscriptionStatus: bestStatus,
                hasSubscription: bestStatus === "ACTIVE" || bestStatus === "TRIALING",
                stripeCustomerId: user.stripeCustomerId,
                stripeSubscriptionId: best.id,
                synced: true,
              });
            }
          }
        }
        
        // Always update database with latest status from Stripe
        if (currentStatus) {
          await prisma.user.update({
            where: { id: session.id },
            data: { subscriptionStatus: currentStatus },
          });
          
          return NextResponse.json({
            subscriptionStatus: currentStatus,
            hasSubscription: currentStatus === "ACTIVE" || currentStatus === "TRIALING",
          });
        }
      } catch (error) {
        // If subscription doesn't exist in Stripe, mark as cancelled
        console.error("Error syncing subscription with Stripe:", error);
        if ((error as any).code === "resource_missing") {
          await prisma.user.update({
            where: { id: session.id },
            data: { 
              subscriptionStatus: "CANCELLED",
              stripeSubscriptionId: null,
            },
          });
          return NextResponse.json({
            subscriptionStatus: "CANCELLED",
            hasSubscription: false,
          });
        }
      }
    }

    return NextResponse.json({
      subscriptionStatus: user.subscriptionStatus,
      hasSubscription: user.subscriptionStatus === "ACTIVE" || user.subscriptionStatus === "TRIALING",
    });
  } catch (error: unknown) {
    console.error("Error getting subscription status:", error);
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}

