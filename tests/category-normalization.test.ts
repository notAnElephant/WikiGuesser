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
    expect(entity?.clues).toHaveLength(6);
    expect(entity?.clues.at(-1)?.label).toBe("Capital");
    expect(entity?.clues.some((clue) => clue.label === "Currency")).toBe(true);
    expect(
      entity?.clues.find((clue) => clue.key === "flag-colors")?.value,
    ).toBe(
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag%20of%20France.svg?width=640",
    );
    expect(entity?.metadata.centroidLatitude).toBe(46.2276);
    expect(entity?.metadata.continents).toEqual(["europe"]);
  });

  it("uses the primary continent for an exclusive filter category", () => {
    const entity = categoryDefinitions.countries.normalize({
      ...countrySourceFixture,
      qid: "Q43",
      label: "Turkey",
      wikipediaTitle: "Turkey",
      claims: {
        ...countrySourceFixture.claims,
        P30: [
          { type: "entity", id: "Q46", label: "Europe" },
          { type: "entity", id: "Q48", label: "Asia" },
        ],
      },
    });

    expect(entity?.metadata.continents).toEqual(["europe"]);
  });

  it("maps Central America to the Americas primary filter", () => {
    const entity = categoryDefinitions.countries.normalize({
      ...countrySourceFixture,
      qid: "Q804",
      label: "Panama",
      wikipediaTitle: "Panama",
      claims: {
        ...countrySourceFixture.claims,
        P30: [
          { type: "entity", id: "Q27611", label: "Central America" },
          { type: "entity", id: "Q18", label: "South America" },
          { type: "entity", id: "Q49", label: "North America" },
        ],
      },
    });

    expect(entity?.metadata.continents).toEqual(["americas"]);
  });

  it("uses the preferred current country flag", () => {
    const entity = categoryDefinitions.countries.normalize({
      ...countrySourceFixture,
      claims: {
        ...countrySourceFixture.claims,
        P41: [
          { type: "string", value: "Historical flag.svg" },
          { type: "string", value: "Current flag.svg" },
        ],
      },
      raw: {
        claims: {
          P41: [
            {
              rank: "normal",
              mainsnak: {
                datavalue: { type: "string", value: "Historical flag.svg" },
              },
              qualifiers: { P582: [{}] },
            },
            {
              rank: "preferred",
              mainsnak: {
                datavalue: { type: "string", value: "Current flag.svg" },
              },
            },
          ],
        },
      },
    });

    expect(
      entity?.clues.find((clue) => clue.key === "flag-colors")?.value,
    ).toBe(
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Current%20flag.svg?width=640",
    );
  });

  it("ignores ended currencies and capitals", () => {
    const entity = categoryDefinitions.countries.normalize({
      ...countrySourceFixture,
      claims: {
        ...countrySourceFixture.claims,
        P38: [
          { type: "entity", id: "Q16068", label: "Deutsche Mark" },
          { type: "entity", id: "Q4916", label: "euro" },
        ],
        P36: [
          { type: "entity", id: "Q8678", label: "Rio de Janeiro" },
          { type: "entity", id: "Q2844", label: "Brasília" },
        ],
      },
      raw: {
        claims: {
          P38: [
            {
              rank: "normal",
              mainsnak: {
                snaktype: "value",
                datavalue: {
                  type: "wikibase-entityid",
                  value: { id: "Q16068" },
                },
              },
              qualifiers: { P582: [{}] },
            },
            {
              rank: "preferred",
              mainsnak: {
                snaktype: "value",
                datavalue: {
                  type: "wikibase-entityid",
                  value: { id: "Q4916" },
                },
              },
            },
          ],
          P36: [
            {
              rank: "normal",
              mainsnak: {
                snaktype: "value",
                datavalue: {
                  type: "wikibase-entityid",
                  value: { id: "Q8678" },
                },
              },
              qualifiers: { P582: [{}] },
            },
            {
              rank: "normal",
              mainsnak: {
                snaktype: "value",
                datavalue: {
                  type: "wikibase-entityid",
                  value: { id: "Q2844" },
                },
              },
            },
          ],
        },
      },
    });

    expect(entity?.clues.find((clue) => clue.key === "currency")?.value).toBe(
      "euro",
    );
    expect(entity?.clues.find((clue) => clue.key === "capital")?.value).toBe(
      "Brasília",
    );
  });

  it("uses the preferred current population instead of the oldest historical value", () => {
    const entity = categoryDefinitions.countries.normalize({
      ...countrySourceFixture,
      claims: {
        ...countrySourceFixture.claims,
        P1082: [
          { type: "quantity", amount: 3581239, unit: "1" },
          { type: "quantity", amount: 5627400, unit: "1" },
        ],
      },
      raw: {
        claims: {
          P1082: [
            {
              rank: "normal",
              mainsnak: {
                snaktype: "value",
                datavalue: {
                  type: "quantity",
                  value: { amount: "+3581239" },
                },
              },
              qualifiers: {
                P585: [
                  { datavalue: { value: { time: "+1960-00-00T00:00:00Z" } } },
                ],
              },
            },
            {
              rank: "preferred",
              mainsnak: {
                snaktype: "value",
                datavalue: {
                  type: "quantity",
                  value: { amount: "+5627400" },
                },
              },
              qualifiers: {
                P585: [
                  { datavalue: { value: { time: "+2026-01-01T00:00:00Z" } } },
                ],
              },
            },
          ],
        },
      },
    });

    expect(entity?.clues.find((clue) => clue.key === "population")?.value).toBe(
      "5.6 million",
    );
  });

  it("uses the latest dated quantity when Wikidata has no preferred statement", () => {
    const entity = categoryDefinitions.cities.normalize({
      ...citySourceFixture,
      claims: {
        ...citySourceFixture.claims,
        P1082: [
          { type: "quantity", amount: 1500000, unit: "1" },
          { type: "quantity", amount: 1800000, unit: "1" },
        ],
      },
      raw: {
        claims: {
          P1082: [
            {
              rank: "normal",
              mainsnak: {
                snaktype: "value",
                datavalue: {
                  type: "quantity",
                  value: { amount: "+1800000" },
                },
              },
              qualifiers: {
                P585: [
                  { datavalue: { value: { time: "+2024-01-01T00:00:00Z" } } },
                ],
              },
            },
            {
              rank: "normal",
              mainsnak: {
                snaktype: "value",
                datavalue: {
                  type: "quantity",
                  value: { amount: "+1500000" },
                },
              },
              qualifiers: {
                P585: [
                  { datavalue: { value: { time: "+2000-01-01T00:00:00Z" } } },
                ],
              },
            },
          ],
        },
      },
    });

    expect(entity?.clues.find((clue) => clue.key === "population")?.value).toBe(
      "1.8 million",
    );
  });

  it("uses euro instead of a Wikidata ID when its English label is missing", () => {
    const entity = categoryDefinitions.countries.normalize({
      ...countrySourceFixture,
      qid: "Q211",
      label: "Latvia",
      wikipediaTitle: "Latvia",
      claims: {
        ...countrySourceFixture.claims,
        P38: [{ type: "entity", id: "Q4916", label: null }],
      },
    });

    expect(entity?.clues.find((clue) => clue.key === "currency")?.value).toBe(
      "euro",
    );
  });

  it("builds a playable city entity", () => {
    const entity = categoryDefinitions.cities.normalize(citySourceFixture);
    expect(entity?.canonicalAnswer).toBe("Budapest");
    expect(entity?.clues[0]?.label).toBe("Continent");
    expect(entity?.clues.some((c) => c.label === "Famous location")).toBe(true);
    expect(entity?.clues.some((c) => c.label === "Founded")).toBe(false);

    const blurredClues = entity?.clues.filter(
      (c) => c.mode === "blurred-lines",
    );
    expect(blurredClues).toHaveLength(2);
    expect(blurredClues?.some((c) => c.label === "Mayor")).toBe(true);
    expect(blurredClues?.some((c) => c.label === "GDP per capita")).toBe(true);
    expect(entity?.clues.some((c) => c.spoilerLevel === "late")).toBe(false);
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
