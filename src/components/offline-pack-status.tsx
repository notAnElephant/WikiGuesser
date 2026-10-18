"use client";

import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Download, HardDrive, RotateCcw, Trash2, WifiOff } from "lucide-react";
import { useState } from "react";

import { useOfflinePack } from "@/src/components/offline-pack-provider";
import { deleteOfflineCountryData } from "@/src/lib/offline";

export function OfflinePackStatus({ alwaysVisible = false }) {
  const { isOnline, isStandalone, progress, refresh, retry, state } =
    useOfflinePack();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!alwaysVisible && !isStandalone) {
    return null;
  }

  const hasActivePack = Boolean(state?.activeSnapshotKey);
  const isReady = state?.status === "ready" && hasActivePack;
  const isDownloading = state?.status === "downloading" || Boolean(progress);
  const completed = progress?.completedAssets ?? state?.downloadedAssets ?? 0;
  const total = progress?.totalAssets ?? state?.totalAssets ?? 0;
  const statusLabel = isReady
    ? "Countries ready offline"
    : isDownloading
      ? "Downloading countries"
      : state?.status === "error"
        ? hasActivePack
          ? "Countries ready · update paused"
          : "Download needs attention"
        : isOnline
          ? "Preparing offline play"
          : "Connect once to download countries";

  async function removeOfflineData() {
    setIsDeleting(true);
    try {
      await deleteOfflineCountryData();
      setIsDeleteOpen(false);
      await refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card className="grid gap-4" elevation="low" padding={4}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 inline-flex items-center gap-2 font-semibold text-primary">
          <StatusDot
            isPulsing={isDownloading}
            label={statusLabel}
            variant={
              isReady
                ? "success"
                : state?.status === "error" || !isOnline
                  ? "warning"
                  : "accent"
            }
          />
          {statusLabel}
        </p>
        <p className="m-0 text-sm text-secondary">Offline · unranked</p>
      </header>

      {isDownloading ? (
        <ProgressBar
          formatValueLabel={(value, max) => `${value} of ${max} flags`}
          hasValueLabel
          label="Country pack download"
          max={Math.max(total, 1)}
          value={completed}
        />
      ) : null}

      {state?.error ? (
        <p className="m-0 text-sm text-error">{state.error}</p>
      ) : null}

      <footer className="flex flex-wrap gap-2">
        {state?.status !== "ready" && isOnline && !isDownloading ? (
          <Button
            icon={
              state?.status === "error" ? (
                <RotateCcw aria-hidden="true" />
              ) : (
                <Download aria-hidden="true" />
              )
            }
            label="Download countries"
            onClick={() => void retry().catch(() => void refresh())}
            variant="secondary"
          >
            {state?.status === "error" ? "Retry download" : "Download now"}
          </Button>
        ) : null}
        {!isOnline && !isReady ? (
          <p className="m-0 inline-flex items-center gap-2 text-sm text-secondary">
            <WifiOff aria-hidden="true" className="size-4" />
            Reopen while connected to finish setup.
          </p>
        ) : null}
        {hasActivePack ? (
          <Button
            icon={<Trash2 aria-hidden="true" />}
            label="Delete offline data"
            onClick={() => setIsDeleteOpen(true)}
            variant="ghost"
          >
            Delete offline data
          </Button>
        ) : null}
        {hasActivePack ? (
          <p className="m-0 inline-flex items-center gap-2 text-sm text-secondary">
            <HardDrive aria-hidden="true" className="size-4" />
            Saved on this device
          </p>
        ) : null}
      </footer>

      <AlertDialog
        actionLabel="Delete offline data"
        description="This removes the downloaded country pack, cached flags, unfinished offline round, and local offline stats from this device."
        isActionLoading={isDeleting}
        isOpen={isDeleteOpen}
        onAction={() => void removeOfflineData()}
        onOpenChange={setIsDeleteOpen}
        title="Delete all offline data?"
      />
    </Card>
  );
}
