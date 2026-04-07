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
    return JSON.parse(contents) as MaterializedSnapshot;
  } catch {
    return null;
  }
}

async function readPrismaSnapshot(): Promise<MaterializedSnapshot | null> {
  if (!env.databaseUrl) {
    return null;
  }

  try {
    const prisma = getPrismaClient();
    const latestSnapshot = await prisma.snapshotVersion.findFirst({
      orderBy: { createdAt: "desc" },
      include: { entities: true },
    });

    if (!latestSnapshot) {
      return null;
    }

    return {
      key: latestSnapshot.key,
      sourceFingerprint: latestSnapshot.sourceFingerprint,
      createdAt: latestSnapshot.createdAt.toISOString(),
      entities: latestSnapshot.entities.map(toNormalizedEntity),
    };
  } catch {
    return null;
  }
}

export async function getLatestSnapshot(): Promise<MaterializedSnapshot> {
  return (await readPrismaSnapshot()) ?? (await readGeneratedSnapshot()) ?? demoSnapshot;
}

export async function listCategorySummaries(): Promise<CategorySummary[]> {
  const snapshot = await getLatestSnapshot();

  return [
    {
      id: "countries",
      label: "Countries",
      description: "Geo rounds from structured country facts and late-reveal capitals.",
      entityCount: snapshot.entities.filter((entity) => entity.category === "countries").length,
    },
    {
      id: "cities",
      label: "Cities",
      description: "Population, region, and elevation clues before the city name becomes obvious.",
      entityCount: snapshot.entities.filter((entity) => entity.category === "cities").length,
    },
    {
      id: "people",
      label: "People",
      description: "Occupation and field-first rounds with strict spoiler filtering.",
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
