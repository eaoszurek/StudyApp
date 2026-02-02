-- AlterTable
ALTER TABLE "User" ADD COLUMN "privacyAcceptedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "privacyVersion" TEXT;
ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "termsVersion" TEXT;
