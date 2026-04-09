import "@/src/scripts/load-env";
import { allCategoryDefinitions } from "@/src/lib/content/category-definitions";
import {
  readGeneratedJson,
  writeGeneratedJson,
} from "@/src/lib/content/generated-io";
import { hydrateEntities } from "@/src/lib/content/wikidata-client";
import type { EntityCategory } from "@/src/lib/types";
import { getArgValue } from "@/src/scripts/cli-args";

async function main() {
  const categoryArg = getArgValue("category") as EntityCategory | undefined;
  const categories = categoryArg
    ? [categoryArg]
    : allCategoryDefinitions.map((definition) => definition.id);

  for (const category of categories) {
    const discovery = await readGeneratedJson<{ qids: string[] }>(
      "discovery",
      `${category}.json`,
    );
    const hydrated = await hydrateEntities(category, discovery.qids);
    const target = await writeGeneratedJson(
      {
        category,
        count: hydrated.length,
        fetchedAt: new Date().toISOString(),
        entities: hydrated,
      },
      "hydrated",
      `${category}.json`,
    );
    console.log(
      `Hydrated ${hydrated.length} ${category} entities -> ${target}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
