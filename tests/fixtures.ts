import type { SourceEntity } from "@/src/lib/types";

export const countrySourceFixture: SourceEntity = {
  qid: "Q142",
  label: "France",
  description: "country in Western Europe",
  wikipediaTitle: "France",
  aliases: ["French Republic"],
  claims: {
    P2046: [{ type: "quantity", amount: 551695, unit: "km²" }],
    P1082: [{ type: "quantity", amount: 68400000, unit: null }],
    P421: [{ type: "entity", id: "Q6655", label: "UTC+01:00" }],
    P37: [{ type: "entity", id: "Q150", label: "French" }],
    P36: [{ type: "entity", id: "Q90", label: "Paris" }],
    P625: [{ type: "coordinate", latitude: 46.2276, longitude: 2.2137, precision: 0.1 }],
  },
  raw: {},
};

export const citySourceFixture: SourceEntity = {
  qid: "Q1781",
  label: "Budapest",
  description: "capital city of Hungary",
  wikipediaTitle: "Budapest",
  aliases: [],
  claims: {
    P17: [{ type: "entity", id: "Q28", label: "Hungary" }],
    P131: [{ type: "entity", id: "Q27509", label: "Central Hungary" }],
    P1082: [{ type: "quantity", amount: 1730000, unit: null }],
    P2046: [{ type: "quantity", amount: 525.2, unit: "km²" }],
    P2044: [{ type: "quantity", amount: 102, unit: "m" }],
    P421: [{ type: "entity", id: "Q6655", label: "UTC+01:00" }],
    P571: [{ type: "time", value: "+1873-11-17T00:00:00Z", precision: 11 }],
  },
  raw: {},
};

export const personSourceFixture: SourceEntity = {
  qid: "Q7186",
  label: "Marie Curie",
  description: "Polish and naturalized-French physicist and chemist",
  wikipediaTitle: "Marie Curie",
  aliases: ["Maria Skłodowska-Curie"],
  claims: {
    P106: [
      { type: "entity", id: "Q169470", label: "physicist" },
      { type: "entity", id: "Q593644", label: "chemist" },
    ],
    P27: [
      { type: "entity", id: "Q36", label: "Poland" },
      { type: "entity", id: "Q142", label: "France" },
    ],
    P569: [{ type: "time", value: "+1867-11-07T00:00:00Z", precision: 11 }],
    P101: [{ type: "entity", id: "Q11379", label: "radioactivity" }],
    P69: [{ type: "entity", id: "Q838691", label: "University of Paris" }],
    P166: [{ type: "entity", id: "Q38104", label: "Nobel Prize in Physics" }],
  },
  raw: {},
};
