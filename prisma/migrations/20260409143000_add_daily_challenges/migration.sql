-- AlterTable
ALTER TABLE "UserProfile"
ADD COLUMN "displayName" TEXT,
ADD COLUMN "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "DailyChallenge" (
    "id" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "snapshotKey" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityQid" TEXT NOT NULL,
    "canonicalAnswer" TEXT NOT NULL,
    "acceptedAnswers" JSONB NOT NULL,
    "clues" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyResult" (
    "id" TEXT NOT NULL,
    "dailyChallengeId" TEXT NOT NULL,
    "playerKey" TEXT NOT NULL,
    "userProfileId" TEXT,
    "category" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "revealedClueCount" INTEGER NOT NULL,
    "totalClues" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "DailyResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDailyCategoryModeStats" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "roundsPlayed" INTEGER NOT NULL DEFAULT 0,
    "roundsWon" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDailyCategoryModeStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallenge_dayKey_category_mode_key"
ON "DailyChallenge"("dayKey", "category", "mode");

-- CreateIndex
CREATE INDEX "DailyChallenge_dayKey_idx" ON "DailyChallenge"("dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailyResult_dailyChallengeId_playerKey_key"
ON "DailyResult"("dailyChallengeId", "playerKey");

-- CreateIndex
CREATE INDEX "DailyResult_dailyChallengeId_completedAt_idx"
ON "DailyResult"("dailyChallengeId", "completedAt");

-- CreateIndex
CREATE INDEX "DailyResult_userProfileId_category_mode_completedAt_idx"
ON "DailyResult"("userProfileId", "category", "mode", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserDailyCategoryModeStats_userProfileId_category_mode_key"
ON "UserDailyCategoryModeStats"("userProfileId", "category", "mode");

-- AddForeignKey
ALTER TABLE "DailyResult" ADD CONSTRAINT "DailyResult_dailyChallengeId_fkey"
FOREIGN KEY ("dailyChallengeId") REFERENCES "DailyChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyResult" ADD CONSTRAINT "DailyResult_userProfileId_fkey"
FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyCategoryModeStats" ADD CONSTRAINT "UserDailyCategoryModeStats_userProfileId_fkey"
FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
