import { describe, expect, it } from "vitest";

import { categoryDefinitions } from "@/src/lib/content/category-definitions";
import { citySourceFixture, countrySourceFixture, personSourceFixture } from "@/tests/fixtures";

describe("category normalization", () => {
  it("builds a playable country entity", () => {
    const entity = categoryDefinitions.countries.normalize(countrySourceFixture);
    expect(entity?.canonicalAnswer).toBe("France");
    expect(entity?.clues).toHaveLength(5);
    expect(entity?.clues.at(-1)?.label).toBe("Capital");
    expect(entity?.clues.some((clue) => clue.label === "Currency")).toBe(false);
    expect(entity?.metadata.centroidLatitude).toBe(46.2276);
  });

  it("builds a playable city entity", () => {
    const entity = categoryDefinitions.cities.normalize(citySourceFixture);
    expect(entity?.canonicalAnswer).toBe("Budapest");
    expect(entity?.clues[0]?.label).toBe("Country");
    expect(entity?.clues.at(-1)?.value).toBe("1873");
  });

  it("builds a playable person entity with late awards", () => {
    const entity = categoryDefinitions.people.normalize(personSourceFixture);
    expect(entity?.canonicalAnswer).toBe("Marie Curie");
    expect(entity?.clues).toHaveLength(6);
    expect(entity?.clues.at(-1)?.spoilerLevel).toBe("late");
  });

  it("rejects person entities with too few usable clues", () => {
    const sparsePerson = {
      ...personSourceFixture,
      claims: {
        P106: personSourceFixture.claims.P106,
        P27: personSourceFixture.claims.P27,
      },
    };

    expect(categoryDefinitions.people.normalize(sparsePerson)).toBeNull();
  });
});
