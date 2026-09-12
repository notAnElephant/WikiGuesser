import { z } from "zod";

import { getEntityContinentIds } from "@/src/lib/content/continents";
import { normalizeGuess } from "@/src/lib/game/answer-matching";
import {
  CONTINENT_IDS,
  GAME_MODES,
  type MaterializedSnapshot,
  type NormalizedEntity,
} from "@/src/lib/types";

export const OFFLINE_COUNTRY_SCHEMA_VERSION = 1 as const;

const snapshotKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/);

const acceptedAnswerSchema = z.object({
  kind: z.enum(["canonical", "alias", "wikipedia-title", "redirect"]),
  value: z.string().min(1),
  normalized: z.string().min(1),
});

const offlineCountryClueSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  difficulty: z.number().finite(),
  spoilerLevel: z.enum(["safe", "late"]),
  mode: z.enum(GAME_MODES).optional(),
});

export const offlineCountryEntitySchema = z.object({
  id: z.string().min(1),
  qid: z.string().regex(/^Q[1-9]\d*$/),
  canonicalAnswer: z.string().min(1),
  acceptedAnswers: z.array(acceptedAnswerSchema).min(1),
  clues: z.array(offlineCountryClueSchema).min(1),
  continents: z.array(z.enum(CONTINENT_IDS)),
  latitude: z.number().finite().min(-90).max(90).nullable(),
  longitude: z.number().finite().min(-180).max(180).nullable(),
});

export const offlineCountryPackSchema = z
  .object({
    schemaVersion: z.literal(OFFLINE_COUNTRY_SCHEMA_VERSION),
    snapshotKey: snapshotKeySchema,
    entities: z.array(offlineCountryEntitySchema).min(1),
  })
  .superRefine((pack, context) => {
    if (
      new Set(pack.entities.map((entity) => entity.id)).size !==
      pack.entities.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Country entity IDs must be unique.",
        path: ["entities"],
      });
    }

    if (
      new Set(pack.entities.map((entity) => entity.qid)).size !==
      pack.entities.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Country QIDs must be unique.",
        path: ["entities"],
      });
    }

    for (const [entityIndex, entity] of pack.entities.entries()) {
      const flagClue = entity.clues.find((clue) => clue.key === "flag-colors");
      if (
        flagClue &&
        flagClue.value !== flagProxyUrl(pack.snapshotKey, entity.qid)
      ) {
        context.addIssue({
          code: "custom",
          message: "Flag clues must use their versioned same-origin proxy URL.",
          path: ["entities", entityIndex, "clues"],
        });
      }
    }
  });

export const offlineCountryManifestSchema = z
  .object({
    schemaVersion: z.literal(OFFLINE_COUNTRY_SCHEMA_VERSION),
    snapshotKey: snapshotKeySchema,
    entityCount: z.number().int().nonnegative(),
    assetCount: z.number().int().nonnegative(),
    packUrl: z.string().startsWith("/"),
    flags: z.array(
      z.object({
        qid: z.string().regex(/^Q[1-9]\d*$/),
        url: z.string().startsWith("/"),
      }),
    ),
  })
  .superRefine((manifest, context) => {
    if (manifest.assetCount !== manifest.flags.length) {
      context.addIssue({
        code: "custom",
        message: "assetCount must equal the number of flag assets.",
        path: ["assetCount"],
      });
    }

    if (
      new Set(manifest.flags.map((flag) => flag.qid)).size !==
      manifest.flags.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Flag QIDs must be unique.",
        path: ["flags"],
      });
    }

    if (
      manifest.packUrl !==
      `/api/offline/countries/packs/${encodeURIComponent(manifest.snapshotKey)}`
    ) {
      context.addIssue({
        code: "custom",
        message: "packUrl must use the versioned same-origin pack endpoint.",
        path: ["packUrl"],
      });
    }

    for (const [flagIndex, flag] of manifest.flags.entries()) {
      if (flag.url !== flagProxyUrl(manifest.snapshotKey, flag.qid)) {
        context.addIssue({
          code: "custom",
          message: "Flag URLs must use their versioned same-origin endpoint.",
          path: ["flags", flagIndex, "url"],
        });
      }
    }
  });

export type OfflineCountryEntity = z.infer<typeof offlineCountryEntitySchema>;
export type OfflineCountryPack = z.infer<typeof offlineCountryPackSchema>;
export type OfflineCountryManifest = z.infer<
  typeof offlineCountryManifestSchema
>;

const WIKIMEDIA_COMMONS_ORIGIN = "https://commons.wikimedia.org";
const WIKIMEDIA_FLAG_PATH_PREFIX = "/wiki/Special:Redirect/file/";

function flagProxyUrl(snapshotKey: string, qid: string): string {
  return `/api/offline/countries/packs/${encodeURIComponent(snapshotKey)}/flags/${encodeURIComponent(qid)}`;
}

