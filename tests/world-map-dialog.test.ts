import { geoMercator } from "d3-geo";
import { zoomIdentity } from "d3-zoom";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  getFocusedMapTransform,
  getResizedMapTransform,
  WorldMapDialog,
} from "@/src/components/game-shell/world-map-dialog";
import {
  getCountriesWithoutMapCoverage,
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

describe("result world map", () => {
  it("omits map controls while preserving the interactive map canvas", () => {
    const markup = renderToStaticMarkup(
      createElement(WorldMapDialog, {
        guessedCountries: [],
        isExpanded: false,
        onExpandedChange: () => undefined,
        presentation: "result",
        solutionCountry: {
          qid: "Q55",
          name: "Netherlands",
          mapNames: ["Netherlands"],
          latitude: 52.13,
          longitude: 5.29,
        },
      }),
    );

    expect(markup).toContain('role="application"');
    expect(markup).not.toContain("Zoom in");
    expect(markup).not.toContain("Reset map zoom");
    expect(markup).not.toContain("Expand world map");
  });

  it("keeps result-map controls separate from its country labels", () => {
    const markup = renderToStaticMarkup(
      createElement(WorldMapDialog, {
        guessedCountries: [
          {
            qid: "Q142",
            name: "France",
            mapNames: ["France"],
            latitude: 46.23,
            longitude: 2.21,
            direction: "south",
          },
        ],
        isExpanded: false,
        onExpandedChange: () => undefined,
        presentation: "result",
        solutionCountry: {
          qid: "Q55",
          name: "Netherlands",
          mapNames: ["Netherlands"],
          latitude: 52.13,
          longitude: 5.29,
        },
      }),
    );

    expect(markup).not.toContain('aria-label="Zoom in"');
    expect(markup).not.toContain('aria-label="Focus France"');
  });
});

describe("game world map drawer", () => {
  it("renders a compact control when the map drawer is hidden", () => {
    const markup = renderToStaticMarkup(
      createElement(WorldMapDialog, {
        drawerState: "hidden",
        guessedCountries: [],
        isExpanded: false,
        onDrawerStateChange: () => undefined,
        onExpandedChange: () => undefined,
      }),
    );

    expect(markup).toContain('aria-label="Show world map"');
    expect(markup).not.toContain('role="application"');
  });

  it("uses the top handle to expand the medium drawer", () => {
    const markup = renderToStaticMarkup(
      createElement(WorldMapDialog, {
        drawerState: "medium",
        guessedCountries: [],
        isExpanded: false,
        onDrawerStateChange: () => undefined,
        onExpandedChange: () => undefined,
      }),
    );

    expect(markup).toContain('aria-label="Expand world map"');
    expect(markup).toContain('aria-label="Hide world map"');
  });
});
