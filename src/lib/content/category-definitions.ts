import type { CategoryDefinition, SourceEntity } from "@/src/lib/types";
import {
  buildNormalizedEntity,
  createClue,
  formatAreaSquareKilometers,
  formatBirthDecade,
  formatCurrency,
  formatDistance,
  formatElevationMeters,
  formatList,
  formatPopulation,
  formatYear,
  getDistance,
  getEntityLabels,
  getFirstCoordinate,
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
  ?country wdt:P31 wd:Q3624078;
           p:P463 ?unMembershipStatement;
           p:P36 ?capitalStatement.
  ?unMembershipStatement a wikibase:BestRank;
                         ps:P463 wd:Q1065.
  MINUS { ?unMembershipStatement pq:P582 ?membershipEnd. }
  ?capitalStatement a wikibase:BestRank;
                    ps:P36 ?item.
  MINUS { ?capitalStatement pq:P582 ?capitalEnd. }
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

function getCountryCapitalLabel(source: SourceEntity): string | null {
  const explicitCapital = formatList(getEntityLabels(source, "P36"), 1);

  if (explicitCapital) {
    return explicitCapital;
  }

  // Vatican City is a sovereign city-state and serves as its own capital.
  if (source.label === "Vatican City") {
    return source.label;
  }

  return null;
}

export const categoryDefinitions: Record<
  CategoryDefinition["id"],
  CategoryDefinition
> = {
  countries: {
    id: "countries",
    label: "Countries",
    description: "Structured country facts with capital revealed late.",
    discovery: {
      type: "sparql",
      query: countriesQuery,
    },
    requiredMinimumClues: 5,
    allowedProperties: ["P30", "P2046", "P1082", "P38", "P36", "P625"],
    lateRevealProperties: ["P36"],
    bannedProperties: ["P41", "P94"],
    clueOrder: ["P30", "P2046", "P1082", "P38", "P36"],
    aliasStrategy: {
      includeWikipediaTitle: true,
      includeRedirects: true,
      stripParenthetical: true,
    },
    normalize(source, options) {
      const coordinate = getFirstCoordinate(source, "P625");

      return buildNormalizedEntity({
        source,
        category: "countries",
        minimumClues: 5,
        redirectAliases: options?.redirectAliases,
        clues: [
          createClue(
            "continent",
            "Continent",
            formatList(getEntityLabels(source, "P30"), 1),
            1,
          ),
          createClue(
            "area",
            "Area",
            formatAreaSquareKilometers(getFirstQuantity(source, "P2046")),
            2,
          ),
          createClue(
            "population",
            "Population",
            formatPopulation(getFirstQuantity(source, "P1082")),
            3,
          ),
          createClue(
            "currency",
            "Currency",
            formatList(getEntityLabels(source, "P38"), 1),
            4,
          ),
          createClue(
            "capital",
            "Capital",
            getCountryCapitalLabel(source),
            5,
            "late",
          ),
        ],
        metadata: {
          centroidLatitude: coordinate?.latitude ?? null,
          centroidLongitude: coordinate?.longitude ?? null,
        },
      });
    },
  },
  cities: {
    id: "cities",
    label: "Cities",
    description:
      "Capital city rounds limited to current capitals of UN member states.",
    discovery: {
      type: "sparql",
      query: citiesQuery,
    },
    requiredMinimumClues: 5,
    allowedProperties: [
      "P17",
      "P131",
      "P1082",
      "P2046",
      "P2044",
      "P421",
      "P571",
      "P30",
      "P1449",
      "P625",
      "P6",
      "P2131",
      "P2226",
      "P527",
    ],
    lateRevealProperties: ["P571"],
    bannedProperties: ["P18", "P242"],
    clueOrder: [
      "P30",
      "P1082",
      "P1449",
      "closest-capital",
      "P6",
      "P2131",
      "P527",
      "P571",
    ],
    aliasStrategy: {
      includeWikipediaTitle: true,
      includeRedirects: true,
      stripParenthetical: true,
    },
    normalize(source, options) {
      const coordinate = getFirstCoordinate(source, "P625");
      let closestCapitalLabel: string | null = null;
      let closestCapitalDistance: number | null = null;

      if (coordinate && options?.allSourceEntities) {
        for (const otherSource of options.allSourceEntities) {
          if (otherSource.qid === source.qid) {
            continue;
          }

          const otherCoordinate = getFirstCoordinate(otherSource, "P625");
          if (!otherCoordinate) {
            continue;
          }

          const distance = getDistance(coordinate, otherCoordinate);
          if (closestCapitalDistance === null || distance < closestCapitalDistance) {
            closestCapitalDistance = distance;
            closestCapitalLabel = otherSource.label;
          }
        }
      }

      const gdpValue = getFirstQuantity(source, "P2131") ?? getFirstQuantity(source, "P2226");

      return buildNormalizedEntity({
        source,
        category: "cities",
        minimumClues: 4,
        minimumCluesByMode: {
          classic: 4,
        },
        redirectAliases: options?.redirectAliases,
        clues: [
          createClue(
            "continent",
            "Continent",
            formatList(getEntityLabels(source, "P30"), 1),
            1,
          ),
          createClue(
            "population",
            "Population",
            formatPopulation(getFirstQuantity(source, "P1082")),
            2,
          ),
          createClue(
            "nickname",
            "Nickname",
            formatList(getEntityLabels(source, "P1449"), 1),
            3,
          ),
          createClue(
            "closest-capital",
            "Closest capital",
            closestCapitalLabel
              ? `${closestCapitalLabel} (${formatDistance(closestCapitalDistance)})`
              : null,
            4,
          ),
          createClue(
            "gdp",
            "GDP per capita",
            formatCurrency(gdpValue),
            5,
            "safe",
            "blurred-lines",
          ),
          createClue(
            "mayor",
            "Mayor",
            formatList(getEntityLabels(source, "P6"), 1),
            6,
            "safe",
            "blurred-lines",
          ),
          createClue(
            "famous-location",
            "Famous location",
            formatList(getEntityLabels(source, "P527"), 1),
            7,
            "safe",
            "blurred-lines",
          ),
          createClue(
            "founded",
            "Founded",
            formatYear(getFirstTimeValue(source, "P571")),
            8,
            "late",
          ),
        ],
      });
    },
  },
  people: {
    id: "people",
    label: "People",
    description:
      "People rounds curated to avoid instant giveaways and weak clue sets.",
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
          createClue(
            "occupation",
            "Occupation",
            formatList(getEntityLabels(source, "P106")),
            1,
          ),
          createClue(
            "citizenship",
            "Citizenship",
            formatList(getEntityLabels(source, "P27")),
            2,
          ),
          createClue(
            "birth-decade",
            "Birth decade",
            formatBirthDecade(getFirstTimeValue(source, "P569")),
            3,
          ),
          createClue(
            "field",
            "Field",
            formatList(getEntityLabels(source, "P101")),
            4,
          ),
          createClue(
            "education",
            "Education",
            formatList(getEntityLabels(source, "P69")),
            5,
          ),
          createClue(
            "award",
            "Award",
            formatList(getEntityLabels(source, "P166"), 1),
            6,
            "late",
          ),
        ],
      });
    },
  },
};

export const allCategoryDefinitions = Object.values(categoryDefinitions);
