-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "SnapshotVersion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnapshotVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnapshotEntity" (
    "id" TEXT NOT NULL,
    "snapshotVersionId" TEXT NOT NULL,
    "qid" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "canonicalAnswer" TEXT NOT NULL,
    "wikipediaTitle" TEXT,
    "sourceFingerprint" TEXT NOT NULL,
    "acceptedAnswers" JSONB NOT NULL,
    "clues" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SnapshotEntity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SnapshotVersion_key_key" ON "SnapshotVersion"("key");

-- CreateIndex
CREATE INDEX "SnapshotEntity_snapshotVersionId_category_idx" ON "SnapshotEntity"("snapshotVersionId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "SnapshotEntity_snapshotVersionId_qid_key" ON "SnapshotEntity"("snapshotVersionId", "qid");

-- AddForeignKey
ALTER TABLE "SnapshotEntity" ADD CONSTRAINT "SnapshotEntity_snapshotVersionId_fkey" FOREIGN KEY ("snapshotVersionId") REFERENCES "SnapshotVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
