import { geoMercator } from "d3-geo";
import { zoomIdentity } from "d3-zoom";
import { describe, expect, it } from "vitest";

import {
  getFocusedMapTransform,
  getLastGuessedCountry,
  getResizedMapTransform,
} from "@/src/components/game-shell/world-map-dialog";
import {
  getCountriesWithoutMapCoverage,
  getMapCountryNames,
  getPlayableCountriesByMapName,
  hasMapGeometry,
} from "@/src/lib/game/world-map-data";
import type { NormalizedEntity } from "@/src/lib/types";

function country(
  canonicalAnswer: string,
  acceptedAnswers: string[],
  metadata: NormalizedEntity["metadata"],
): NormalizedEntity {
  return {
    id: canonicalAnswer,
    qid: canonicalAnswer,
    category: "countries",
    canonicalAnswer,
    wikipediaTitle: null,
    acceptedAnswers: acceptedAnswers.map((value) => ({
      kind: "canonical",
      value,
      normalized: value,
    })),
    clues: [],
    metadata,
    sourceFingerprint: canonicalAnswer,
  };
}

describe("world map coverage", () => {
  it("keeps the two Congo countries on their own polygons", () => {
    expect(
      getMapCountryNames([
        "Democratic Republic of the Congo",
        "DR Congo",
        "Congo",
      ]),
    ).toEqual(new Set(["dem rep congo"]));
    expect(getMapCountryNames(["Republic of the Congo", "Congo"])).toEqual(
      new Set(["congo"]),
    );
  });

  it("includes São Tomé and Príncipe in the map geometry", () => {
    expect(hasMapGeometry(["São Tomé and Príncipe"])).toBe(true);
  });

  it("accepts a coordinate marker when a country has no polygon", () => {
    expect(
      getCountriesWithoutMapCoverage([
        country("Tuvalu", ["Tuvalu"], {
          centroidLatitude: -7.11,
          centroidLongitude: 177.65,
        }),
      ]),
    ).toEqual([]);
  });

  it("reports countries that have neither geometry nor a marker", () => {
    expect(
      getCountriesWithoutMapCoverage([
        country("Missing country", ["Missing country"], {}),
      ]).map((entity) => entity.canonicalAnswer),
    ).toEqual(["Missing country"]);
  });

  it("maps only listed countries to clickable geometry", () => {
    const playableCountries = getPlayableCountriesByMapName(["France"]);

    expect(playableCountries.get("france")).toBe("France");
    expect(playableCountries.has("siachen glacier")).toBe(false);
  });
});

describe("getResizedMapTransform", () => {
  it("keeps the same geographic point centered through a map resize", () => {
    const geographicCenter: [number, number] = [19.82, 41.33];
    const previousMapSize = { width: 390, height: 240 };
    const mapSize = { width: 390, height: 760 };
    const previousProjection = geoMercator()
      .scale(72)
      .translate([previousMapSize.width / 2, previousMapSize.height / 2]);
    const projection = geoMercator()
      .scale(96)
      .translate([mapSize.width / 2, mapSize.height / 2]);
    const previousProjectedCenter = previousProjection(geographicCenter);

    expect(previousProjectedCenter).not.toBeNull();

    const currentTransform = zoomIdentity
      .translate(previousMapSize.width / 2, previousMapSize.height / 2)
      .scale(3)
      .translate(-previousProjectedCenter![0], -previousProjectedCenter![1]);
    const resizedTransform = getResizedMapTransform({
      currentTransform,
      mapSize,
      previousMapSize,
      previousProjection,
      projection,
    });
    const nextProjectedCenter = projection(geographicCenter);

    expect(resizedTransform).not.toBeNull();
    expect(nextProjectedCenter).not.toBeNull();
    expect(resizedTransform!.apply(nextProjectedCenter!)[0]).toBeCloseTo(
      mapSize.width / 2,
    );
    expect(resizedTransform!.apply(nextProjectedCenter!)[1]).toBeCloseTo(
      mapSize.height / 2,
    );
    expect(resizedTransform!.k * projection.scale()).toBeCloseTo(
      currentTransform.k * previousProjection.scale(),
    );
  });
});

describe("getFocusedMapTransform", () => {
  it("centers the requested country coordinates", () => {
    const mapSize = { width: 390, height: 240 };
    const location = { latitude: 0.19, longitude: 6.61 };
    const projection = geoMercator()
      .scale(72)
      .translate([mapSize.width / 2, mapSize.height / 2]);
    const point = projection([location.longitude, location.latitude]);
    const transform = getFocusedMapTransform({
      location,
      mapSize,
      projection,
    });

    expect(point).not.toBeNull();
    expect(transform).not.toBeNull();
    expect(transform!.apply(point!)).toEqual([
      mapSize.width / 2,
      mapSize.height / 2,
    ]);
  });
});

describe("getLastGuessedCountry", () => {
  it("selects only the newest guess for automatic map focus", () => {
    const guesses = [
      {
        qid: "Q142",
        name: "France",
        mapNames: ["France"],
        latitude: 46.23,
        longitude: 2.21,
        direction: "east" as const,
      },
      {
        qid: "Q183",
        name: "Germany",
        mapNames: ["Germany"],
        latitude: 51.17,
        longitude: 10.45,
        direction: "west" as const,
      },
    ];

    expect(getLastGuessedCountry(guesses)).toBe(guesses[1]);
    expect(getLastGuessedCountry([])).toBeNull();
  });
});
