import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { handleApiError } from "@/utils/apiHelpers";

export async function GET() {
  try {
    const user = await getServerSession();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    return handleApiError(error);
  }
}

