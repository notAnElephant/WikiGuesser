import { geoContains, geoMercator, geoPath } from "d3-geo";
import type { Feature, MultiPolygon } from "geojson";
import { describe, expect, it } from "vitest";
import {
  COUNTRY_TOUCH_TARGET_SIZE,
  getCountryMarkerOpacity,
  getCountryTargetGeometry,
  getOverlappingMapTargets,
} from "@/src/lib/game/map-country-targets";
import { COUNTRY_DATA } from "@/src/lib/game/world-map-data";

describe("small-country map targets", () => {
  const projection = geoMercator().scale(100);
  const path = geoPath(projection);

  it("anchors Tuvalu's marker on actual land and keeps it visible at world scale", () => {
    const country = COUNTRY_DATA.features.find(
      (country) => country.properties.name === "Tuvalu",
    )!;
    const target = getCountryTargetGeometry(country, path, projection)!;
    expect(geoContains(country, projection.invert!(target.point)!)).toBe(true);
    expect(getCountryMarkerOpacity(target.size)).toBe(1);
    expect(target.size).toBeLessThan(COUNTRY_TOUCH_TARGET_SIZE);
  });

  it("measures an island's land instead of the ocean between islands", () => {
    const country: Feature<MultiPolygon> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
          [
            [
              [100, 0],
              [100, 0.1],
              [100.1, 0.1],
              [100.1, 0],
              [100, 0],
            ],
          ],
        ],
      },
    };
    const target = getCountryTargetGeometry(country, path, projection)!;
    expect(
      path.bounds(country)[1][0] - path.bounds(country)[0][0],
    ).toBeGreaterThan(100);
    expect(target.size).toBeLessThan(2);
    expect(projection.invert!(target.point)![0]).toBeCloseTo(0.5, 1);
    expect(getCountryMarkerOpacity(target.size * 100)).toBe(0);
  });

  it("returns every overlapping 44-pixel target rather than choosing one arbitrarily", () => {
    const targets = [
      { name: "Monaco", point: [100, 100] as [number, number] },
      { name: "San Marino", point: [120, 105] as [number, number] },
      { name: "Tuvalu", point: [300, 100] as [number, number] },
    ];
    expect(
      getOverlappingMapTargets(targets, [110, 100]).map(
        (target) => target.name,
      ),
    ).toEqual(["Monaco", "San Marino"]);
    expect(getOverlappingMapTargets(targets, [278, 100])).toEqual([targets[2]]);
    expect(getOverlappingMapTargets(targets, [277, 100])).toEqual([]);
    expect(getOverlappingMapTargets(targets, [100, 100], 12)).toEqual([
      targets[0],
    ]);
  });
});
