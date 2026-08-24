import { renderToStaticMarkup } from "react-dom/server";
import { Play } from "lucide-react";
import { describe, expect, it } from "vitest";

import { GameResultDialog } from "@/src/components/game-shell/result-dialog";
import type { RoundOutcome } from "@/src/components/game-shell/types";

const dailyResult: RoundOutcome = {
  status: "win",
  canonicalAnswer: "Netherlands",
  score: 100,
  kind: "daily",
  category: "countries",
  mode: "classic",
  clues: [],
};

const sharedProps = {
  clearForCategoryChoice: () => undefined,
  currentCategory: "countries",
  currentCategoryLabel: "Countries",
  isBusy: false,
  result: dailyResult,
  startRound: () => undefined,
} as const;

describe("daily result dialog actions", () => {
  it("offers the other daily alongside Home when one remains", () => {
    const markup = renderToStaticMarkup(
      <GameResultDialog
        {...sharedProps}
        primaryActionIcon={Play}
        primaryActionLabel="Play Choose Clues Daily"
        secondaryActionLabel="Home"
      />,
    );

    expect(markup).toContain("Play Choose Clues Daily");
    expect(markup).toContain("lucide-play");
    expect(markup).toContain("Home</button>");
  });

  it("renders only one Home action when no daily remains", () => {
    const markup = renderToStaticMarkup(
      <GameResultDialog
        {...sharedProps}
        primaryActionLabel="Home"
        secondaryActionLabel={null}
      />,
    );

    expect(markup.match(/<button/g)).toHaveLength(1);
    expect(markup).toContain("lucide-house");
    expect(markup).toContain("Home</button>");
  });
});
