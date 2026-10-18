import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  getClueUnlockRoundsRemaining,
  getFlagImageUrl,
  isClueLocked,
  renderClueValue,
  renderHiddenCluePlaceholder,
  shouldDisplayGameStatusToast,
} from "@/src/components/game-shell/utils";
import type { RoundClue } from "@/src/lib/types";

const flagUrl =
  "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag%20of%20France.svg?width=640";

describe("game shell clue rendering", () => {
  it("gets the prefetched flag URL before the clue is revealed", () => {
    expect(
      getFlagImageUrl([
        { key: "continent", prefetchedValue: "Europe" },
        { key: "flag-colors", prefetchedValue: flagUrl },
      ]),
    ).toBe(flagUrl);
  });

  it("renders the flag-colors clue from its supplied image URL", () => {
    const markup = renderToStaticMarkup(
      renderClueValue({ key: "flag-colors", value: flagUrl }),
    );

    expect(markup).toContain('src="' + flagUrl.replaceAll("&", "&amp;") + '"');
  });

  it("reveals the flag after the round while keeping it blurred during play", () => {
    const clue = { key: "flag-colors", value: flagUrl };
    const active = renderToStaticMarkup(renderClueValue(clue));
    const complete = renderToStaticMarkup(renderClueValue(clue, true));

    expect(active).toContain("blur-md");
    expect(complete).not.toContain("blur-md");
    expect(complete).not.toContain("blur-[clamp");
    expect(complete).toContain("Country flag");
  });

  it("reveals the full currency after the round", () => {
    const clue = {
      key: "currency",
      value: "Moldovan leu",
      currencyRedactionTexts: ["Moldovan"],
    };
    const active = renderToStaticMarkup(renderClueValue(clue));
    const complete = renderToStaticMarkup(renderClueValue(clue, true));

    expect(active).toContain("country reference hidden");
    expect(complete).toBe("Moldovan leu");
  });

  it("does not render a flag placeholder before the clue is revealed", () => {
    const markup = renderToStaticMarkup(
      renderHiddenCluePlaceholder(
        { key: "flag-colors", prefetchedValue: flagUrl },
        false,
      ),
    );

    expect(markup).not.toContain(flagUrl);
    expect(markup).toBe("");
  });
});

describe("blurred-lines clue locking", () => {
  const clues: RoundClue[] = [
    "continent",
    "area",
    "population",
    "currency",
    "flag-colors",
  ].map((key) => ({
    key,
    label: key,
    value: null,
    prefetchedValue: key,
    isRevealed: false,
    difficulty: 1,
    spoilerLevel: "safe",
  }));
  clues.push({
    key: "capital",
    label: "Capital",
    value: null,
    prefetchedValue: "Paris",
    isRevealed: false,
    difficulty: 6,
    spoilerLevel: "late",
  });

  it("unlocks the flag after three other clue reveals", () => {
    const flag = clues.find((clue) => clue.key === "flag-colors")!;

    expect(getClueUnlockRoundsRemaining(clues, flag)).toBe(3);
    expect(isClueLocked(clues, flag)).toBe(true);

    const progressedClues = clues.map((clue, index) => ({
      ...clue,
      isRevealed: index < 3,
    }));
    const progressedFlag = progressedClues.find(
      (clue) => clue.key === "flag-colors",
    )!;

    expect(getClueUnlockRoundsRemaining(progressedClues, progressedFlag)).toBe(
      0,
    );
    expect(isClueLocked(progressedClues, progressedFlag)).toBe(false);
  });

  it("counts the safe clues remaining before the capital unlocks", () => {
    const capital = clues.find((clue) => clue.key === "capital")!;

    expect(getClueUnlockRoundsRemaining(clues, capital)).toBe(5);

    const progressedClues = clues.map((clue, index) => ({
      ...clue,
      isRevealed: index < 3,
    }));
    const progressedCapital = progressedClues.find(
      (clue) => clue.key === "capital",
    )!;

    expect(
      getClueUnlockRoundsRemaining(progressedClues, progressedCapital),
    ).toBe(2);
  });
});

describe("game status toasts", () => {
  it.each(["", "   "])(
    "does not display a toast when the status message is blank: %j",
    (message) => {
      expect(shouldDisplayGameStatusToast(message)).toBe(false);
    },
  );

  it.each(["Correct.", "Answer: France."])(
    "does not display a toast for a completed round message: %s",
    (message) => {
      expect(shouldDisplayGameStatusToast(message)).toBe(false);
    },
  );

  it("continues to display feedback toasts during an active round", () => {
    expect(shouldDisplayGameStatusToast("Miss. Next clue.")).toBe(true);
  });
});
