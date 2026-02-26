/**
 * Create Stripe Checkout Session
 * POST /api/stripe/create-checkout
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { stripe, STRIPE_PRICE_ID_MONTHLY } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe || !STRIPE_PRICE_ID_MONTHLY) {
      return NextResponse.json(
        { error: "Stripe is not properly configured. Please set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_MONTHLY environment variables." },
        { status: 500 }
      );
    }

    // Get authenticated user
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { priceType } = body;

    if (priceType && priceType !== "monthly") {
      return NextResponse.json(
        { error: "Invalid price type" },
        { status: 400 }
      );
    }

    const finalPriceId = STRIPE_PRICE_ID_MONTHLY;

    if (!finalPriceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId: string;
    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (user?.stripeCustomerId) {
      customerId = user.stripeCustomerId;
    } else {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: session.email,
        name: session.name || undefined,
        metadata: {
          userId: session.id,
        },
      });

      customerId = customer.id;

      // Save customer ID to database
      await prisma.user.update({
        where: { id: session.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard?canceled=true`,
      metadata: {
        userId: session.id,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: unknown) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}

