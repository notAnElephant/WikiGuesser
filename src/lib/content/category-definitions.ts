import type { CategoryDefinition } from "@/src/lib/types";
import {
  buildNormalizedEntity,
  createClue,
  formatAreaSquareKilometers,
  formatBirthDecade,
  formatElevationMeters,
  formatList,
  formatPopulation,
  formatYear,
  getEntityLabels,
  getFirstQuantity,
  getFirstTimeValue,
} from "@/src/lib/content/source-helpers";

const countriesQuery = `
SELECT DISTINCT ?item WHERE {
  ?item wdt:P31/wdt:P279* wd:Q6256.
  ?article schema:about ?item;
           schema:isPartOf <https://en.wikipedia.org/>.
}
LIMIT __LIMIT__
`;

const citiesQuery = `
SELECT DISTINCT ?item WHERE {
  ?item wdt:P31/wdt:P279* wd:Q515.
  ?article schema:about ?item;
           schema:isPartOf <https://en.wikipedia.org/>.
}
LIMIT __LIMIT__
`;

const peopleQuery = `
SELECT DISTINCT ?item WHERE {
  ?item wdt:P31 wd:Q5.
  ?article schema:about ?item;
           schema:isPartOf <https://en.wikipedia.org/>.
}
LIMIT __LIMIT__
`;

export const categoryDefinitions: Record<CategoryDefinition["id"], CategoryDefinition> = {
  countries: {
    id: "countries",
    label: "Countries",
    description: "Structured country facts with capital revealed late.",
    discovery: {
      type: "sparql",
      query: countriesQuery,
    },
    requiredMinimumClues: 5,
    allowedProperties: ["P2046", "P1082", "P38", "P421", "P37", "P36"],
    lateRevealProperties: ["P36"],
    bannedProperties: ["P41", "P94"],
    clueOrder: ["P2046", "P1082", "P38", "P421", "P37", "P36"],
    aliasStrategy: {
      includeWikipediaTitle: true,
      includeRedirects: true,
      stripParenthetical: true,
    },
    normalize(source, options) {
      return buildNormalizedEntity({
        source,
        category: "countries",
        minimumClues: 5,
        redirectAliases: options?.redirectAliases,
        clues: [
          createClue("area", "Area", formatAreaSquareKilometers(getFirstQuantity(source, "P2046")), 1),
          createClue("population", "Population", formatPopulation(getFirstQuantity(source, "P1082")), 2),
          createClue("currency", "Currency", formatList(getEntityLabels(source, "P38")), 3),
          createClue("timezone", "Time zone", formatList(getEntityLabels(source, "P421")), 4),
          createClue("language", "Official language", formatList(getEntityLabels(source, "P37")), 5),
          createClue("capital", "Capital", formatList(getEntityLabels(source, "P36"), 1), 6, "late"),
        ],
      });
    },
  },
  cities: {
    id: "cities",
    label: "Cities",
    description: "City rounds focused on region, scale, and geography before founded dates.",
    discovery: {
      type: "sparql",
      query: citiesQuery,
    },
    requiredMinimumClues: 5,
    allowedProperties: ["P17", "P131", "P1082", "P2046", "P2044", "P421", "P571"],
    lateRevealProperties: ["P571"],
    bannedProperties: ["P18", "P242"],
    clueOrder: ["P17", "P131", "P1082", "P2046", "P2044", "P421", "P571"],
    aliasStrategy: {
      includeWikipediaTitle: true,
      includeRedirects: true,
      stripParenthetical: true,
    },
    normalize(source, options) {
      return buildNormalizedEntity({
        source,
        category: "cities",
        minimumClues: 5,
        redirectAliases: options?.redirectAliases,
        clues: [
          createClue("country", "Country", formatList(getEntityLabels(source, "P17"), 1), 1),
          createClue("admin-region", "Administrative region", formatList(getEntityLabels(source, "P131"), 1), 2),
          createClue("population", "Population", formatPopulation(getFirstQuantity(source, "P1082")), 3),
          createClue("area", "Area", formatAreaSquareKilometers(getFirstQuantity(source, "P2046")), 4),
          createClue("elevation", "Elevation", formatElevationMeters(getFirstQuantity(source, "P2044")), 5),
          createClue("timezone", "Time zone", formatList(getEntityLabels(source, "P421"), 1), 6),
          createClue("founded", "Founded", formatYear(getFirstTimeValue(source, "P571")), 7, "late"),
        ],
      });
    },
  },
  people: {
    id: "people",
    label: "People",
    description: "People rounds curated to avoid instant giveaways and weak clue sets.",
    discovery: {
      type: "sparql",
      query: peopleQuery,
    },
    requiredMinimumClues: 5,
    allowedProperties: ["P106", "P27", "P569", "P101", "P166", "P69"],
    lateRevealProperties: ["P166"],
    bannedProperties: ["P18", "P19", "P734", "P735"],
    clueOrder: ["P106", "P27", "P569", "P101", "P69", "P166"],
    aliasStrategy: {
      includeWikipediaTitle: true,
      includeRedirects: true,
      stripParenthetical: true,
    },
    normalize(source, options) {
      return buildNormalizedEntity({
        source,
        category: "people",
        minimumClues: 5,
        redirectAliases: options?.redirectAliases,
        clues: [
          createClue("occupation", "Occupation", formatList(getEntityLabels(source, "P106")), 1),
          createClue("citizenship", "Citizenship", formatList(getEntityLabels(source, "P27")), 2),
          createClue("birth-decade", "Birth decade", formatBirthDecade(getFirstTimeValue(source, "P569")), 3),
          createClue("field", "Field", formatList(getEntityLabels(source, "P101")), 4),
          createClue("education", "Education", formatList(getEntityLabels(source, "P69")), 5),
          createClue("award", "Award", formatList(getEntityLabels(source, "P166"), 1), 6, "late"),
        ],
      });
    },
  },
};

export const allCategoryDefinitions = Object.values(categoryDefinitions);
