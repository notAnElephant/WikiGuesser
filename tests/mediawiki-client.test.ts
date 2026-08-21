import { describe, expect, it } from "vitest";

import { resolveCountryQid } from "@/src/lib/content/mediawiki-client";

describe("country title resolution", () => {
  it("maps China to the modern sovereign state", () => {
    expect(resolveCountryQid("China", { China: "Q29520" })).toBe("Q148");
  });

  it("keeps the Wikibase item for ordinary country titles", () => {
    expect(resolveCountryQid("Mongolia", { Mongolia: "Q711" })).toBe("Q711");
  });
});
