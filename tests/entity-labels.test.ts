import { describe, expect, it } from "vitest";

import { getKnownEntityLabel } from "@/src/lib/content/entity-labels";

describe("known Wikidata entity labels", () => {
  it("resolves the euro for compatibility with older snapshots", () => {
    expect(getKnownEntityLabel("Q4916")).toBe("euro");
  });

  it("does not invent labels for unknown entity IDs", () => {
    expect(getKnownEntityLabel("Q999999999")).toBeNull();
  });
});
