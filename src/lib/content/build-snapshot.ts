import { categoryDefinitions } from "@/src/lib/content/category-definitions";
import { fetchRedirectAliases } from "@/src/lib/content/mediawiki-client";
import { materializeSnapshot } from "@/src/lib/content/materialize-snapshot";
import type { EntityCategory, MaterializedSnapshot, NormalizedEntity, SourceEntity } from "@/src/lib/types";

export async function normalizeEntitiesForCategory(
  category: EntityCategory,
  sourceEntities: SourceEntity[],
): Promise<NormalizedEntity[]> {
  const definition = categoryDefinitions[category];
  const normalizedEntities: NormalizedEntity[] = [];
  const seenSourceQids = new Set<string>();
  const seenNormalizedIds = new Set<string>();

  for (const sourceEntity of sourceEntities) {
    if (seenSourceQids.has(sourceEntity.qid)) {
      continue;
    }

    seenSourceQids.add(sourceEntity.qid);

    const redirectAliases =
      definition.aliasStrategy.includeRedirects && sourceEntity.wikipediaTitle
        ? await fetchRedirectAliases(sourceEntity.wikipediaTitle)
        : [];
    const normalizedEntity = definition.normalize(sourceEntity, {
      redirectAliases,
    });

    if (normalizedEntity && !seenNormalizedIds.has(normalizedEntity.id)) {
      seenNormalizedIds.add(normalizedEntity.id);
      normalizedEntities.push(normalizedEntity);
    }
  }

  return normalizedEntities;
}

export async function buildSnapshotFromSources(
  input: Partial<Record<EntityCategory, SourceEntity[]>>,
  previousSnapshot: MaterializedSnapshot | null = null,
) {
  const normalizedEntities: NormalizedEntity[] = [];

  for (const category of Object.keys(input) as EntityCategory[]) {
    const entities = input[category];

    if (!entities || entities.length === 0) {
      continue;
    }

    normalizedEntities.push(...(await normalizeEntitiesForCategory(category, entities)));
  }

  return materializeSnapshot(normalizedEntities, previousSnapshot);
}
