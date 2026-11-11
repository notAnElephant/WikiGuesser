CREATE TYPE "ChallengeReplayStatus" AS ENUM ('PENDING', 'SOLVED', 'GAVE_UP', 'OUT_OF_CLUES');

ALTER TABLE "FriendChallengeAttempt" ADD COLUMN "replayStatus" "ChallengeReplayStatus";
