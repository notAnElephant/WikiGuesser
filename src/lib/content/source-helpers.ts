import { dedupeAcceptedAnswers, normalizeGuess } from "@/src/lib/game/answer-matching";
import type {
  AcceptedAnswer,
  EntityCategory,
  EntityMetadataValue,
  NormalizedEntity,
  PlayableClue,
  SourceClaimValue,
  SourceEntity,
} from "@/src/lib/types";
import { hashString, stableStringify } from "@/src/lib/utils/hash";

const integerFormat = new Intl.NumberFormat("en-US");
const decimalFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function getClaims(entity: SourceEntity, propertyId: string): SourceClaimValue[] {
  return entity.claims[propertyId] ?? [];
}

export function getEntityLabels(entity: SourceEntity, propertyId: string): string[] {
  return getClaims(entity, propertyId)
    .filter((claim): claim is Extract<SourceClaimValue, { type: "entity" }> => claim.type === "entity")
    .map((claim) => claim.label ?? claim.id)
    .filter(Boolean);
}

export function getFirstQuantity(entity: SourceEntity, propertyId: string): number | null {
  const match = getClaims(entity, propertyId).find(
    (claim): claim is Extract<SourceClaimValue, { type: "quantity" }> => claim.type === "quantity",
  );

  return match?.amount ?? null;
}

export function getFirstTimeValue(entity: SourceEntity, propertyId: string): string | null {
  const match = getClaims(entity, propertyId).find(
    (claim): claim is Extract<SourceClaimValue, { type: "time" }> => claim.type === "time",
  );

  return match?.value ?? null;
}

export function getFirstCoordinate(
  entity: SourceEntity,
  propertyId: string,
): { latitude: number; longitude: number } | null {
  const match = getClaims(entity, propertyId).find(
    (claim): claim is Extract<SourceClaimValue, { type: "coordinate" }> => claim.type === "coordinate",
  );

  if (!match) {
    return null;
  }

  return {
    latitude: match.latitude,
    longitude: match.longitude,
  };
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

export function formatAreaSquareKilometers(value: number | null): string | null {
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

export function createClue(
  key: string,
  label: string,
  value: string | null,
  difficulty: number,
  spoilerLevel: "safe" | "late" = "safe",
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
  };
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
  return value.replace(/\s*\([^)]*\)\s*/g, " ").trim().replace(/\s+/g, " ");
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

  const pushAnswer = (kind: AcceptedAnswer["kind"], value: string | null | undefined) => {
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
  options.redirectAliases?.forEach((redirect) => pushAnswer("redirect", redirect));

  return dedupeAcceptedAnswers(answers);
}

export function buildNormalizedEntity(params: {
  source: SourceEntity;
  category: EntityCategory;
  clues: Array<PlayableClue | null>;
  minimumClues: number;
  metadata?: Record<string, EntityMetadataValue>;
  redirectAliases?: string[];
}): NormalizedEntity | null {
  const clues = params.clues.filter((clue): clue is PlayableClue => clue !== null);

  if (clues.length < params.minimumClues) {
    return null;
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
