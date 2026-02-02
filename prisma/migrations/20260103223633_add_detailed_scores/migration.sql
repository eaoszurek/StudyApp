-- AlterTable
ALTER TABLE "PracticeTest" ADD COLUMN "completedAt" DATETIME;
ALTER TABLE "PracticeTest" ADD COLUMN "maxRawScore" INTEGER;
ALTER TABLE "PracticeTest" ADD COLUMN "rawScore" INTEGER;
ALTER TABLE "PracticeTest" ADD COLUMN "scaledScore" INTEGER;
ALTER TABLE "PracticeTest" ADD COLUMN "timeSpent" INTEGER;

-- CreateIndex
CREATE INDEX "PracticeTest_completedAt_idx" ON "PracticeTest"("completedAt");
