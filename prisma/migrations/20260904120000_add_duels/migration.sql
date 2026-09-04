-- CreateEnum
CREATE TYPE "DuelStatus" AS ENUM ('INVITED', 'ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Duel" (
    "id" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "status" "DuelStatus" NOT NULL DEFAULT 'INVITED',
    "category" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "roundCount" INTEGER NOT NULL,
    "snapshotVersionId" TEXT,
    "snapshotKey" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Duel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuelRound" (
    "id" TEXT NOT NULL,
    "duelId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "snapshotEntityId" TEXT,
    "entityQid" TEXT NOT NULL,
    "canonicalAnswer" TEXT NOT NULL,
    "acceptedAnswers" JSONB NOT NULL,
    "clues" JSONB NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "DuelRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuelAttempt" (
    "id" TEXT NOT NULL,
    "duelRoundId" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "revealedClueKeys" JSONB NOT NULL DEFAULT '[]',
    "guesses" JSONB NOT NULL DEFAULT '[]',
    "canGuess" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "isCorrect" BOOLEAN,
    "completedAt" TIMESTAMP(3),
    "givenUp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuelAttempt_pkey" PRIMARY KEY ("id")
);

-- Constraints
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_roundCount_check" CHECK ("roundCount" IN (3, 5, 10));
ALTER TABLE "DuelRound" ADD CONSTRAINT "DuelRound_position_check" CHECK ("position" > 0);
ALTER TABLE "DuelAttempt" ADD CONSTRAINT "DuelAttempt_version_check" CHECK ("version" >= 0);
ALTER TABLE "DuelAttempt" ADD CONSTRAINT "DuelAttempt_score_check" CHECK ("score" IS NULL OR "score" >= 0);

-- CreateIndex
CREATE UNIQUE INDEX "Duel_inviteCode_key" ON "Duel"("inviteCode");
CREATE INDEX "Duel_status_expiresAt_idx" ON "Duel"("status", "expiresAt");
CREATE INDEX "Duel_challengerId_createdAt_idx" ON "Duel"("challengerId", "createdAt");
CREATE INDEX "Duel_opponentId_createdAt_idx" ON "Duel"("opponentId", "createdAt");
CREATE UNIQUE INDEX "DuelRound_duelId_position_key" ON "DuelRound"("duelId", "position");
CREATE UNIQUE INDEX "DuelRound_duelId_snapshotEntityId_key" ON "DuelRound"("duelId", "snapshotEntityId");
CREATE INDEX "DuelRound_snapshotEntityId_idx" ON "DuelRound"("snapshotEntityId");
CREATE UNIQUE INDEX "DuelAttempt_duelRoundId_userProfileId_key" ON "DuelAttempt"("duelRoundId", "userProfileId");
CREATE INDEX "DuelAttempt_userProfileId_updatedAt_idx" ON "DuelAttempt"("userProfileId", "updatedAt");

-- Snapshot references are nullable and the immutable round payload is retained,
-- so replacing the active snapshot cannot invalidate existing duels.
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_snapshotVersionId_fkey"
    FOREIGN KEY ("snapshotVersionId") REFERENCES "SnapshotVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_challengerId_fkey"
    FOREIGN KEY ("challengerId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_opponentId_fkey"
    FOREIGN KEY ("opponentId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DuelRound" ADD CONSTRAINT "DuelRound_duelId_fkey"
    FOREIGN KEY ("duelId") REFERENCES "Duel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DuelRound" ADD CONSTRAINT "DuelRound_snapshotEntityId_fkey"
    FOREIGN KEY ("snapshotEntityId") REFERENCES "SnapshotEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DuelAttempt" ADD CONSTRAINT "DuelAttempt_duelRoundId_fkey"
    FOREIGN KEY ("duelRoundId") REFERENCES "DuelRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DuelAttempt" ADD CONSTRAINT "DuelAttempt_userProfileId_fkey"
    FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
