import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { handleApiError } from "@/utils/apiHelpers";

/**
 * GET - Returns current user id if signed in (no anonymous sessions)
 */
export async function GET() {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    return NextResponse.json({ userId: user.id });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
