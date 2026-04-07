import type { MaterializedSnapshot } from "@/src/lib/types";
import { hashString } from "@/src/lib/utils/hash";

const now = "2026-04-07T12:00:00.000Z";

export const demoSnapshot: MaterializedSnapshot = {
  key: "demo-snapshot",
  sourceFingerprint: hashString("demo-snapshot"),
  createdAt: now,
  entities: [
    {
      id: "countries-france",
      qid: "Q142",
      category: "countries",
      canonicalAnswer: "France",
      wikipediaTitle: "France",
      acceptedAnswers: [
        { kind: "canonical", value: "France", normalized: "france" },
        { kind: "wikipedia-title", value: "French Republic", normalized: "french republic" },
      ],
      clues: [
        { key: "area", label: "Area", value: "551,695 km²", difficulty: 1, spoilerLevel: "safe" },
        { key: "population", label: "Population", value: "68.4 million", difficulty: 2, spoilerLevel: "safe" },
        { key: "currency", label: "Currency", value: "Euro", difficulty: 3, spoilerLevel: "safe" },
        { key: "language", label: "Official language", value: "French", difficulty: 4, spoilerLevel: "safe" },
        { key: "timezone", label: "Time zone", value: "UTC+01:00", difficulty: 5, spoilerLevel: "safe" },
        { key: "capital", label: "Capital", value: "Paris", difficulty: 6, spoilerLevel: "late" },
      ],
      metadata: {
        clueCount: 6,
      },
      sourceFingerprint: hashString("Q142"),
    },
    {
      id: "countries-japan",
      qid: "Q17",
      category: "countries",
      canonicalAnswer: "Japan",
      wikipediaTitle: "Japan",
      acceptedAnswers: [
        { kind: "canonical", value: "Japan", normalized: "japan" },
        { kind: "alias", value: "Nippon", normalized: "nippon" },
        { kind: "alias", value: "Nihon", normalized: "nihon" },
      ],
      clues: [
        { key: "area", label: "Area", value: "377,975 km²", difficulty: 1, spoilerLevel: "safe" },
        { key: "population", label: "Population", value: "124 million", difficulty: 2, spoilerLevel: "safe" },
        { key: "currency", label: "Currency", value: "Japanese yen", difficulty: 3, spoilerLevel: "safe" },
        { key: "timezone", label: "Time zone", value: "UTC+09:00", difficulty: 4, spoilerLevel: "safe" },
        { key: "language", label: "Official language", value: "Japanese", difficulty: 5, spoilerLevel: "safe" },
        { key: "capital", label: "Capital", value: "Tokyo", difficulty: 6, spoilerLevel: "late" },
      ],
      metadata: {
        clueCount: 6,
      },
      sourceFingerprint: hashString("Q17"),
    },
    {
      id: "cities-budapest",
      qid: "Q1781",
      category: "cities",
      canonicalAnswer: "Budapest",
      wikipediaTitle: "Budapest",
      acceptedAnswers: [{ kind: "canonical", value: "Budapest", normalized: "budapest" }],
      clues: [
        { key: "country", label: "Country", value: "Hungary", difficulty: 1, spoilerLevel: "safe" },
        { key: "admin-region", label: "Administrative region", value: "Central Hungary", difficulty: 2, spoilerLevel: "safe" },
        { key: "population", label: "Population", value: "1.7 million", difficulty: 3, spoilerLevel: "safe" },
        { key: "area", label: "Area", value: "525.2 km²", difficulty: 4, spoilerLevel: "safe" },
        { key: "timezone", label: "Time zone", value: "UTC+01:00", difficulty: 5, spoilerLevel: "safe" },
        { key: "founded", label: "Founded", value: "1873", difficulty: 6, spoilerLevel: "late" },
      ],
      metadata: {
        clueCount: 6,
      },
      sourceFingerprint: hashString("Q1781"),
    },
    {
      id: "cities-nairobi",
      qid: "Q3870",
      category: "cities",
      canonicalAnswer: "Nairobi",
      wikipediaTitle: "Nairobi",
      acceptedAnswers: [{ kind: "canonical", value: "Nairobi", normalized: "nairobi" }],
      clues: [
        { key: "country", label: "Country", value: "Kenya", difficulty: 1, spoilerLevel: "safe" },
        { key: "admin-region", label: "Administrative region", value: "Nairobi County", difficulty: 2, spoilerLevel: "safe" },
        { key: "population", label: "Population", value: "4.4 million", difficulty: 3, spoilerLevel: "safe" },
        { key: "elevation", label: "Elevation", value: "1,795 m", difficulty: 4, spoilerLevel: "safe" },
        { key: "timezone", label: "Time zone", value: "UTC+03:00", difficulty: 5, spoilerLevel: "safe" },
        { key: "founded", label: "Founded", value: "1899", difficulty: 6, spoilerLevel: "late" },
      ],
      metadata: {
        clueCount: 6,
      },
      sourceFingerprint: hashString("Q3870"),
    },
    {
      id: "people-marie-curie",
      qid: "Q7186",
      category: "people",
      canonicalAnswer: "Marie Curie",
      wikipediaTitle: "Marie Curie",
      acceptedAnswers: [
        { kind: "canonical", value: "Marie Curie", normalized: "marie curie" },
        { kind: "alias", value: "Maria Skłodowska-Curie", normalized: "maria sklodowska curie" },
      ],
      clues: [
        { key: "occupation", label: "Occupation", value: "Physicist and chemist", difficulty: 1, spoilerLevel: "safe" },
        { key: "citizenship", label: "Citizenship", value: "Poland and France", difficulty: 2, spoilerLevel: "safe" },
        { key: "birth-decade", label: "Birth decade", value: "1860s", difficulty: 3, spoilerLevel: "safe" },
        { key: "field", label: "Field", value: "Radioactivity", difficulty: 4, spoilerLevel: "safe" },
        { key: "education", label: "Education", value: "University of Paris", difficulty: 5, spoilerLevel: "safe" },
        { key: "award", label: "Award", value: "Nobel Prize in Physics", difficulty: 6, spoilerLevel: "late" },
      ],
      metadata: {
        clueCount: 6,
      },
      sourceFingerprint: hashString("Q7186"),
    },
    {
      id: "people-hayao-miyazaki",
      qid: "Q55466",
      category: "people",
      canonicalAnswer: "Hayao Miyazaki",
      wikipediaTitle: "Hayao Miyazaki",
      acceptedAnswers: [{ kind: "canonical", value: "Hayao Miyazaki", normalized: "hayao miyazaki" }],
      clues: [
        { key: "occupation", label: "Occupation", value: "Animator, filmmaker, manga artist", difficulty: 1, spoilerLevel: "safe" },
        { key: "citizenship", label: "Citizenship", value: "Japan", difficulty: 2, spoilerLevel: "safe" },
        { key: "birth-decade", label: "Birth decade", value: "1940s", difficulty: 3, spoilerLevel: "safe" },
        { key: "field", label: "Field", value: "Animation", difficulty: 4, spoilerLevel: "safe" },
        { key: "education", label: "Education", value: "Gakushuin University", difficulty: 5, spoilerLevel: "safe" },
        { key: "award", label: "Award", value: "Academy Honorary Award", difficulty: 6, spoilerLevel: "late" },
      ],
      metadata: {
        clueCount: 6,
      },
      sourceFingerprint: hashString("Q55466"),
    },
  ],
};
