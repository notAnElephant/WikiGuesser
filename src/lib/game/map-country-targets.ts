import {
  geoArea,
  geoCentroid,
  geoContains,
  type GeoPath,
  type GeoProjection,
} from "d3-geo";
import type { Feature, Geometry, Polygon } from "geojson";

export const COUNTRY_TOUCH_TARGET_SIZE = 44;

export function getCountryTargetGeometry(
  country: Feature<Geometry>,
  path: GeoPath,
  projection: GeoProjection,
) {
  const geometry = country.geometry;
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")
    return null;

  // Ocean between islands must not count as tappable land.
  const land: Polygon =
    geometry.type === "Polygon"
      ? geometry
      : geometry.coordinates.reduce<Polygon>(
          (largest, coordinates) => {
            const polygon: Polygon = { type: "Polygon", coordinates };
            return geoArea(polygon) > geoArea(largest) ? polygon : largest;
          },
          { type: "Polygon", coordinates: [] },
        );
  const centroid = geoCentroid(land);
  const location = geoContains(land, centroid)
    ? centroid
    : land.coordinates[0]?.[0];
  if (!location) return null;
  const point = projection([location[0], location[1]]);
  if (!point) return null;
  const [[left, top], [right, bottom]] = path.bounds(land);
  const size = Math.min(right - left, bottom - top, Math.sqrt(path.area(land)));
  if (!Number.isFinite(size)) return null;
  return { point, size };
}

export function getCountryMarkerOpacity(size: number) {
  return Math.max(0, Math.min(1, (8 - size) / 4));
}

export function getOverlappingMapTargets<T extends { point: [number, number] }>(
  targets: readonly T[],
  point: [number, number],
  targetSize = COUNTRY_TOUCH_TARGET_SIZE,
) {
  const radius = targetSize / 2;
  return targets.filter(
    (target) =>
      Math.abs(target.point[0] - point[0]) <= radius &&
      Math.abs(target.point[1] - point[1]) <= radius,
  );
}
