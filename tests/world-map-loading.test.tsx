import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorldMapDialog } from "@/src/components/game-shell/world-map-dialog";

describe("world map loading state", () => {
  it.each([false, true])("shows loading only while busy (%s)", (isBusy) => {
    const markup = renderToStaticMarkup(
      <WorldMapDialog
        embedded
        guessedCountries={[]}
        isBusy={isBusy}
        isExpanded={false}
        onExpandedChange={() => {}}
      />,
    );

    expect(markup).toContain(`aria-busy="${isBusy}"`);
    expect(markup.includes("Loading…")).toBe(isBusy);
  });
});
