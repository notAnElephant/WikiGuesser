import { describe, expect, it } from "vitest";

import { assertCountrySourceCoverage } from "@/src/lib/content/country-source-coverage";
import type { NormalizedEntity } from "@/src/lib/types";

const country = (qid: string) =>
  ({ qid, category: "countries" }) as NormalizedEntity;

describe("Wikipedia country source coverage", () => {
  it("accepts a snapshot containing every source country", () => {
    expect(() =>
      assertCountrySourceCoverage(
        ["Q148", "Q219060"],
        [country("Q148"), country("Q219060")],
      ),
    ).not.toThrow();
  });

  it("reports each source country missing from the playable snapshot", () => {
    expect(() =>
      assertCountrySourceCoverage(
        ["Q148", "Q219060", "Q219060"],
        [country("Q148")],
      ),
    ).toThrow("Q219060");
  });
});
