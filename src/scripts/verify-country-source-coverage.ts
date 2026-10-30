import "@/src/scripts/load-env";

import { assertCountrySourceCoverage } from "@/src/lib/content/country-source-coverage";
import { fetchSimpleWikipediaCountryQids } from "@/src/lib/content/mediawiki-client";
import { getPrismaClient } from "@/src/lib/repository/prisma";
import { getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";

async function main() {
  const [sourceQids, snapshot] = await Promise.all([
    fetchSimpleWikipediaCountryQids(),
    getLatestSnapshot(),
  ]);
  assertCountrySourceCoverage(sourceQids, snapshot.entities);
  console.log(
    `Verified ${sourceQids.length} Wikipedia countries in ${snapshot.key}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrismaClient().$disconnect();
  });
