import { allCategoryDefinitions } from "@/src/lib/content/category-definitions";
import { writeGeneratedJson } from "@/src/lib/content/generated-io";
import { discoverCategoryQids } from "@/src/lib/content/wikidata-client";
import type { EntityCategory } from "@/src/lib/types";
import { getArgValue, getNumericArgValue } from "@/src/scripts/cli-args";

async function main() {
  const categoryArg = getArgValue("category") as EntityCategory | undefined;
  const rawLimit = getArgValue("limit");
  const limit = rawLimit ? getNumericArgValue("limit", 50) : undefined;
  const categories = categoryArg ? [categoryArg] : allCategoryDefinitions.map((definition) => definition.id);

  for (const category of categories) {
    const qids = await discoverCategoryQids(category, limit);
    const target = await writeGeneratedJson({ category, qids, fetchedAt: new Date().toISOString() }, "discovery", `${category}.json`);
    console.log(`Discovered ${qids.length} ${category} entities -> ${target}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
