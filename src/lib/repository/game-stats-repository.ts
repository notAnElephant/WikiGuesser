import type { UserCategoryModeStats } from "@prisma/client";

import { buildNextCategoryModeStats } from "@/src/lib/game/player-stats";
import { getPrismaClient } from "@/src/lib/repository/prisma";
import type { EntityCategory, GameMode } from "@/src/lib/types";

export interface RecordCompletedRoundInput {
  clerkUserId: string;
  roundId: string;
  snapshotKey: string;
  entityId: string;
  entityQid: string;
  canonicalAnswer: string;
  category: EntityCategory;
  mode: GameMode;
  score: number;
  isCorrect: boolean;
  revealedClueCount: number;
  totalClues: number;
}

export async function recordCompletedRound(
  input: RecordCompletedRoundInput,
): Promise<void> {
  const prisma = getPrismaClient();
  const completedAt = new Date();

  await prisma.$transaction(async (tx) => {
    const userProfile = await tx.userProfile.upsert({
      where: {
        clerkUserId: input.clerkUserId,
      },
      update: {},
      create: {
        clerkUserId: input.clerkUserId,
      },
      select: {
        id: true,
      },
    });

    const insertedRound = await tx.gameResult.createMany({
      data: [
        {
          roundId: input.roundId,
          userProfileId: userProfile.id,
          snapshotKey: input.snapshotKey,
          entityId: input.entityId,
          entityQid: input.entityQid,
          canonicalAnswer: input.canonicalAnswer,
          category: input.category,
          mode: input.mode,
          score: input.score,
          isCorrect: input.isCorrect,
          revealedClueCount: input.revealedClueCount,
          totalClues: input.totalClues,
          completedAt,
        },
      ],
      skipDuplicates: true,
    });

    if (insertedRound.count === 0) {
      return;
    }

    const currentStats = await tx.userCategoryModeStats.findUnique({
      where: {
        userProfileId_category_mode: {
          userProfileId: userProfile.id,
          category: input.category,
          mode: input.mode,
        },
      },
    });

    const nextStats = buildNextCategoryModeStats(currentStats, {
      score: input.score,
      isCorrect: input.isCorrect,
      completedAt,
    });

    if (currentStats) {
      await tx.userCategoryModeStats.update({
        where: {
          id: currentStats.id,
        },
        data: nextStats,
      });

      return;
    }

    await tx.userCategoryModeStats.create({
      data: {
        userProfileId: userProfile.id,
        category: input.category,
        mode: input.mode,
        ...nextStats,
      },
    });
  });
}

export type UserCategoryModeStatsSnapshot = Pick<
  UserCategoryModeStats,
  | "roundsPlayed"
  | "roundsWon"
  | "totalScore"
  | "bestScore"
  | "currentStreak"
  | "bestStreak"
>;
