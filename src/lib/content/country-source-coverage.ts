import type { NormalizedEntity } from "@/src/lib/types";

export function assertCountrySourceCoverage(
  sourceQids: readonly string[],
  snapshotEntities: readonly NormalizedEntity[],
): void {
  const playableQids = new Set(
    snapshotEntities
      .filter((entity) => entity.category === "countries")
      .map((entity) => entity.qid),
  );
  const missingQids = [...new Set(sourceQids)].filter(
    (qid) => !playableQids.has(qid),
  );

  if (missingQids.length > 0) {
    throw new Error(
      `Wikipedia countries missing from the playable snapshot: ${missingQids.join(", ")}`,
    );
  }
}
