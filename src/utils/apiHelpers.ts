/**
 * API Route Helpers
 * Shared validation, error handling, and timeout utilities
 */

import { NextResponse } from "next/server";

/**
 * Creates a timeout promise that rejects after specified milliseconds
 */
export function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timeout")), ms);
  });
}

/**
 * Wraps an async function with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([promise, createTimeout(timeoutMs)]);
}

function isTimeoutError(error: any): boolean {
  return error?.message?.includes("timeout") || error?.message?.includes("Request timeout");
}

type CacheEntry = {
  expiresAt: number;
  value: any;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

function getCacheStore(): Map<string, CacheEntry> {
  const globalAny = globalThis as typeof globalThis & { __aiCache?: Map<string, CacheEntry> };
  if (!globalAny.__aiCache) {
    globalAny.__aiCache = new Map();
  }
  return globalAny.__aiCache;
}

export function getCachedValue<T>(key: string): T | null {
  const store = getCacheStore();
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return JSON.parse(JSON.stringify(entry.value)) as T;
}

export function setCachedValue(key: string, value: any, ttlMs: number = CACHE_TTL_MS): void {
  const store = getCacheStore();
  store.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
}

/**
 * Retries a promise factory when a timeout occurs
 */
export async function withRetry<T>(
  promiseFactory: () => Promise<T>,
  attempts: number = 2,
  timeoutMs: number = 30000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await withTimeout(promiseFactory(), timeoutMs);
    } catch (error) {
      lastError = error;
      if (!isTimeoutError(error) || attempt === attempts) {
        throw error;
      }
    }
  }
  throw lastError;
}

/**
 * Standard error response helper
 */
export function errorResponse(
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  console.error(`API Error [${status}]:`, message, details);
  return NextResponse.json(
    { error: message, ...(details && { details }) },
    { status }
  );
}

/**
 * Validates API key is configured
 */
export function validateApiKey(): NextResponse | null {
  if (!process.env.OPENAI_API_KEY) {
    return errorResponse(
      "OpenAI API key is not configured. Please contact support.",
      500
    );
  }
  return null;
}

/**
 * Handles common API errors and returns appropriate responses.
 * In production, internal details are hidden from the client.
 */
export function handleApiError(error: any): NextResponse {
  const isProd = process.env.NODE_ENV === "production";

  if (isTimeoutError(error)) {
    return errorResponse(
      "Request took too long. Please try again with a simpler request.",
      408
    );
  }

  if (error?.message?.includes("API key")) {
    return errorResponse(
      isProd
        ? "A service configuration error occurred. Please try again later."
        : "Invalid API key. Please check your configuration.",
      500
    );
  }

  if (error?.status === 429 || error?.message?.includes("rate limit")) {
    return errorResponse(
      "Rate limit exceeded. Please try again in a moment.",
      429
    );
  }

  if (error?.status === 503 || error?.message?.includes("overloaded")) {
    return errorResponse(
      "Service temporarily unavailable. Please try again in a moment.",
      503
    );
  }

  if (error?.message?.includes("JSON") || error?.message?.includes("parse")) {
    return errorResponse(
      "Invalid response format. Please try again.",
      500
    );
  }

  return errorResponse(
    isProd
      ? "An unexpected error occurred. Please try again."
      : error?.message || "An unexpected error occurred. Please try again.",
    500
  );
}

