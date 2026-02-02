/**
 * Authentication Utilities
 * Server-side authentication helpers
 * 
 * SECURITY NOTE: Rate limiting should be implemented at the infrastructure level
 * (e.g., using Vercel Edge Config, Cloudflare, or nginx) to prevent brute force attacks.
 * Client-side rate limiting is not secure and can be bypassed.
 */

import { cookies } from "next/headers";
import { prisma } from "./prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const SESSION_COOKIE_NAME = "auth_session";
const SESSION_DURATION_DAYS = 30;
const MAGIC_LINK_TOKEN_EXPIRY_HOURS = 24;

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  subscriptionStatus?: "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING" | null;
}

/**
 * Get current user from session cookie
 */
export async function getServerSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) {
      return null;
    }

    // Find session in database
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || !session.userId || !session.user) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Delete expired session
      await prisma.session.delete({ where: { id: sessionId } });
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      emailVerified: session.user.emailVerified,
      subscriptionStatus: session.user.subscriptionStatus,
    };
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}

/**
 * Create a secure session for authenticated user
 */
export async function createSession(userId: string, anonymousSessionId?: string): Promise<string> {
  const cookieStore = await cookies();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  // Create session in database
  const session = await prisma.session.create({
    data: {
      userId,
      sessionId: anonymousSessionId, // Keep reference to anonymous session for migration
      expiresAt,
    },
  });

  // Set secure cookie
  cookieStore.set(SESSION_COOKIE_NAME, session.id, {
    expires: expiresAt,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return session.id;
}

/**
 * Delete session and clear cookie
 */
export async function deleteSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionId) {
      // Delete from database
      await prisma.session.deleteMany({
        where: { id: sessionId },
      });
    }

    // Clear cookie
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    console.error("Error deleting session:", error);
  }
}

/**
 * Generate a secure random token for magic links
 */
export function generateMagicLinkToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash a token for storage
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Create and store a verification token
 */
export async function createVerificationToken(email: string): Promise<string> {
  const token = generateMagicLinkToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + MAGIC_LINK_TOKEN_EXPIRY_HOURS);

  // Delete any existing tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { email },
  });

  // Create new token
  await prisma.verificationToken.create({
    data: {
      email,
      token: hashedToken,
      expiresAt,
    },
  });

  return token; // Return unhashed token for email
}

/**
 * Verify and consume a magic link token
 */
export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  const hashedToken = hashToken(token);

  // Find token
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token: hashedToken },
  });

  if (!verificationToken) {
    return null; // Token not found
  }

  // Check expiration
  if (verificationToken.expiresAt < new Date()) {
    // Delete expired token
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });
    return null;
  }

  // Delete token (single-use)
  await prisma.verificationToken.delete({
    where: { id: verificationToken.id },
  });

  return verificationToken.email;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Get or create anonymous session ID from cookie
 */
export async function getOrCreateAnonymousSession(): Promise<string> {
  const cookieStore = await cookies();
  const ANONYMOUS_SESSION_COOKIE = "sat_session_id";
  
  let sessionId = cookieStore.get(ANONYMOUS_SESSION_COOKIE)?.value;

  if (!sessionId) {
    // Generate new session ID
    sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Store in database
    await prisma.session.create({
      data: {
        sessionId,
        expiresAt,
      },
    });

    // Set cookie
    cookieStore.set(ANONYMOUS_SESSION_COOKIE, sessionId, {
      expires: expiresAt,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return sessionId;
}

