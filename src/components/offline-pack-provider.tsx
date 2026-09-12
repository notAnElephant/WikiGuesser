"use client";

import {
  downloadOfflineCountryPack,
  getOfflinePackState,
  offlineCountryManifestSchema,
  requestPersistentOfflineStorage,
  type OfflineDownloadProgress,
  type OfflinePackState,
} from "@/src/lib/offline";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface OfflinePackContextValue {
  isOnline: boolean;
  isStandalone: boolean;
  progress: OfflineDownloadProgress | null;
  refresh(): Promise<void>;
  retry(): Promise<void>;
  state: OfflinePackState | null;
}

const OfflinePackContext = createContext<OfflinePackContextValue | null>(null);

function getStandaloneState() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function OfflinePackProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OfflinePackState | null>(null);
  const [progress, setProgress] = useState<OfflineDownloadProgress | null>(
    null,
  );
  const [isOnline, setIsOnline] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const activeDownloadRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    setState(await getOfflinePackState());
  }, []);

  const syncPack = useCallback(async () => {
    if (activeDownloadRef.current) {
      return activeDownloadRef.current;
    }

    const download = (async () => {
      const response = await fetch("/api/offline/countries/manifest", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Country pack information is unavailable.");
      }

      const manifest = offlineCountryManifestSchema.parse(
        await response.json(),
      );
      const current = await getOfflinePackState();

      if (
        current.status === "ready" &&
        current.activeSnapshotKey === manifest.snapshotKey
      ) {
        setState(current);
        return;
      }

      setProgress({
        completedAssets:
          current.stagedSnapshotKey === manifest.snapshotKey
            ? current.downloadedAssets
            : 0,
        snapshotKey: manifest.snapshotKey,
        totalAssets: manifest.assetCount,
      });
      await downloadOfflineCountryPack(manifest, {
        concurrency: 3,
        onProgress: (nextProgress) => {
          setProgress(nextProgress);
          setState((previous) =>
            previous
              ? {
                  ...previous,
                  downloadedAssets: nextProgress.completedAssets,
                  stagedSnapshotKey: nextProgress.snapshotKey,
                  status: "downloading",
                  totalAssets: nextProgress.totalAssets,
                }
              : previous,
          );
        },
        retries: 3,
      });
      await requestPersistentOfflineStorage();
      setProgress(null);
      await refresh();
    })().finally(() => {
      activeDownloadRef.current = null;
    });

    activeDownloadRef.current = download;
    return download;
  }, [refresh]);

  useEffect(() => {
    const standalone = getStandaloneState();
    setIsStandalone(standalone);
    setIsOnline(navigator.onLine);
    void refresh();

    function handleOnline() {
      setIsOnline(true);
      if (standalone) void syncPack().catch(() => void refresh());
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (standalone && navigator.onLine) {
      void syncPack().catch(() => void refresh());
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refresh, syncPack]);

  const value = useMemo<OfflinePackContextValue>(
    () => ({
      isOnline,
      isStandalone,
      progress,
      refresh,
      retry: syncPack,
      state,
    }),
    [isOnline, isStandalone, progress, refresh, state, syncPack],
  );

  return <OfflinePackContext value={value}>{children}</OfflinePackContext>;
}

export function useOfflinePack() {
  const context = useContext(OfflinePackContext);

  if (!context) {
    throw new Error("useOfflinePack must be used within OfflinePackProvider.");
  }

  return context;
}
