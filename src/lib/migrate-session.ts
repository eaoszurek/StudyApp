/**
 * Session Data Migration Utility
 * Migrates anonymous session data to user account
 */

import { prisma } from "./prisma";

/**
 * Migrate all data associated with sessionId to userId
 */
export async function migrateSessionToUser(sessionId: string, userId: string): Promise<void> {
  try {
    // Migrate FlashcardSets
    await prisma.flashcardSet.updateMany({
      where: {
        sessionId,
        userId: null, // Only migrate if not already associated with a user
      },
      data: {
        userId,
        sessionId: null, // Clear sessionId after migration
      },
    });

    // Migrate PracticeTests
    await prisma.practiceTest.updateMany({
      where: {
        sessionId,
        userId: null,
      },
      data: {
        userId,
        sessionId: null,
      },
    });

    // Migrate StudyPlans
    await prisma.studyPlan.updateMany({
      where: {
        sessionId,
        userId: null,
      },
      data: {
        userId,
        sessionId: null,
      },
    });

    // Migrate MicroLessons
    await prisma.microLesson.updateMany({
      where: {
        sessionId,
        userId: null,
      },
      data: {
        userId,
        sessionId: null,
      },
    });

    // Also migrate any Session records that reference this sessionId
    // Update them to link to the userId
    await prisma.session.updateMany({
      where: {
        sessionId,
        userId: null,
      },
      data: {
        userId,
      },
    });

    console.log(`Successfully migrated session data for sessionId: ${sessionId} to userId: ${userId}`);
  } catch (error) {
    console.error("Error migrating session data:", error);
    // Don't throw - migration failure shouldn't block authentication
    // Data can be migrated later if needed
  }
}

