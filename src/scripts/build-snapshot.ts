import "@/src/scripts/load-env";
import { buildSnapshotFromSources } from "@/src/lib/content/build-snapshot";
import { allCategoryDefinitions } from "@/src/lib/content/category-definitions";
import { getGeneratedPath, readGeneratedJson, writeGeneratedJson } from "@/src/lib/content/generated-io";
import { persistSnapshot } from "@/src/lib/repository/snapshot-repository";
import type { EntityCategory, MaterializedSnapshot, SourceEntity } from "@/src/lib/types";
import { getArgValue } from "@/src/scripts/cli-args";

async function main() {
  const categoryArg = getArgValue("category") as EntityCategory | undefined;
  const categories = categoryArg ? [categoryArg] : allCategoryDefinitions.map((definition) => definition.id);

  const hydratedInput: Partial<Record<EntityCategory, SourceEntity[]>> = {};

  for (const category of categories) {
    const hydrated = await readGeneratedJson<{ entities: SourceEntity[] }>("hydrated", `${category}.json`);
    hydratedInput[category] = hydrated.entities;
  }

  let previousSnapshot: MaterializedSnapshot | null;

  try {
    previousSnapshot = await readGeneratedJson<MaterializedSnapshot>("latest-snapshot.json");
  } catch {
    previousSnapshot = null;
  }

  const result = await buildSnapshotFromSources(hydratedInput, previousSnapshot);
  await persistSnapshot(result.snapshot);
  await writeGeneratedJson(result.snapshot, "latest-snapshot.json");

  console.log(
    JSON.stringify(
      {
        key: result.snapshot.key,
        addedEntityIds: result.addedEntityIds,
        updatedEntityIds: result.updatedEntityIds,
        removedEntityIds: result.removedEntityIds,
        output: getGeneratedPath("latest-snapshot.json"),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
