import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DailyLeaderboardShell } from "@/src/components/daily-leaderboard-shell";
import { getDailyComboKey } from "@/src/lib/game/daily";
import type { DailyLeaderboardPageData } from "@/src/lib/types";

describe("DailyLeaderboardShell", () => {
  it("shows games played as a column on the all-time leaderboard", () => {
    const comboKey = getDailyComboKey("countries", "classic");
    const data: DailyLeaderboardPageData = {
      dayKey: "2026-08-25",
      defaultCategory: "countries",
      defaultMode: "classic",
      leaderboardByCombo: {
        [comboKey]: {
          today: [],
          total: [
            {
              playerKey: "player-1",
              displayName: "Ada",
              imageUrl: null,
              score: 420,
              roundsPlayed: 12,
              roundsWon: 7,
            },
          ],
        },
      },
    };

    const markup = renderToStaticMarkup(
      <DailyLeaderboardShell
        data={data}
        initialMode="classic"
        initialPeriod="total"
      />,
    );

    expect(markup).toContain("Games");
    expect(markup).toContain('aria-label="12 games played"');
    expect(markup).toContain("Ada");
    expect(markup).toContain("420");
  });

  it("uses a timezone-neutral placeholder for completion times on the server", () => {
    const comboKey = getDailyComboKey("countries", "classic");
    const data: DailyLeaderboardPageData = {
      dayKey: "2026-08-25",
      defaultCategory: "countries",
      defaultMode: "classic",
      leaderboardByCombo: {
        [comboKey]: {
          today: [
            {
              playerKey: "player-1",
              displayName: "Ada",
              imageUrl: null,
              score: 420,
              completedAt: "2026-08-25T09:45:00.000Z",
            },
          ],
          total: [],
        },
      },
    };

    const markup = renderToStaticMarkup(
      <DailyLeaderboardShell
        data={data}
        initialMode="classic"
        initialPeriod="today"
      />,
    );

    expect(markup).toContain('dateTime="2026-08-25T09:45:00.000Z"');
    expect(markup).toContain(
      '<time dateTime="2026-08-25T09:45:00.000Z">—</time>',
    );
  });
});
