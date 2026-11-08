import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { geoArea } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";

// Extract once from public-domain Natural Earth, never load the detailed world in the browser.
const source =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson";
const names: Record<string, string> = {
  "336": "Vatican",
  "492": "Monaco",
  "520": "Nauru",
  "798": "Tuvalu",
  "674": "San Marino",
  "438": "Liechtenstein",
  "584": "Marshall Is.",
  "659": "St. Kitts and Nevis",
  "462": "Maldives",
  "470": "Malta",
  "308": "Grenada",
  "670": "St. Vin. and Gren.",
  "052": "Barbados",
  "028": "Antigua and Barb.",
  "690": "Seychelles",
  "585": "Palau",
  "020": "Andorra",
  "662": "Saint Lucia",
  "583": "Micronesia",
  "702": "Singapore",
  "776": "Tonga",
  "212": "Dominica",
  "048": "Bahrain",
  "296": "Kiribati",
  "678": "São Tomé and Principe",
};

async function main() {
  const response = await fetch(source);
  assert(response.ok, `Natural Earth download failed: ${response.status}`);
  const countries = (await response.json()) as FeatureCollection<
    Geometry,
    { ISO_N3: string }
  >;
  const supplement: FeatureCollection<Geometry, { name: string }> = {
    type: "FeatureCollection",
    features: countries.features
      .filter((country) => names[country.properties.ISO_N3])
      .map((country) => ({
        type: "Feature",
        id: country.properties.ISO_N3,
        properties: { name: names[country.properties.ISO_N3] },
        geometry: country.geometry,
      })),
  };
  assert.equal(supplement.features.length, Object.keys(names).length);
  for (const country of supplement.features) {
    const area = geoArea(country);
    assert(
      area > 0 && area < 0.001,
      `Invalid outline: ${country.properties.name}`,
    );
  }
  const json = JSON.stringify(supplement);
  writeFileSync(
    new URL("../lib/game/microstate-map.json", import.meta.url),
    `${json}\n`,
  );
  console.log(
    `Extracted ${supplement.features.length} country outlines (${json.length} bytes)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
