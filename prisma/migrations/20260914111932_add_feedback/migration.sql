-- CreateEnum
CREATE TYPE "FeedbackKind" AS ENUM ('POSITIVE', 'BUG', 'CONTENT_ISSUE', 'CONFUSING', 'FEATURE_IDEA', 'OTHER');

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "kind" "FeedbackKind" NOT NULL,
    "message" TEXT,
    "context" JSONB,
    "actorId" TEXT,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_kind_createdAt_idx" ON "Feedback"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_actorId_createdAt_idx" ON "Feedback"("actorId", "createdAt");
