import {
  dedupeAcceptedAnswers,
  normalizeGuess,
} from "@/src/lib/game/answer-matching";
import { getKnownEntityLabel } from "@/src/lib/content/entity-labels";
import type {
  AcceptedAnswer,
  EntityCategory,
  EntityMetadataValue,
  GameMode,
  NormalizedEntity,
  PlayableClue,
  SourceClaimValue,
  SourceEntity,
} from "@/src/lib/types";
import { hashString, stableStringify } from "@/src/lib/utils/hash";

const integerFormat = new Intl.NumberFormat("en-US");
const decimalFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

export function getClaims(
  entity: SourceEntity,
  propertyId: string,
): SourceClaimValue[] {
  return entity.claims[propertyId] ?? [];
}

export function getEntityLabels(
  entity: SourceEntity,
  propertyId: string,
): string[] {
  return getClaims(entity, propertyId)
    .filter(
      (claim): claim is Extract<SourceClaimValue, { type: "entity" }> =>
        claim.type === "entity",
    )
    .map((claim) => claim.label ?? getKnownEntityLabel(claim.id))
    .filter((label): label is string => Boolean(label));
}

export function getCurrentEntityLabels(
  entity: SourceEntity,
  propertyId: string,
): string[] {
  const entityClaims = getClaims(entity, propertyId).filter(
    (claim): claim is Extract<SourceClaimValue, { type: "entity" }> =>
      claim.type === "entity",
  );
  const labelsById = new Map(
    entityClaims.map((claim) => [
      claim.id,
      claim.label ?? getKnownEntityLabel(claim.id),
    ]),
  );
  const rawEntity = entity.raw as {
    claims?: Record<
      string,
      Array<{
        rank?: string;
        mainsnak?: {
          snaktype?: string;
          datavalue?: {
            type?: string;
            value?: { id?: string };
          };
        };
        qualifiers?: Record<string, unknown[]>;
      }>
    >;
  };
  const statements = (rawEntity.claims?.[propertyId] ?? []).filter(
    (statement) =>
      statement.rank !== "deprecated" &&
      statement.mainsnak?.snaktype !== "novalue" &&
      statement.mainsnak?.datavalue?.type === "wikibase-entityid" &&
      typeof statement.mainsnak.datavalue.value?.id === "string",
  );

  if (statements.length === 0) {
    return getEntityLabels(entity, propertyId);
  }

  const preferredStatements = statements.filter(
    (statement) => statement.rank === "preferred",
  );
  const currentStatements = statements.filter(
    (statement) => !statement.qualifiers?.P582?.length,
  );
  const candidates =
    preferredStatements.length > 0
      ? preferredStatements
      : currentStatements.length > 0
        ? currentStatements
        : statements;

  return candidates
    .map((statement) => statement.mainsnak?.datavalue?.value?.id)
    .filter((id): id is string => Boolean(id))
    .map((id) => labelsById.get(id) ?? getKnownEntityLabel(id))
    .filter((label): label is string => Boolean(label));
}

export function getPreferredQuantity(
  entity: SourceEntity,
  propertyId: string,
): number | null {
  const rawEntity = entity.raw as {
    claims?: Record<
      string,
      Array<{
        rank?: string;
        mainsnak?: {
          snaktype?: string;
          datavalue?: {
            type?: string;
            value?: { amount?: string };
          };
        };
        qualifiers?: Record<
          string,
          Array<{ datavalue?: { value?: { time?: string } } }>
        >;
      }>
    >;
  };
  const statements = (rawEntity.claims?.[propertyId] ?? []).filter(
    (statement) =>
      statement.rank !== "deprecated" &&
      statement.mainsnak?.snaktype !== "novalue" &&
      statement.mainsnak?.datavalue?.type === "quantity" &&
      typeof statement.mainsnak.datavalue.value?.amount === "string",
  );

  if (statements.length > 0) {
    const preferredStatements = statements.filter(
      (statement) => statement.rank === "preferred",
    );
    const candidates =
      preferredStatements.length > 0 ? preferredStatements : statements;
    const latestDatedStatement = candidates
      .map((statement, index) => ({
        statement,
        index,
        pointInTime:
          statement.qualifiers?.P585?.[0]?.datavalue?.value?.time ?? null,
      }))
      .filter(
        (candidate): candidate is typeof candidate & { pointInTime: string } =>
          candidate.pointInTime !== null,
      )
      .sort((left, right) =>
        right.pointInTime.localeCompare(left.pointInTime),
      )[0]?.statement;
    const selectedStatement = latestDatedStatement ?? candidates[0];
    const amount = Number.parseFloat(
      selectedStatement?.mainsnak?.datavalue?.value?.amount ?? "",
    );

    if (Number.isFinite(amount)) {
      return amount;
    }
  }

  const match = getClaims(entity, propertyId).find(
    (claim): claim is Extract<SourceClaimValue, { type: "quantity" }> =>
      claim.type === "quantity",
  );

  return match?.amount ?? null;
}

