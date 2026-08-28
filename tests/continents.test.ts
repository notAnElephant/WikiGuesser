import { describe, expect, it } from "vitest";

import {
  buildContinentOptions,
  getEntityContinentIds,
} from "@/src/lib/content/continents";
import { demoSnapshot } from "@/src/lib/content/demo-snapshot";
import { startRoundSchema } from "@/src/lib/api-schemas";

describe("continent helpers", () => {
  it("builds populated filter options with entity counts", () => {
    expect(buildContinentOptions(demoSnapshot.entities)).toEqual([
      { id: "asia", label: "Asia", entityCount: 1 },
      { id: "europe", label: "Europe", entityCount: 1 },
    ]);
  });

  it("falls back to the existing continent clue for older snapshots", () => {
    const france = demoSnapshot.entities.find(
      (entity) => entity.id === "countries-france",
    )!;

    expect(
      getEntityContinentIds({
        ...france,
        metadata: {
          ...france.metadata,
          continents: null,
        },
      }),
    ).toEqual(["europe"]);
  });

  it("validates continent filters at the API boundary", () => {
    expect(
      startRoundSchema.parse({ category: "countries", continent: "europe" }),
    ).toMatchObject({ continent: "europe" });
    expect(
      startRoundSchema.safeParse({
        category: "countries",
        continent: "atlantis",
      }).success,
    ).toBe(false);
  });
});
