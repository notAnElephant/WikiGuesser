import type { MaterializedSnapshot, NormalizedEntity } from "@/src/lib/types";
import { hashString, stableStringify } from "@/src/lib/utils/hash";

export interface MaterializeSnapshotResult {
  snapshot: MaterializedSnapshot;
  addedEntityIds: string[];
  updatedEntityIds: string[];
  removedEntityIds: string[];
}

export function materializeSnapshot(
  entities: NormalizedEntity[],
  previousSnapshot: MaterializedSnapshot | null = null,
): MaterializeSnapshotResult {
  const sortedEntities = [...entities].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const sourceFingerprint = hashString(
    stableStringify(
      sortedEntities.map((entity) => ({
        id: entity.id,
        sourceFingerprint: entity.sourceFingerprint,
      })),
    ),
  );

  const nextSnapshot: MaterializedSnapshot = {
    key: `snapshot-${sourceFingerprint.slice(0, 12)}`,
    sourceFingerprint,
    createdAt: new Date().toISOString(),
    entities: sortedEntities,
  };

  const previousEntities = new Map(
    previousSnapshot?.entities.map((entity) => [entity.id, entity]) ?? [],
  );
  const nextEntities = new Map(
    sortedEntities.map((entity) => [entity.id, entity]),
  );

  const addedEntityIds = sortedEntities
    .filter((entity) => !previousEntities.has(entity.id))
    .map((entity) => entity.id);
  const updatedEntityIds = sortedEntities
    .filter((entity) => previousEntities.has(entity.id))
    .filter(
      (entity) =>
        previousEntities.get(entity.id)?.sourceFingerprint !==
        entity.sourceFingerprint,
    )
    .map((entity) => entity.id);
  const removedEntityIds = [...previousEntities.keys()].filter(
    (entityId) => !nextEntities.has(entityId),
  );

  return {
    snapshot: nextSnapshot,
    addedEntityIds,
    updatedEntityIds,
    removedEntityIds,
  };
}
