import { describe, expect, it } from "vitest";

import {
  getGuessedCountryMapData,
  getGuessDirection,
} from "@/src/lib/game/guess-direction";
import type { NormalizedEntity } from "@/src/lib/types";

function country(
  canonicalAnswer: string,
  latitude: number,
  longitude: number,
): NormalizedEntity {
  return {
    id: canonicalAnswer,
    qid: canonicalAnswer,
    category: "countries",
    canonicalAnswer,
    wikipediaTitle: canonicalAnswer,
    acceptedAnswers: [
      {
        kind: "canonical",
        value: canonicalAnswer,
        normalized: canonicalAnswer.toLowerCase(),
      },
    ],
    clues: [],
    metadata: {
      centroidLatitude: latitude,
      centroidLongitude: longitude,
    },
    sourceFingerprint: canonicalAnswer,
  };
}

describe("getGuessDirection", () => {
  const goal = country("Goal", 0, 0);

  it.each([
    ["South", -10, 0, "north"],
    ["Southwest", -10, -10, "northeast"],
    ["West", 0, -10, "east"],
    ["Northwest", 10, -10, "southeast"],
    ["North", 10, 0, "south"],
    ["Northeast", 10, 10, "southwest"],
    ["East", 0, 10, "west"],
    ["Southeast", -10, 10, "northwest"],
  ])(
    "points from %s toward the goal",
    (name, latitude, longitude, expected) => {
      const guess = country(
        name as string,
        latitude as number,
        longitude as number,
      );

      expect(getGuessDirection(name as string, goal, [goal, guess])).toBe(
        expected,
      );
    },
  );

  it("returns null when the guessed country has no coordinates", () => {
    expect(getGuessDirection("Missing", goal, [goal])).toBeNull();
  });

  it("returns only the guessed country's safe map overlay data", () => {
    const france = country("France", 46.2276, 2.2137);
    france.qid = "Q142";
    france.acceptedAnswers.push({
      kind: "alias",
      value: "French Republic",
      normalized: "french republic",
    });

    expect(
      getGuessedCountryMapData("French Republic", goal, [goal, france]),
    ).toEqual({
      qid: "Q142",
      name: "France",
      mapNames: ["France", "French Republic"],
      latitude: 46.2276,
      longitude: 2.2137,
      direction: "south",
    });
  });
});
