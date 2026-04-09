-- DropIndex
DROP INDEX "SnapshotEntity_snapshotVersionId_qid_key";

-- CreateIndex
CREATE UNIQUE INDEX "SnapshotEntity_snapshotVersionId_category_qid_key"
ON "SnapshotEntity"("snapshotVersionId", "category", "qid");
