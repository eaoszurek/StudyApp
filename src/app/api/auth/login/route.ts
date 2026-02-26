import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, getOrCreateAnonymousSession } from "@/lib/auth";
import { migrateSessionToUser } from "@/lib/migrate-session";
import { checkOrigin, handleApiError } from "@/utils/apiHelpers";
import { rateLimit } from "@/lib/rate-limit";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    const originError = checkOrigin(req);
    if (originError) return originError;

    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`login:${ip}`, { limit: 10, windowSeconds: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const validationResult = LoginSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user has a password (required for password auth)
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "This account was created with the old authentication system. Please go to the sign up page to set a password for your account." },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

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
      message: "Successfully signed in",
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
