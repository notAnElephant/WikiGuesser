import { geoArea, geoContains, geoMercator, geoStream } from "d3-geo";
import type { Feature, Geometry } from "geojson";
import { zoomIdentity } from "d3-zoom";
import { describe, expect, it } from "vitest";

import {
  getFocusedMapTransform,
  getLastGuessedCountry,
  getNearestWorldX,
  getResizedMapTransform,
  getVisibleWorldCopies,
} from "@/src/components/game-shell/world-map-dialog";
import {
  COUNTRY_DATA,
  getAntimeridianCountryBorder,
  getCountriesWithoutMapCoverage,
  getMapCountryNames,
  getPlayableCountriesByMapName,
  hasMapGeometry,
} from "@/src/lib/game/world-map-data";
import { PACIFIC_REGIONS } from "@/src/lib/game/pacific-regions";
import type { NormalizedEntity } from "@/src/lib/types";
import microstateMap from "@/src/lib/game/microstate-map.json";
import { gzipSync } from "node:zlib";

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

  it("includes detailed outlines for every microstate without shipping a detailed world map", () => {
    expect(microstateMap.features).toHaveLength(25);
    for (const country of microstateMap.features) {
      expect(hasMapGeometry([country.properties.name])).toBe(true);
      const area = geoArea(country as Feature<Geometry>);
      expect(area).toBeGreaterThan(0);
      expect(area).toBeLessThan(0.001);
    }
    expect(hasMapGeometry(["Tuvalu"])).toBe(true);
    expect(gzipSync(JSON.stringify(microstateMap)).byteLength).toBeLessThan(
      40_000,
    );
  });

  it("accepts a coordinate marker when a country has no polygon", () => {
    expect(
      getCountriesWithoutMapCoverage([
        country("Missing geometry", ["Missing geometry"], {
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

  it("matches playable country names to differently named map regions", () => {
    const mapNamesByCountry = new Map([
      ["Cape Verde", "Cabo Verde"],
      ["Central African Republic", "Central African Rep."],
      ["Czech Republic", "Czechia"],
      ["Dominican Republic", "Dominican Rep."],
      ["Equatorial Guinea", "Eq. Guinea"],
      ["Federated States of Micronesia", "Micronesia"],
      ["Ivory Coast", "Côte d'Ivoire"],
      ["Marshall Islands", "Marshall Is."],
      ["North Macedonia", "Macedonia"],
      ["People's Republic of China", "China"],
      ["Saint Kitts and Nevis", "St. Kitts and Nevis"],
      ["Saint Vincent and the Grenadines", "St. Vin. and Gren."],
      ["Solomon Islands", "Solomon Is."],
      ["South Sudan", "S. Sudan"],
      ["The Bahamas", "Bahamas"],
      ["The Gambia", "Gambia"],
      ["United States", "United States of America"],
      ["Vatican City", "Vatican"],
    ]);
    const playableCountries = getPlayableCountriesByMapName([
      ...mapNamesByCountry.keys(),
    ]);

    for (const [country, mapName] of mapNamesByCountry) {
      const normalizedMapName = [...getMapCountryNames([mapName])][0];
      expect(playableCountries.get(normalizedMapName)).toBe(country);
      expect(hasMapGeometry([country])).toBe(true);
    }

    expect(playableCountries.has("siachen glacier")).toBe(false);
  });
});

describe("Pacific map regions", () => {
  const regions = PACIFIC_REGIONS.features;
  const playableRegions = regions.filter(({ properties }) => properties.anchor);

  it("encloses the land and arrow anchor of each playable Pacific country", () => {
    expect(playableRegions).toHaveLength(11);
    for (const region of playableRegions) {
      const { anchor, countryId } = region.properties;
      expect(
        regions.filter((candidate) => geoContains(candidate, anchor!)),
      ).toEqual([region]);
      const country = COUNTRY_DATA.features.find(({ id }) => id === countryId);
      const geometry = country?.geometry;
      if (geometry?.type !== "Polygon" && geometry?.type !== "MultiPolygon")
        throw new Error(`Expected island polygons for ${countryId}`);
      const polygons =
        geometry.type === "Polygon"
          ? [geometry.coordinates]
          : geometry.coordinates;
      for (const [shoreline] of polygons) {
        for (const [longitude, latitude] of shoreline) {
          expect(geoContains(region, [longitude, latitude])).toBe(true);
        }
      }
    }
  });

  it("connects Kiribati across the seam and keeps Tutuila in American Samoa", () => {
    const kiribati = regions.find(
      (region) => region.properties.name === "Kiribati",
    )!;
    expect(kiribati.geometry.coordinates).toHaveLength(1);
    expect(geoContains(kiribati, [179.9, 0])).toBe(true);
    expect(geoContains(kiribati, [-179.9, 0])).toBe(true);
    expect(
      regions
        .filter((region) => geoContains(region, [-170.7, -14.3]))
        .map((region) => region.properties.name),
    ).toEqual(["American Samoa"]);
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

  it("preserves the horizontal world copy through a resize", () => {
    const previousMapSize = { width: 390, height: 240 };
    const mapSize = { width: 390, height: 760 };
    const previousProjection = geoMercator().scale(60);
    const projection = geoMercator().scale(90);
    const location: [number, number] = [-157.4, 1.9];
    const previousPoint = previousProjection(location)!;
    const previousWorldX =
      previousPoint[0] + 4 * Math.PI * previousProjection.scale();
    const currentTransform = zoomIdentity
      .translate(previousMapSize.width / 2, previousMapSize.height / 2)
      .scale(6)
      .translate(-previousWorldX, -previousPoint[1]);
    const resized = getResizedMapTransform({
      currentTransform,
      mapSize,
      previousMapSize,
      previousProjection,
      projection,
    })!;
    const point = projection(location)!;
    expect(
      resized.applyX(point[0] + 4 * Math.PI * projection.scale()),
    ).toBeCloseTo(mapSize.width / 2);
    expect(resized.applyY(point[1])).toBeCloseTo(mapSize.height / 2);
  });
});

describe("horizontal map wrapping", () => {
  it.each(["Russia", "Fiji"])(
    "keeps the coastline of %s without drawing down the seam",
    (name) => {
      const geometry = COUNTRY_DATA.features.find(
        (country) => country.properties.name === name,
      )!.geometry;
      const projection = geoMercator().scale(1).translate([0, 0]);
      const seamEdges = (shape: Geometry) => {
        let previous: [number, number] | undefined;
        let count = 0;
        geoStream(
          shape,
          projection.stream({
            point(x, y) {
              if (
                previous &&
                Math.abs(Math.abs(x) - Math.PI) < 1e-8 &&
                Math.abs(x - previous[0]) < 1e-8 &&
                // Ignore the subpixel nudge d3 applies at exact clipping points.
                Math.abs(y - previous[1]) > 0.00001
              )
                count++;
              previous = [x, y];
            },
            lineStart() {
              previous = undefined;
            },
            lineEnd() {},
            polygonStart() {},
            polygonEnd() {},
            sphere() {},
          }),
        );
        return count;
      };
      expect(seamEdges(geometry)).toBeGreaterThan(0);
      const border = getAntimeridianCountryBorder(geometry)!;
      expect(border.coordinates.length).toBeGreaterThan(0);
      expect(seamEdges(border)).toBe(0);
    },
  );

  it("draws the two adjacent copies at either seam and one within a world", () => {
    expect(getVisibleWorldCopies(-20, 40, 0, 360)).toEqual([-1, 0]);
    expect(getVisibleWorldCopies(330, 390, 0, 360)).toEqual([0, 1]);
    expect(getVisibleWorldCopies(770, 810, 0, 360)).toEqual([2]);
  });

  it("finds the closest equivalent longitude in either direction", () => {
    expect(getNearestWorldX(350, 10, 360)).toBe(-10);
    expect(getNearestWorldX(15, 710, 360)).toBe(735);
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
