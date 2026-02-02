import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, deleteSession } from "@/lib/auth";
import { handleApiError } from "@/utils/apiHelpers";

/**
 * DELETE - Delete user account and all associated data
 */
export async function DELETE() {
  try {
    const user = await getServerSession();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to delete your account." },
        { status: 401 }
      );
    }

    // Delete user (cascade will handle related data)
    // This will automatically delete:
    // - Sessions
    // - Accounts
    // - FlashcardSets
    // - PracticeTests
    // - StudyPlans
    // - MicroLessons
    await prisma.user.delete({
      where: { id: user.id },
    });

    // Clear session cookie
    await deleteSession();

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

