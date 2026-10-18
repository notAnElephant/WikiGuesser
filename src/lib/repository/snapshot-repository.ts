import { Prisma } from "@prisma/client";
import type { SnapshotEntity } from "@prisma/client";

import { env } from "@/src/lib/env";
import { getKnownEntityLabel } from "@/src/lib/content/entity-labels";
import { getPrismaClient } from "@/src/lib/repository/prisma";
import type {
  CategorySummary,
  MaterializedSnapshot,
  NormalizedEntity,
} from "@/src/lib/types";

function toNormalizedEntity(record: SnapshotEntity): NormalizedEntity {
  const storedClues = record.clues as unknown as NormalizedEntity["clues"];

  return {
    id: record.id,
    qid: record.qid,
    category: record.category as NormalizedEntity["category"],
    canonicalAnswer: record.canonicalAnswer,
    wikipediaTitle: record.wikipediaTitle,
    acceptedAnswers:
      record.acceptedAnswers as unknown as NormalizedEntity["acceptedAnswers"],
    clues: storedClues.map((clue) => ({
      ...clue,
      value: getKnownEntityLabel(clue.value) ?? clue.value,
    })),
    metadata: (record.metadata ??
      {}) as unknown as NormalizedEntity["metadata"],
    sourceFingerprint: record.sourceFingerprint,
  };
}

/**
 * In-memory cache for the active snapshot.
 *
 * The snapshot only changes when a new one is ingested, yet every page render
 * used to re-read all snapshot entities from Postgres. That read is the single
 * biggest cost of a render (hundreds of ms), so we keep it in memory for a
 * short window. `persistSnapshot` clears it for in-process callers; the TTL
 * bounds staleness for processes that persist elsewhere (e.g. the ingest
 * script) without adding a version query to the hot path.
 */
const SNAPSHOT_CACHE_TTL_MS = 30_000;

let latestSnapshotCache: {
  expiresAt: number;
  snapshot: MaterializedSnapshot;
} | null = null;

async function loadLatestSnapshotOrNull(): Promise<MaterializedSnapshot | null> {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const prisma = getPrismaClient();
  const latestSnapshot = await prisma.snapshotVersion.findFirst({
    where: {
      entities: {
        some: {},
      },
    },
    orderBy: { createdAt: "desc" },
    include: { entities: true },
  });

  if (!latestSnapshot) {
    return null;
  }

  const snapshot = {
    key: latestSnapshot.key,
    sourceFingerprint: latestSnapshot.sourceFingerprint,
    createdAt: latestSnapshot.createdAt.toISOString(),
    entities: latestSnapshot.entities.map(toNormalizedEntity),
  };

  console.info("[snapshot] loaded Prisma snapshot", {
    key: snapshot.key,
    entityCount: snapshot.entities.length,
    createdAt: snapshot.createdAt,
  });

  return snapshot;
}

export async function getLatestSnapshotOrNull(): Promise<MaterializedSnapshot | null> {
  if (latestSnapshotCache && latestSnapshotCache.expiresAt > Date.now()) {
    return latestSnapshotCache.snapshot;
  }

  const snapshot = await loadLatestSnapshotOrNull();

  if (snapshot) {
    latestSnapshotCache = {
      expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS,
      snapshot,
    };
  }

  return snapshot;
}

export async function getLatestSnapshot(): Promise<MaterializedSnapshot> {
  const snapshot = await getLatestSnapshotOrNull();

  if (!snapshot) {
    throw new Error("No snapshot rows found in the database.");
  }

  return snapshot;
}

export function buildCategorySummaries(
  snapshot: MaterializedSnapshot,
): CategorySummary[] {
  return [
    {
      id: "countries",
      label: "Countries",
      description:
        "Flags, geography, and national facts before the answer becomes clear.",
      entityCount: snapshot.entities.filter(
        (entity) => entity.category === "countries",
      ).length,
    },
    {
      id: "cities",
      label: "Cities",
      description:
        "Capital cities revealed through country, geography, and city facts.",
      entityCount: snapshot.entities.filter(
        (entity) => entity.category === "cities",
      ).length,
    },
    {
      id: "people",
      label: "People",
      description:
        "Famous figures revealed through achievements, roles, and biography clues.",
      entityCount: snapshot.entities.filter(
        (entity) => entity.category === "people",
      ).length,
    },
  ];
}

export async function listCategorySummaries(): Promise<CategorySummary[]> {
  const snapshot = await getLatestSnapshot();
  return buildCategorySummaries(snapshot);
}

export async function persistSnapshot(
  snapshot: MaterializedSnapshot,
): Promise<void> {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (snapshot.entities.length === 0) {
    throw new Error("Refusing to persist an empty snapshot.");
  }

  const prisma = getPrismaClient();
  await prisma.$transaction(
    async (tx) => {
      await tx.snapshotVersion.deleteMany();

      const snapshotVersion = await tx.snapshotVersion.create({
        data: {
          key: snapshot.key,
          sourceFingerprint: snapshot.sourceFingerprint,
        },
      });

      await tx.snapshotEntity.createMany({
        data: snapshot.entities.map((entity) => ({
          id: entity.id,
          snapshotVersionId: snapshotVersion.id,
          qid: entity.qid,
          category: entity.category,
          canonicalAnswer: entity.canonicalAnswer,
          wikipediaTitle: entity.wikipediaTitle,
          sourceFingerprint: entity.sourceFingerprint,
          acceptedAnswers:
            entity.acceptedAnswers as unknown as Prisma.InputJsonValue,
          clues: entity.clues as unknown as Prisma.InputJsonValue,
          metadata: entity.metadata as unknown as Prisma.InputJsonValue,
        })),
      });
    },
    { timeout: 15_000 },
  );

  latestSnapshotCache = null;
}
