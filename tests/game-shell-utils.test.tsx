import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  getFlagImageUrl,
  renderClueValue,
  renderHiddenCluePlaceholder,
} from "@/src/components/game-shell/utils";

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

  it("renders the flag-colors clue as a blurred flag image", () => {
    const markup = renderToStaticMarkup(
      renderClueValue({ key: "flag-colors", value: flagUrl }),
    );

    expect(markup).toContain('alt="Blurred country flag"');
    expect(markup).toContain('src="' + flagUrl.replaceAll("&", "&amp;") + '"');
    expect(markup).toContain("blur-xl");
    expect(markup).toContain('aria-label="Enlarge blurred country flag"');
    expect(markup).toContain("blur-[12px]");
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
