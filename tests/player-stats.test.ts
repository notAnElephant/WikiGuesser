import { describe, expect, it } from "vitest";

import { buildNextCategoryModeStats } from "@/src/lib/game/player-stats";

describe("player stats", () => {
  it("creates the first aggregate row from a win", () => {
    const completedAt = new Date("2026-04-09T10:00:00.000Z");
    const next = buildNextCategoryModeStats(null, {
      score: 80,
      isCorrect: true,
      completedAt,
    });

    expect(next).toEqual({
      roundsPlayed: 1,
      roundsWon: 1,
      totalScore: 80,
      bestScore: 80,
      currentStreak: 1,
      bestStreak: 1,
      lastPlayedAt: completedAt,
    });
  });

  it("extends the streak and preserves the highest score", () => {
    const completedAt = new Date("2026-04-09T10:05:00.000Z");
    const next = buildNextCategoryModeStats(
      {
        roundsPlayed: 3,
        roundsWon: 2,
        totalScore: 180,
        bestScore: 100,
        currentStreak: 2,
        bestStreak: 2,
      },
      {
        score: 60,
        isCorrect: true,
        completedAt,
      },
    );

    expect(next).toEqual({
      roundsPlayed: 4,
      roundsWon: 3,
      totalScore: 240,
      bestScore: 100,
      currentStreak: 3,
      bestStreak: 3,
      lastPlayedAt: completedAt,
    });
  });

  it("resets the active streak after a loss", () => {
    const completedAt = new Date("2026-04-09T10:10:00.000Z");
    const next = buildNextCategoryModeStats(
      {
        roundsPlayed: 5,
        roundsWon: 4,
        totalScore: 320,
        bestScore: 100,
        currentStreak: 4,
        bestStreak: 4,
      },
      {
        score: 0,
        isCorrect: false,
        completedAt,
      },
    );

    expect(next).toEqual({
      roundsPlayed: 6,
      roundsWon: 4,
      totalScore: 320,
      bestScore: 100,
      currentStreak: 0,
      bestStreak: 4,
      lastPlayedAt: completedAt,
    });
  });
});
