import "@/src/scripts/load-env";

import { assertCountryMapCoverage } from "@/src/lib/game/world-map-data";
import { getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";

async function main() {
  const snapshot = await getLatestSnapshot();
  assertCountryMapCoverage(snapshot.entities);

  console.log(
    `Verified map coverage for ${snapshot.entities.filter((entity) => entity.category === "countries").length} countries in ${snapshot.key}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
