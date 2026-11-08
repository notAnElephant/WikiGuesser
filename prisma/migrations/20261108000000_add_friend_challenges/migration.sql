CREATE TABLE "FriendChallenge" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "creatorClerkUserId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "entity" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FriendChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FriendChallengeAttempt" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "revealedClueKeys" JSONB NOT NULL DEFAULT '[]',
    "guesses" JSONB NOT NULL DEFAULT '[]',
    "canGuess" BOOLEAN NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FriendChallengeAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FriendChallenge_code_key" ON "FriendChallenge"("code");
CREATE UNIQUE INDEX "FriendChallengeAttempt_challengeId_actorId_key" ON "FriendChallengeAttempt"("challengeId", "actorId");
ALTER TABLE "FriendChallengeAttempt" ADD CONSTRAINT "FriendChallengeAttempt_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "FriendChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
