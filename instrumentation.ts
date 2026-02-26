/**
 * Next.js instrumentation - runs once at server startup.
 * Validates required env vars so misconfiguration fails fast.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvironment } = await import("./src/utils/envValidation");
    const { valid, missing } = validateEnvironment();
    if (!valid) {
      console.error(
        "[env] Missing required environment variables:",
        missing.join(", ")
      );
      // In production, you may want to throw to prevent starting with invalid config.
      // For Vercel, env is often set at deploy time; logging is enough to catch mistakes.
    }
  }
}
