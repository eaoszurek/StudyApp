import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyMagicLinkToken } from "@/lib/auth";

/**
 * GET /api/auth/verify?token=...
 * Verifies magic link token and signs the user in.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const email = await verifyMagicLinkToken(token);
    if (!email) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: null,
          emailVerified: true,
        },
      });
    } else if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
    }

    await createSession(user.id);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/dashboard`);
  } catch (error: any) {
    console.error("Magic link verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify token" },
      { status: 500 }
    );
  }
}
