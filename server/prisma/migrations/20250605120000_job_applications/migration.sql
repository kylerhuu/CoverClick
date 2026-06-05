-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('SAVED', 'PREPARING', 'READY_TO_APPLY', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "jobUrl" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL DEFAULT '',
    "dateSaved" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateApplied" TIMESTAMP(3),
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'SAVED',
    "fitScore" INTEGER,
    "resumeUsed" JSONB,
    "coverLetterDraft" JSONB,
    "resumeSuggestions" JSONB,
    "preparationSteps" JSONB,
    "preparationError" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "interviewDate" TIMESTAMP(3),
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobApplication_userId_status_idx" ON "JobApplication"("userId", "status");

-- CreateIndex
CREATE INDEX "JobApplication_userId_dateSaved_idx" ON "JobApplication"("userId", "dateSaved");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_userId_jobUrl_key" ON "JobApplication"("userId", "jobUrl");

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
