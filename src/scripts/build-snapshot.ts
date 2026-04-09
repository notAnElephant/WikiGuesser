import "@/src/scripts/load-env";
import { buildSnapshotFromSources } from "@/src/lib/content/build-snapshot";
import { allCategoryDefinitions } from "@/src/lib/content/category-definitions";
import { readGeneratedJson } from "@/src/lib/content/generated-io";
import {
  getLatestSnapshotOrNull,
  persistSnapshot,
} from "@/src/lib/repository/snapshot-repository";
import type {
  EntityCategory,
  MaterializedSnapshot,
  SourceEntity,
} from "@/src/lib/types";
import { getListArgValue } from "@/src/scripts/cli-args";

async function main() {
  const categoryArgs = getListArgValue("category") as
    | EntityCategory[]
    | undefined;
  const categories = categoryArgs?.length
    ? categoryArgs
    : allCategoryDefinitions.map((definition) => definition.id);

  const hydratedInput: Partial<Record<EntityCategory, SourceEntity[]>> = {};

  for (const category of categories) {
    const hydrated = await readGeneratedJson<{ entities: SourceEntity[] }>(
      "hydrated",
      `${category}.json`,
    );
    hydratedInput[category] = hydrated.entities;
  }

  const previousSnapshot: MaterializedSnapshot | null =
    await getLatestSnapshotOrNull();

  const result = await buildSnapshotFromSources(
    hydratedInput,
    previousSnapshot,
  );
  await persistSnapshot(result.snapshot);

  console.log(
    JSON.stringify(
      {
        key: result.snapshot.key,
        addedEntityIds: result.addedEntityIds,
        updatedEntityIds: result.updatedEntityIds,
        removedEntityIds: result.removedEntityIds,
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
