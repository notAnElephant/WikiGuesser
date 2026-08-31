import type {
  ContinentId,
  ContinentOption,
  NormalizedEntity,
  SourceClaimValue,
  SourceEntity,
} from "@/src/lib/types";
import { CONTINENT_IDS } from "@/src/lib/types";

export const CONTINENT_LABELS: Readonly<Record<ContinentId, string>> = {
  africa: "Africa",
  asia: "Asia",
  europe: "Europe",
  americas: "Americas",
  oceania: "Oceania",
  antarctica: "Antarctica",
};

const continentIdsByWikidataId: Readonly<
  Record<string, readonly ContinentId[]>
> = {
  Q15: ["africa"],
  Q18: ["americas"],
  Q46: ["europe"],
  Q48: ["asia"],
  Q49: ["americas"],
  Q51: ["antarctica"],
  Q538: ["oceania"],
  Q3960: ["oceania"],
  Q5401: ["europe", "asia"],
  Q55643: ["oceania"],
  Q828: ["americas"],
  Q27611: ["americas"],
};

const continentIdsByLabel = new Map<string, readonly ContinentId[]>([
  ...CONTINENT_IDS.map(
    (id) => [CONTINENT_LABELS[id].toLocaleLowerCase(), [id]] as const,
  ),
  ["australia", ["oceania"]],
  ["eurasia", ["europe", "asia"]],
  ["insular oceania", ["oceania"]],
  ["north america", ["americas"]],
  ["south america", ["americas"]],
  ["central america", ["americas"]],
  ["the americas", ["americas"]],
]);

export function isContinentId(value: unknown): value is ContinentId {
  return (
    typeof value === "string" && CONTINENT_IDS.includes(value as ContinentId)
  );
}

function resolveClaimContinents(
  claim: SourceClaimValue,
): readonly ContinentId[] {
  if (claim.type !== "entity") {
    return [];
  }

  return (
    continentIdsByWikidataId[claim.id] ??
    (claim.label
      ? continentIdsByLabel.get(claim.label.toLocaleLowerCase())
      : undefined) ??
    []
  );
}

function sortAndDedupeContinentIds(
  continentIds: Iterable<ContinentId>,
): ContinentId[] {
  const selectedIds = new Set(continentIds);
  return CONTINENT_IDS.filter((id) => selectedIds.has(id));
}

export function getSourceContinentIds(source: SourceEntity): ContinentId[] {
  for (const claim of source.claims.P30 ?? []) {
    const continentIds = resolveClaimContinents(claim);

    if (continentIds.length > 0) {
      return sortAndDedupeContinentIds(continentIds);
    }
  }

  return [];
}

export function getEntityContinentIds(entity: NormalizedEntity): ContinentId[] {
  const storedContinents = entity.metadata.continents;

  if (Array.isArray(storedContinents)) {
    return sortAndDedupeContinentIds(storedContinents.filter(isContinentId));
  }

  const continentClue = entity.clues.find((clue) => clue.key === "continent");

  if (!continentClue) {
    return [];
  }

  return sortAndDedupeContinentIds(
    continentClue.value
      .split(",")
      .flatMap(
        (label) =>
          continentIdsByLabel.get(label.trim().toLocaleLowerCase()) ?? [],
      ),
  );
}

export function buildContinentOptions(
  entities: NormalizedEntity[],
): ContinentOption[] {
  const counts = new Map<ContinentId, number>();

  for (const entity of entities) {
    if (entity.category !== "countries") {
      continue;
    }

    for (const continentId of getEntityContinentIds(entity)) {
      counts.set(continentId, (counts.get(continentId) ?? 0) + 1);
    }
  }

  return CONTINENT_IDS.flatMap((id) => {
    const entityCount = counts.get(id) ?? 0;

    return entityCount > 0
      ? [{ id, label: CONTINENT_LABELS[id], entityCount }]
      : [];
  });
}