export function parseWikimediaFlagSourceUrl(value: string): URL | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (
    url.origin !== WIKIMEDIA_COMMONS_ORIGIN ||
    url.username ||
    url.password ||
    url.hash ||
    !url.pathname.startsWith(WIKIMEDIA_FLAG_PATH_PREFIX)
  ) {
    return null;
  }

  const encodedFilename = url.pathname.slice(WIKIMEDIA_FLAG_PATH_PREFIX.length);
  let filename: string;

  try {
    filename = decodeURIComponent(encodedFilename);
  } catch {
    return null;
  }

  if (
    !filename ||
    filename.length > 255 ||
    filename.includes("/") ||
    filename.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(filename)
  ) {
    return null;
  }

  const queryKeys = [...url.searchParams.keys()];
  const width = url.searchParams.get("width");

  if (
    queryKeys.length !== 1 ||
    queryKeys[0] !== "width" ||
    !width ||
    !/^\d{1,4}$/.test(width) ||
    Number(width) < 1 ||
    Number(width) > 2048
  ) {
    return null;
  }

  return url;
}

export function isAllowedWikimediaAssetUrl(value: string): boolean {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.hash &&
    !url.port &&
    (url.hostname === "commons.wikimedia.org" ||
      url.hostname === "upload.wikimedia.org" ||
      url.hostname === "thumb.wikimedia.org" ||
      // Commons can use this first-party host as a redirect intermediary.
      url.hostname === "www.wikimedia.org")
  );
}

export function getCountryFlagSourceUrl(entity: NormalizedEntity): URL | null {
  return getCountryFlagSourceUrlFromClues(entity.clues);
}

export function getCountryFlagSourceUrlFromClues(clues: unknown): URL | null {
  if (!Array.isArray(clues)) {
    return null;
  }

  const flagClue = clues.find(
    (clue): clue is { key: string; value: string } =>
      typeof clue === "object" &&
      clue !== null &&
      "key" in clue &&
      clue.key === "flag-colors" &&
      "value" in clue &&
      typeof clue.value === "string",
  );

  return flagClue ? parseWikimediaFlagSourceUrl(flagClue.value) : null;
}

function getCoordinate(
  entity: NormalizedEntity,
  key: "centroidLatitude" | "centroidLongitude",
  minimum: number,
  maximum: number,
): number | null {
  const value = entity.metadata[key];
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : null;
}

export function buildOfflineCountryPack(
  snapshot: MaterializedSnapshot,
): OfflineCountryPack {
  const entities = snapshot.entities
    .filter((entity) => entity.category === "countries")
    .map((entity) => {
      const storedFlagClue = entity.clues.find(
        (clue) => clue.key === "flag-colors",
      );
      const flagSourceUrl = getCountryFlagSourceUrl(entity);

      if (storedFlagClue && !flagSourceUrl) {
        throw new Error(`Country ${entity.qid} has an invalid flag URL.`);
      }

      const localFlagUrl = flagSourceUrl
        ? flagProxyUrl(snapshot.key, entity.qid)
        : null;

      return {
        id: entity.id,
        qid: entity.qid,
        canonicalAnswer: entity.canonicalAnswer,
        // Older persisted snapshots may predate the normalized-answer field.
        // Recompute it from the answer text so every published offline pack is
        // independently valid and uses the same matching semantics as rounds.
        acceptedAnswers: entity.acceptedAnswers.flatMap((answer) => {
          const normalized = normalizeGuess(answer.value);
          return normalized ? [{ ...answer, normalized }] : [];
        }),
        clues: entity.clues.map((clue) => ({
          ...clue,
          value:
            clue.key === "flag-colors" && localFlagUrl
              ? localFlagUrl
              : clue.value,
        })),
        continents: getEntityContinentIds(entity),
        latitude: getCoordinate(entity, "centroidLatitude", -90, 90),
        longitude: getCoordinate(entity, "centroidLongitude", -180, 180),
      };
    })
    .sort((left, right) => left.qid.localeCompare(right.qid));

  return offlineCountryPackSchema.parse({
    schemaVersion: OFFLINE_COUNTRY_SCHEMA_VERSION,
    snapshotKey: snapshot.key,
    entities,
  });
}

export function buildOfflineCountryManifest(
  pack: OfflineCountryPack,
): OfflineCountryManifest {
  const flags = pack.entities.flatMap((entity) => {
    const flagClue = entity.clues.find((clue) => clue.key === "flag-colors");
    return flagClue ? [{ qid: entity.qid, url: flagClue.value }] : [];
  });

  return offlineCountryManifestSchema.parse({
    schemaVersion: OFFLINE_COUNTRY_SCHEMA_VERSION,
    snapshotKey: pack.snapshotKey,
    entityCount: pack.entities.length,
    assetCount: flags.length,
    packUrl: `/api/offline/countries/packs/${encodeURIComponent(pack.snapshotKey)}`,
    flags,
  });
}