export function getFirstTimeValue(
  entity: SourceEntity,
  propertyId: string,
): string | null {
  const match = getClaims(entity, propertyId).find(
    (claim): claim is Extract<SourceClaimValue, { type: "time" }> =>
      claim.type === "time",
  );

  return match?.value ?? null;
}

export function getPreferredStringValue(
  entity: SourceEntity,
  propertyId: string,
): string | null {
  const rawEntity = entity.raw as {
    claims?: Record<
      string,
      Array<{
        rank?: string;
        mainsnak?: { datavalue?: { type?: string; value?: unknown } };
        qualifiers?: Record<string, unknown[]>;
      }>
    >;
  };
  const statements = rawEntity.claims?.[propertyId] ?? [];
  const usableStatements = statements.filter(
    (statement) =>
      statement.rank !== "deprecated" &&
      statement.mainsnak?.datavalue?.type === "string" &&
      typeof statement.mainsnak.datavalue.value === "string",
  );
  const preferredStatement = usableStatements.find(
    (statement) => statement.rank === "preferred",
  );
  const currentStatement = usableStatements.find(
    (statement) => !statement.qualifiers?.P582?.length,
  );
  const rawValue =
    preferredStatement?.mainsnak?.datavalue?.value ??
    currentStatement?.mainsnak?.datavalue?.value;

  if (typeof rawValue === "string") {
    return rawValue;
  }

  const fallback = getClaims(entity, propertyId).find(
    (claim): claim is Extract<SourceClaimValue, { type: "string" }> =>
      claim.type === "string",
  );

  return fallback?.value ?? null;
}

