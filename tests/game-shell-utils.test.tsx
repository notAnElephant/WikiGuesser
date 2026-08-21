import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  renderClueValue,
  renderHiddenCluePlaceholder,
} from "@/src/components/game-shell/utils";

const flagUrl =
  "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag%20of%20France.svg?width=640";

describe("game shell clue rendering", () => {
  it("renders the flag-colors clue as a blurred flag image", () => {
    const markup = renderToStaticMarkup(
      renderClueValue({ key: "flag-colors", value: flagUrl }),
    );

    expect(markup).toContain('alt="Blurred country flag"');
    expect(markup).toContain('src="' + flagUrl.replaceAll("&", "&amp;") + '"');
    expect(markup).toContain("blur-xl");
  });

  it("does not expose the flag URL in an unrevealed clue row", () => {
    const markup = renderToStaticMarkup(
      renderHiddenCluePlaceholder(
        { key: "flag-colors", prefetchedValue: flagUrl },
        false,
      ),
    );

    expect(markup).not.toContain(flagUrl);
    expect(markup).toContain("blur-md");
  });
});
