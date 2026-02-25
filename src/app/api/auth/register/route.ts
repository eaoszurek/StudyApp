import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession, getOrCreateAnonymousSession } from "@/lib/auth";
import { migrateSessionToUser } from "@/lib/migrate-session";
import { handleApiError } from "@/utils/apiHelpers";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/policy";
import { rateLimit } from "@/lib/rate-limit";

const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the Terms of Service and Privacy Policy",
  }),
});

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`register:${ip}`, { limit: 5, windowSeconds: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const validationResult = RegisterSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { email, name, password } = validationResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // If user has a password, they should sign in instead
      if (existingUser.passwordHash) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in instead." },
          { status: 409 }
        );
      }

      // User exists but has no password (migrating from magic link) - update with password
      const passwordHash = await hashPassword(password);
      
      const user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          name: name.trim(), // Update name if provided
          emailVerified: true, // Mark as verified since they're setting a password
          termsAcceptedAt: new Date(),
          termsVersion: TERMS_VERSION,
          privacyAcceptedAt: new Date(),
          privacyVersion: PRIVACY_VERSION,
        },
      });

      // Get anonymous session ID if exists
      let anonymousSessionId: string | undefined;
      try {
        anonymousSessionId = await getOrCreateAnonymousSession();
      } catch (error) {
        console.warn("Could not get anonymous session:", error);
      }

      // Migrate session data to user account
      if (anonymousSessionId) {
        await migrateSessionToUser(anonymousSessionId, user.id);
      }

      // Create authenticated session
      await createSession(user.id, anonymousSessionId);
      
      return NextResponse.json({
        success: true,
        message: "Password set successfully. You are now signed in.",
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create new user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        emailVerified: true, // No email verification needed for password auth
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
        privacyAcceptedAt: new Date(),
        privacyVersion: PRIVACY_VERSION,
      },
    });

    // Get anonymous session ID if exists
    let anonymousSessionId: string | undefined;
    try {
      anonymousSessionId = await getOrCreateAnonymousSession();
    } catch (error) {
      // If we can't get anonymous session, continue anyway
      console.warn("Could not get anonymous session:", error);
    }

    // Migrate session data to user account
    if (anonymousSessionId) {
      await migrateSessionToUser(anonymousSessionId, user.id);
    }

    // Create authenticated session
    await createSession(user.id, anonymousSessionId);

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