export function formatCommonsFileUrl(filename: string | null): string | null {
  if (!filename) {
    return null;
  }

  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(filename)}?width=640`;
}

export function getFirstCoordinate(
  entity: SourceEntity,
  propertyId: string,
): { latitude: number; longitude: number } | null {
  const match = getClaims(entity, propertyId).find(
    (claim): claim is Extract<SourceClaimValue, { type: "coordinate" }> =>
      claim.type === "coordinate",
  );

  if (!match) {
    return null;
  }

  return {
    latitude: match.latitude,
    longitude: match.longitude,
  };
}

export function getDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number },
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatList(values: string[], limit = 3): string | null {
  const uniqueValues = [...new Set(values.filter(Boolean))].slice(0, limit);

  if (uniqueValues.length === 0) {
    return null;
  }

  return uniqueValues.join(", ");
}

export function formatPopulation(value: number | null): string | null {
  if (!value) {
    return null;
  }

  if (value >= 1_000_000) {
    return `${decimalFormat.format(value / 1_000_000)} million`;
  }

  if (value >= 1_000) {
    return `${decimalFormat.format(value / 1_000)} thousand`;
  }

  return integerFormat.format(value);
}

export function formatAreaSquareKilometers(
  value: number | null,
): string | null {
  if (!value) {
    return null;
  }

  return `${decimalFormat.format(value)} km²`;
}

export function formatElevationMeters(value: number | null): string | null {
  if (!value) {
    return null;
  }

  return `${integerFormat.format(value)} m`;
}

export function formatCurrency(value: number | null): string | null {
  if (!value) {
    return null;
  }

  return `$${integerFormat.format(value)}`;
}

export function formatDistance(value: number | null): string | null {
  if (!value) {
    return null;
  }

  return `${integerFormat.format(Math.round(value))} km`;
}

export function createClue(
  key: string,
  label: string,
  value: string | null,
  difficulty: number,
  spoilerLevel: "safe" | "late" = "safe",
  mode?: GameMode,
): PlayableClue | null {
  if (!value) {
    return null;
  }

  return {
    key,
    label,
    value,
    difficulty,
    spoilerLevel,
    mode,
  };
}

function getModeClueCount(clues: PlayableClue[], mode: GameMode): number {
  return clues.filter((clue) => clue.mode === undefined || clue.mode === mode)
    .length;
}

export function parseYear(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const match = value.match(/([+-]\d{4,})/);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

export function formatYear(value: string | null): string | null {
  const year = parseYear(value);

  if (!year) {
    return null;
  }

  return `${Math.abs(year)}`;
}

export function formatBirthDecade(value: string | null): string | null {
  const year = parseYear(value);

  if (!year) {
    return null;
  }

  const decade = Math.floor(Math.abs(year) / 10) * 10;
  return `${decade}s`;
}

function stripParenthetical(value: string): string {
  return value
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function createAcceptedAnswers(
  entity: SourceEntity,
  options: {
    includeWikipediaTitle: boolean;
    stripParenthetical: boolean;
    redirectAliases?: string[];
  },
): AcceptedAnswer[] {
  const answers: AcceptedAnswer[] = [];

  const pushAnswer = (
    kind: AcceptedAnswer["kind"],
    value: string | null | undefined,
  ) => {
    if (!value) {
      return;
    }

    answers.push({
      kind,
      value,
      normalized: normalizeGuess(value),
    });

    if (options.stripParenthetical) {
      const strippedValue = stripParenthetical(value);

      if (strippedValue !== value) {
        answers.push({
          kind,
          value: strippedValue,
          normalized: normalizeGuess(strippedValue),
        });
      }
    }
  };

  pushAnswer("canonical", entity.label);

  if (options.includeWikipediaTitle) {
    pushAnswer("wikipedia-title", entity.wikipediaTitle);
  }

  entity.aliases.forEach((alias) => pushAnswer("alias", alias));
  options.redirectAliases?.forEach((redirect) =>
    pushAnswer("redirect", redirect),
  );

  return dedupeAcceptedAnswers(answers);
}

export function buildNormalizedEntity(params: {
  source: SourceEntity;
  category: EntityCategory;
  clues: Array<PlayableClue | null>;
  minimumClues: number;
  minimumCluesByMode?: Partial<Record<GameMode, number>>;
  metadata?: Record<string, EntityMetadataValue>;
  redirectAliases?: string[];
}): NormalizedEntity | null {
  const clues = params.clues.filter(
    (clue): clue is PlayableClue => clue !== null,
  );

  if (clues.length < params.minimumClues) {
    return null;
  }

  for (const [mode, minimumClues] of Object.entries(
    params.minimumCluesByMode ?? {},
  ) as Array<[GameMode, number]>) {
    if (getModeClueCount(clues, mode) < minimumClues) {
      return null;
    }
  }

  const sourceFingerprint = hashString(
    stableStringify({
      qid: params.source.qid,
      claims: params.source.claims,
      clues,
      metadata: params.metadata ?? {},
    }),
  );

  return {
    id: `${params.category}-${normalizeGuess(params.source.label).replace(/\s+/g, "-")}`,
    qid: params.source.qid,
    category: params.category,
    canonicalAnswer: params.source.label,
    wikipediaTitle: params.source.wikipediaTitle,
    acceptedAnswers: createAcceptedAnswers(params.source, {
      includeWikipediaTitle: true,
      stripParenthetical: true,
      redirectAliases: params.redirectAliases,
    }),
    clues,
    metadata: {
      clueCount: clues.length,
      ...(params.metadata ?? {}),
    },
    sourceFingerprint,
  };
}
