/**
 * Premium Feature Check Utilities
 * Manages free tier limits and premium access
 */

const FREE_TIER_USAGE_KEY = "free_tier_usage";
const FREE_TIER_USAGE_RESET_KEY = "free_tier_usage_reset";
const FREE_TIER_LIMIT = 1; // Free users get 1 use total across ALL features

export interface SubscriptionStatus {
  subscriptionStatus: string | null;
  hasSubscription: boolean;
}

/**
 * Check if user has premium access
 */
export async function checkPremiumAccess(): Promise<SubscriptionStatus | null> {
  try {
    const response = await fetch("/api/stripe/subscription-status");
    if (response.ok) {
      const data = await response.json();
      return {
        subscriptionStatus: data.subscriptionStatus,
        hasSubscription: data.hasSubscription,
      };
    }
  } catch (error) {
    console.error("Failed to fetch subscription status:", error);
  }
  return null;
}

/**
 * Get current free tier usage count
 */
export function getFreeUsageCount(): number {
  // Client-side only
  if (typeof window === "undefined") return 0;
  
  const stored = localStorage.getItem(FREE_TIER_USAGE_KEY);
  const count = stored ? parseInt(stored, 10) : 0;
  
  // Check if we need to reset (monthly reset)
  const now = new Date();
  const lastReset = localStorage.getItem(FREE_TIER_USAGE_RESET_KEY);
  
  if (!lastReset || new Date(lastReset).getMonth() !== now.getMonth()) {
    // Reset count
    localStorage.setItem(FREE_TIER_USAGE_KEY, "0");
    localStorage.setItem(FREE_TIER_USAGE_RESET_KEY, now.toISOString());
    return 0;
  }
  
  return count;
}

/**
 * Check if free user can use a feature
 */
export function canUseFreeFeature(subscriptionStatus: SubscriptionStatus | null): {
  allowed: boolean;
  usageCount: number;
  limit: number;
  message?: string;
} {
  // Premium users have unlimited access
  if (subscriptionStatus?.hasSubscription) {
    return { allowed: true, usageCount: 0, limit: -1 };
  }
  
  const usageCount = getFreeUsageCount();
  const allowed = usageCount < FREE_TIER_LIMIT;
  
  return {
    allowed,
    usageCount,
    limit: FREE_TIER_LIMIT,
    message: allowed
      ? `You have ${FREE_TIER_LIMIT - usageCount} free use remaining. Upgrade to Premium for unlimited access!`
      : `You've used your free feature access. Upgrade to Premium for unlimited access to all features!`,
  };
}

/**
 * Increment free tier usage count
 */
export function incrementFreeUsage(): void {
  // Client-side only
  if (typeof window === "undefined") return;
  
  const count = getFreeUsageCount();
  localStorage.setItem(FREE_TIER_USAGE_KEY, (count + 1).toString());
}

/**
 * Get upgrade message for feature limit
 */
export function getUpgradeMessage(featureName: string): string {
  return `Upgrade to Premium for unlimited ${featureName}. Free users get 1 use total across all features.`;
}

