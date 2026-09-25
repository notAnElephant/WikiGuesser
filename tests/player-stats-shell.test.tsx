import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PlayerStatsShell } from "@/src/components/player-stats-shell";
import type { PlayerStatsPageData } from "@/src/lib/repository/game-stats-repository";

const populatedData: PlayerStatsPageData = {
  freePlay: [
    {
      category: "countries",
      mode: "classic",
      roundsPlayed: 8,
      roundsWon: 6,
      totalScore: 520,
      bestScore: 100,
      currentStreak: 3,
      bestStreak: 4,
    },
  ],
  daily: [
    {
      category: "countries",
      mode: "classic",
      roundsPlayed: 3,
      roundsWon: 2,
      totalScore: 180,
      bestScore: 100,
    },
  ],
};

describe("PlayerStatsShell", () => {
  it("shows separate cumulative stats for free play and daily challenges", () => {
    const markup = renderToStaticMarkup(
      <PlayerStatsShell data={populatedData} />,
    );

    expect(markup).toContain("520");
    expect(markup).toContain("180");
    expect(markup).toContain("75%");
  });

});
