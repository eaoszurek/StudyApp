import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/utils/apiHelpers";

export async function GET() {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { skillWeaknesses: true },
    });

    return NextResponse.json({
      skillWeaknesses: record?.skillWeaknesses ?? {},
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
