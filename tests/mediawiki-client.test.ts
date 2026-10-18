import { describe, expect, it } from "vitest";

import {
  mapWikibaseItemsToRequestedTitles,
  resolveCountryQid,
  resolveCountryQids,
} from "@/src/lib/content/mediawiki-client";

describe("country title resolution", () => {
  it("maps China to the modern sovereign state", () => {
    expect(resolveCountryQid("China", { China: "Q29520" })).toBe("Q148");
  });

  it("keeps the Wikibase item for ordinary country titles", () => {
    expect(resolveCountryQid("Mongolia", { Mongolia: "Q711" })).toBe("Q711");
  });

  it("keeps the original country title when Wikipedia redirects it", () => {
    const titleToQid = mapWikibaseItemsToRequestedTitles(
      ["State of Palestine", "Mongolia"],
      {
        redirects: [{ from: "State of Palestine", to: "Palestine" }],
        pages: {
          "1": {
            title: "Palestine",
            pageprops: { wikibase_item: "Q219060" },
          },
          "2": {
            title: "Mongolia",
            pageprops: { wikibase_item: "Q711" },
          },
        },
      },
    );

    expect(
      resolveCountryQids(["State of Palestine", "Mongolia"], titleToQid),
    ).toEqual(["Q219060", "Q711"]);
  });

  it("follows normalized titles and redirects together", () => {
    expect(
      mapWikibaseItemsToRequestedTitles(["state_of_palestine"], {
        normalized: [{ from: "state_of_palestine", to: "State of palestine" }],
        redirects: [{ from: "State of palestine", to: "Palestine" }],
        pages: {
          "1": {
            title: "Palestine",
            pageprops: { wikibase_item: "Q219060" },
          },
        },
      }),
    ).toEqual({ state_of_palestine: "Q219060" });
  });

  it("fails discovery when any listed country has no Wikidata item", () => {
    expect(() =>
      resolveCountryQids(["Mongolia", "Missing country"], {
        Mongolia: "Q711",
      }),
    ).toThrow("Missing country");
  });
});
