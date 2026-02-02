/**
 * Stripe Client Initialization
 * Server-side Stripe SDK configuration
 */

import Stripe from "stripe";

// Initialize Stripe only if the secret key is available
// This allows the build to succeed even if Stripe env vars are not set
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePriceIdMonthly = process.env.STRIPE_PRICE_ID_MONTHLY;

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    })
  : null;

// Price ID from environment - must be set in .env
export const STRIPE_PRICE_ID_MONTHLY = stripePriceIdMonthly || "";

// Helper to ensure Stripe is configured before use
export function ensureStripeConfigured(): void {
  if (!stripe || !STRIPE_PRICE_ID_MONTHLY) {
    throw new Error("Stripe is not properly configured. Please set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_MONTHLY environment variables.");
  }
}

