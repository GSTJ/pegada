-- Complaints used to leave the app as a mailto, so there was no row to count
-- and no history to compare against. Additive: one new table and two new enum
-- types, nothing existing is touched.

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('DOG', 'USER');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('FAKE_PROFILE', 'INAPPROPRIATE_PHOTOS', 'HARASSMENT', 'SPAM', 'OTHER');

-- CreateTable
CREATE TABLE "Report" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "targetType" "ReportTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" "ReportReason" NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- The readout query: complaints against one dog over a window.
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");
