import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { Prisma } from "@prisma/client";
import type { SnapshotEntity } from "@prisma/client";

import { demoSnapshot } from "@/src/lib/content/demo-snapshot";
import { env } from "@/src/lib/env";
import { getPrismaClient } from "@/src/lib/repository/prisma";
import type { CategorySummary, MaterializedSnapshot, NormalizedEntity } from "@/src/lib/types";

const generatedSnapshotPath = path.join(process.cwd(), ".generated", "latest-snapshot.json");

function toNormalizedEntity(record: SnapshotEntity): NormalizedEntity {
  return {
    id: record.id,
    qid: record.qid,
    category: record.category as NormalizedEntity["category"],
    canonicalAnswer: record.canonicalAnswer,
    wikipediaTitle: record.wikipediaTitle,
    acceptedAnswers: record.acceptedAnswers as unknown as NormalizedEntity["acceptedAnswers"],
    clues: record.clues as unknown as NormalizedEntity["clues"],
    metadata: (record.metadata ?? {}) as unknown as NormalizedEntity["metadata"],
    sourceFingerprint: record.sourceFingerprint,
  };
}

async function readGeneratedSnapshot(): Promise<MaterializedSnapshot | null> {
  try {
    const contents = await readFile(generatedSnapshotPath, "utf8");
    const snapshot = JSON.parse(contents) as MaterializedSnapshot;
    console.info("[snapshot] loaded generated snapshot", {
      key: snapshot.key,
      entityCount: snapshot.entities.length,
      path: generatedSnapshotPath,
    });
    return snapshot;
  } catch (error) {
    console.warn("[snapshot] generated snapshot unavailable", {
      path: generatedSnapshotPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function readPrismaSnapshot(): Promise<MaterializedSnapshot | null> {
  if (!env.databaseUrl) {
    console.warn("[snapshot] DATABASE_URL missing, skipping Prisma snapshot");
    return null;
  }

  try {
    const prisma = getPrismaClient();
    const latestSnapshot = await prisma.snapshotVersion.findFirst({
      orderBy: { createdAt: "desc" },
      include: { entities: true },
    });

    if (!latestSnapshot) {
      console.warn("[snapshot] Prisma connected but no snapshot rows found");
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
  } catch (error) {
    console.error("[snapshot] Prisma snapshot load failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getLatestSnapshot(): Promise<MaterializedSnapshot> {
  const prismaSnapshot = await readPrismaSnapshot();

  if (prismaSnapshot) {
    return prismaSnapshot;
  }

  const generatedSnapshot = await readGeneratedSnapshot();

  if (generatedSnapshot) {
    return generatedSnapshot;
  }

  console.warn("[snapshot] falling back to bundled demo snapshot", {
    key: demoSnapshot.key,
    entityCount: demoSnapshot.entities.length,
  });
  return demoSnapshot;
}

export async function listCategorySummaries(): Promise<CategorySummary[]> {
  const snapshot = await getLatestSnapshot();

  return [
    {
      id: "countries",
      label: "Countries",
      description: "Flags, geography, and national facts before the answer becomes clear.",
      entityCount: snapshot.entities.filter((entity) => entity.category === "countries").length,
    },
    {
      id: "cities",
      label: "Cities",
      description: "Major places revealed through landmarks, region, and city facts.",
      entityCount: snapshot.entities.filter((entity) => entity.category === "cities").length,
    },
    {
      id: "people",
      label: "People",
      description: "Famous figures revealed through achievements, roles, and biography clues.",
      entityCount: snapshot.entities.filter((entity) => entity.category === "people").length,
    },
  ];
}

export async function persistSnapshot(snapshot: MaterializedSnapshot): Promise<void> {
  if (env.databaseUrl) {
    const prisma = getPrismaClient();
    const snapshotVersion = await prisma.snapshotVersion.create({
      data: {
        key: snapshot.key,
        sourceFingerprint: snapshot.sourceFingerprint,
      },
    });

    if (snapshot.entities.length > 0) {
      await prisma.snapshotEntity.createMany({
        data: snapshot.entities.map((entity) => ({
          id: entity.id,
          snapshotVersionId: snapshotVersion.id,
          qid: entity.qid,
          category: entity.category,
          canonicalAnswer: entity.canonicalAnswer,
          wikipediaTitle: entity.wikipediaTitle,
          sourceFingerprint: entity.sourceFingerprint,
          acceptedAnswers: entity.acceptedAnswers as unknown as Prisma.InputJsonValue,
          clues: entity.clues as unknown as Prisma.InputJsonValue,
          metadata: entity.metadata as unknown as Prisma.InputJsonValue,
        })),
      });
    }
  }

  await mkdir(path.dirname(generatedSnapshotPath), { recursive: true });
  await writeFile(generatedSnapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}
