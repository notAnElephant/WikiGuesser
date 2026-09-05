import { normalizeGuess } from "@/src/lib/game/answer-matching";
import type { NormalizedEntity } from "@/src/lib/types";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldTopology from "world-atlas/countries-50m.json";

export interface MapCountryProperties {
  name?: string;
  normalizedName: string;
}

const MAP_NAME_ALIASES: Record<string, readonly string[]> = {
  "antigua and barbuda": ["Antigua and Barb."],
  "bosnia and herzegovina": ["Bosnia and Herz."],
};

const MAP_NAME_OVERRIDES: Record<string, readonly string[]> = {
  "democratic republic of the congo": ["Dem. Rep. Congo"],
  "republic of the congo": ["Congo"],
};

function buildCountryData(): FeatureCollection<Geometry, MapCountryProperties> {
  const topology = worldTopology as unknown as Topology;
  const countries = topology.objects.countries as GeometryCollection<{
    name?: string;
  }>;
  const collection = feature(topology, countries);

  return {
    ...collection,
    features: collection.features
      .filter((country) => country.properties?.name !== "Antarctica")
      .map((country) => {
        const name = country.properties?.name ?? "";

        return {
          ...country,
          properties: {
            ...country.properties,
            normalizedName: normalizeGuess(name),
          },
        };
      }),
  };
}

export const COUNTRY_DATA = buildCountryData();

const MAP_COUNTRY_NAMES = new Set(
  COUNTRY_DATA.features.map((country) => country.properties.normalizedName),
);

export function getMapCountryNames(mapNames: readonly string[]) {
  const normalizedNames = new Set(mapNames.map(normalizeGuess));

  for (const name of normalizedNames) {
    const override = MAP_NAME_OVERRIDES[name];
    if (override) return new Set(override.map(normalizeGuess));
  }

  for (const name of normalizedNames) {
    for (const alias of MAP_NAME_ALIASES[name] ?? []) {
      normalizedNames.add(normalizeGuess(alias));
    }
  }

  return normalizedNames;
}

export function hasMapGeometry(mapNames: readonly string[]) {
  return [...getMapCountryNames(mapNames)].some((name) =>
    MAP_COUNTRY_NAMES.has(name),
  );
}

function hasMapMarker(entity: NormalizedEntity) {
  return (
    typeof entity.metadata.centroidLatitude === "number" &&
    typeof entity.metadata.centroidLongitude === "number"
  );
}

export function getCountriesWithoutMapCoverage(
  entities: readonly NormalizedEntity[],
) {
  return entities
    .filter((entity) => entity.category === "countries")
    .filter(
      (entity) =>
        !hasMapGeometry(entity.acceptedAnswers.map((answer) => answer.value)) &&
        !hasMapMarker(entity),
    );
}

export function assertCountryMapCoverage(
  entities: readonly NormalizedEntity[],
) {
  const uncoveredCountries = getCountriesWithoutMapCoverage(entities);

  if (uncoveredCountries.length > 0) {
    throw new Error(
      `Map coverage is missing for: ${uncoveredCountries
        .map((country) => country.canonicalAnswer)
        .join(", ")}`,
    );
  }
}
