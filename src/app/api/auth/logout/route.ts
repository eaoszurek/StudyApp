import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";
import { handleApiError } from "@/utils/apiHelpers";

export async function POST() {
  try {
    await deleteSession();
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    return handleApiError(error);
  }
}

