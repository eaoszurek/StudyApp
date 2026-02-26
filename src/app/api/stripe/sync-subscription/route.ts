/**
 * Manually Sync Subscription Status from Stripe
 * POST /api/stripe/sync-subscription
 * Forces a sync of subscription status from Stripe
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

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If user has a Stripe customer ID, always check subscriptions and choose best current state.
    if (user.stripeCustomerId) {
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
            success: true,
            subscriptionStatus: newStatus,
            hasSubscription: newStatus === "ACTIVE" || newStatus === "TRIALING",
            message: "Subscription synced successfully",
          });
        }
      } catch (error: any) {
        console.error("Error fetching subscriptions:", error);
      }
    }

    // If user has a subscription ID, sync it
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId
        );
        const newStatus = mapSubscriptionStatus(subscription.status);

        await prisma.user.update({
          where: { id: session.id },
          data: {
            subscriptionStatus: newStatus || "CANCELLED",
          },
        });

        return NextResponse.json({
          success: true,
          subscriptionStatus: newStatus,
          hasSubscription: newStatus === "ACTIVE" || newStatus === "TRIALING",
          message: "Subscription status updated",
        });
      } catch (error: any) {
        // Subscription might not exist anymore
        if (error.code === "resource_missing") {
          await prisma.user.update({
            where: { id: session.id },
            data: {
              subscriptionStatus: "CANCELLED",
              stripeSubscriptionId: null,
            },
          });

          return NextResponse.json({
            success: true,
            subscriptionStatus: "CANCELLED",
            hasSubscription: false,
            message: "Subscription not found in Stripe",
          });
        }
        throw error;
      }
    }

    // Check by customer ID and email
    if (user.stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(user.stripeCustomerId);
        if (customer.deleted) {
          await prisma.user.update({
            where: { id: session.id },
            data: {
              subscriptionStatus: "CANCELLED",
              stripeCustomerId: null,
              stripeSubscriptionId: null,
            },
          });

          return NextResponse.json({
            success: true,
            subscriptionStatus: "CANCELLED",
            hasSubscription: false,
            message: "Customer deleted in Stripe",
          });
        }
      } catch (error) {
        console.error("Error fetching customer:", error);
      }
    }

    return NextResponse.json({
      success: true,
      subscriptionStatus: user.subscriptionStatus,
      hasSubscription: user.subscriptionStatus === "ACTIVE" || user.subscriptionStatus === "TRIALING",
      message: "No subscription found",
    });
  } catch (error: unknown) {
    console.error("Error syncing subscription:", error);
    return NextResponse.json(
      { error: "Failed to sync subscription" },
      { status: 500 }
    );
  }
}

