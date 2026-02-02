import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import crypto from "crypto";
import { handleApiError } from "@/utils/apiHelpers";

const SESSION_COOKIE_NAME = "sat_session_id";
const SESSION_DURATION_DAYS = 30;

/**
 * GET - Returns current session ID or creates new one
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    // Check if user is authenticated
    const user = await getServerSession();

    if (!sessionId) {
      // Create new anonymous session
      sessionId = crypto.randomUUID();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + SESSION_DURATION_DAYS);

      // Store in database
      await prisma.session.create({
        data: {
          id: sessionId,
          sessionId, // Store as sessionId for anonymous users
          userId: user?.id, // Link to user if authenticated
          expiresAt: expirationDate,
        },
      });

      cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
        expires: expirationDate,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    } else {
      // Update existing session to link to user if authenticated
      if (user) {
        await prisma.session.updateMany({
          where: { sessionId },
          data: { userId: user.id },
        });
      }
    }

    return NextResponse.json({ sessionId });
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * POST - Creates a new session (if needed)
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = crypto.randomUUID();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + SESSION_DURATION_DAYS);

    // Check if user is authenticated
    const user = await getServerSession();

    // Store in database
    await prisma.session.create({
      data: {
        id: sessionId,
        sessionId, // Store as sessionId for anonymous users
        userId: user?.id, // Link to user if authenticated
        expiresAt: expirationDate,
      },
    });

    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
      expires: expirationDate,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json({ sessionId });
  } catch (error: any) {
    return handleApiError(error);
  }
}

