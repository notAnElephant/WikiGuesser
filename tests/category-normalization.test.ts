import { describe, expect, it } from "vitest";

import { categoryDefinitions } from "@/src/lib/content/category-definitions";
import type { SourceEntity } from "@/src/lib/types";
import {
  citySourceFixture,
  countrySourceFixture,
  personSourceFixture,
} from "@/tests/fixtures";

describe("category normalization", () => {
  it("builds a playable country entity", () => {
    const entity =
      categoryDefinitions.countries.normalize(countrySourceFixture);
    expect(entity?.canonicalAnswer).toBe("France");
    expect(entity?.clues).toHaveLength(5);
    expect(entity?.clues.at(-1)?.label).toBe("Capital");
    expect(entity?.clues.some((clue) => clue.label === "Currency")).toBe(true);
    expect(entity?.metadata.centroidLatitude).toBe(46.2276);
  });

  it("builds a playable city entity", () => {
    const entity = categoryDefinitions.cities.normalize(citySourceFixture);
    expect(entity?.canonicalAnswer).toBe("Budapest");
    expect(entity?.clues[0]?.label).toBe("Continent");
    expect(entity?.clues.at(-1)?.value).toBe("1873");

    const blurredClues = entity?.clues.filter(
      (c) => c.mode === "blurred-lines",
    );
    expect(blurredClues).toHaveLength(3);
    expect(blurredClues?.some((c) => c.label === "Mayor")).toBe(true);
    expect(blurredClues?.some((c) => c.label === "GDP per capita")).toBe(true);
    expect(blurredClues?.some((c) => c.label === "Famous location")).toBe(true);
  });

  it("rejects city entities without enough classic clues", () => {
    const sparseCityFixture: SourceEntity = {
      ...citySourceFixture,
      qid: "Q999999",
      label: "Sparse City",
      wikipediaTitle: "Sparse City",
      claims: {
        P30: citySourceFixture.claims.P30,
        P1082: citySourceFixture.claims.P1082,
        P625: [
          {
            type: "coordinate",
            latitude: 48.2,
            longitude: 16.37,
            precision: 0.1,
          },
        ],
        P2131: citySourceFixture.claims.P2131,
      },
      raw: {},
    };

    expect(
      categoryDefinitions.cities.normalize(sparseCityFixture, {
        allSourceEntities: [citySourceFixture, sparseCityFixture],
      }),
    ).toBeNull();
  });

  it("calculates the closest capital for city entities", () => {
    const londonFixture: SourceEntity = {
      ...citySourceFixture,
      qid: "Q84",
      label: "London",
      claims: {
        ...citySourceFixture.claims,
        P625: [
          {
            type: "coordinate",
            latitude: 51.5072,
            longitude: -0.1275,
            precision: 0.1,
          },
        ],
      },
    };

    const entity = categoryDefinitions.cities.normalize(londonFixture, {
      allSourceEntities: [citySourceFixture, londonFixture],
    });

    const closestCapitalClue = entity?.clues.find(
      (c) => c.key === "closest-capital",
    );
    expect(closestCapitalClue?.value).toContain("Budapest");
    expect(closestCapitalClue?.value).toContain("km");
  });

  it("treats Vatican City as its own capital when P36 is missing", () => {
    const entity = categoryDefinitions.countries.normalize({
      ...countrySourceFixture,
      qid: "Q237",
      label: "Vatican City",
      wikipediaTitle: "Vatican City",
      aliases: ["Vatican City State", "Holy See"],
      claims: {
        P30: [{ type: "entity", id: "Q46", label: "Europe" }],
        P2046: [{ type: "quantity", amount: 0.49, unit: "km²" }],
        P1082: [{ type: "quantity", amount: 882, unit: null }],
        P38: [{ type: "entity", id: "Q4916", label: "euro" }],
        P625: [
          {
            type: "coordinate",
            latitude: 41.904,
            longitude: 12.453,
            precision: 0.1,
          },
        ],
      },
    });

    expect(entity?.canonicalAnswer).toBe("Vatican City");
    expect(entity?.clues).toHaveLength(5);
    expect(entity?.clues.at(-1)?.label).toBe("Capital");
    expect(entity?.clues.at(-1)?.value).toBe("Vatican City");
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
