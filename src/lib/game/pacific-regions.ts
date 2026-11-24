import type { FeatureCollection, MultiPolygon } from "geojson";
import { normalizeGuess } from "./answer-matching";
import regions from "./pacific-island-groups.json";

// Geometry adapted from SaskWikiMaestro's CC0 Pacific Islands map.
export const PACIFIC_REGIONS_SOURCE =
  "https://commons.wikimedia.org/wiki/File:Map_of_the_Pacific_Islands.svg";

export const PACIFIC_REGIONS = regions as FeatureCollection<
  MultiPolygon,
  { countryId: string; name: string; anchor: [number, number] | null }
>;

const anchors = new Map(
  PACIFIC_REGIONS.features.map(({ properties }) => [
    normalizeGuess(properties.name),
    properties.anchor,
  ]),
);

export function getPacificRegionAnchor(name: string) {
  const normalizedName = normalizeGuess(name);
  const anchor = anchors.get(
    normalizedName === "micronesia"
      ? "federated states of micronesia"
      : normalizedName,
  );
  return anchor ? { longitude: anchor[0], latitude: anchor[1] } : null;
}
