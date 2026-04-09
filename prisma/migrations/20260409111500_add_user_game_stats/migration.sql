-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameResult" (
    "roundId" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "snapshotKey" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityQid" TEXT NOT NULL,
    "canonicalAnswer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "revealedClueCount" INTEGER NOT NULL,
    "totalClues" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameResult_pkey" PRIMARY KEY ("roundId")
);

-- CreateTable
CREATE TABLE "UserCategoryModeStats" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "roundsPlayed" INTEGER NOT NULL DEFAULT 0,
    "roundsWon" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCategoryModeStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_clerkUserId_key" ON "UserProfile"("clerkUserId");

-- CreateIndex
CREATE INDEX "GameResult_userProfileId_completedAt_idx" ON "GameResult"("userProfileId", "completedAt");

-- CreateIndex
CREATE INDEX "GameResult_userProfileId_category_mode_completedAt_idx"
ON "GameResult"("userProfileId", "category", "mode", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserCategoryModeStats_userProfileId_category_mode_key"
ON "UserCategoryModeStats"("userProfileId", "category", "mode");

-- AddForeignKey
ALTER TABLE "GameResult" ADD CONSTRAINT "GameResult_userProfileId_fkey"
FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCategoryModeStats" ADD CONSTRAINT "UserCategoryModeStats_userProfileId_fkey"
FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
