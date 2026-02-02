/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 */

export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = [
    "OPENAI_API_KEY",
    "DATABASE_URL",
    // Stripe keys are required for payment features
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_ID_MONTHLY",
  ];
  const missing: string[] = [];

  required.forEach((key) => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Check if we're in a server environment
 */
export function isServer(): boolean {
  return typeof window === "undefined";
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, fallback?: string): string {
  if (isServer()) {
    return process.env[key] || fallback || "";
  }
  // Client-side: environment variables prefixed with NEXT_PUBLIC_ are available
  return (process.env[`NEXT_PUBLIC_${key}`] || process.env[key] || fallback || "") as string;
}

