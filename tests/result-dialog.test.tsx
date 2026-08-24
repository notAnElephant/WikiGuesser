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
  clues: [
    {
      key: "flag-colors",
      label: "Flag colors",
      value:
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag%20of%20the%20Netherlands.svg?width=640",
      prefetchedValue:
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag%20of%20the%20Netherlands.svg?width=640",
      isRevealed: true,
      difficulty: 5,
      spoilerLevel: "safe",
    },
  ],
};

const sharedProps = {
  clearForCategoryChoice: () => undefined,
  currentCategory: "countries",
  currentCategoryLabel: "Countries",
  isBusy: false,
  onClose: () => undefined,
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

    expect(markup.match(/>Home<\/button>/g)).toHaveLength(1);
    expect(markup).toContain("lucide-house");
    expect(markup).toContain("Home</button>");
  });

  it("renders the completed round's flag without forcing a backdrop or aspect ratio", () => {
    const markup = renderToStaticMarkup(
      <GameResultDialog
        {...sharedProps}
        primaryActionLabel="Home"
        secondaryActionLabel={null}
      />,
    );

    expect(markup).toContain('aria-label="Close result"');
    expect(markup).toContain('alt="Flag of Netherlands"');
    expect(markup).toContain("Flag%20of%20the%20Netherlands.svg");
    expect(markup).toContain('class="mt-5 flex justify-center"');
    expect(markup).toContain("block h-auto max-h-64 w-auto max-w-full");
    expect(markup).not.toContain("aspect-[3/2]");
  });
});
