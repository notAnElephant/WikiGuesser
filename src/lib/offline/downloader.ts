import {
  activateOfflinePack,
  beginOfflinePackDownload,
  getOfflineCountryCacheName,
  markOfflineDownloadFailed,
  saveOfflineDownloadCheckpoint,
} from "@/src/lib/offline/storage";
import {
  offlineCountryManifestSchema,
  offlineCountryPackSchema,
  type OfflineCountryManifest,
  type OfflineDownloadCheckpoint,
  type OfflinePackState,
} from "@/src/lib/offline/types";

export interface OfflineDownloadProgress {
  snapshotKey: string;
  completedAssets: number;
  totalAssets: number;
}

export interface DownloadOfflineCountryPackOptions {
  signal?: AbortSignal;
  concurrency?: number;
  retries?: number;
  fetcher?: typeof fetch;
  cacheStorage?: Pick<CacheStorage, "open" | "delete">;
  onProgress?: (progress: OfflineDownloadProgress) => void;
}

class PermanentDownloadError extends Error {}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted)
    throw signal.reason ?? new DOMException("Aborted", "AbortError");
}

async function wait(delay: number, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, delay);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function fetchWithRetry(
  url: string,
  options: {
    fetcher: typeof fetch;
    signal?: AbortSignal;
    retries: number;
  },
): Promise<Response> {
  let latestError: unknown;
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    throwIfAborted(options.signal);
    try {
      const response = await options.fetcher(url, { signal: options.signal });
      if (response.ok) return response;
      if (
        response.status < 500 &&
        response.status !== 408 &&
        response.status !== 429
      ) {
        throw new PermanentDownloadError(
          `Download failed with status ${response.status}.`,
        );
      }
      latestError = new Error(
        `Download failed with status ${response.status}.`,
      );
    } catch (error) {
      if (error instanceof PermanentDownloadError) throw error;
      if (options.signal?.aborted) throw error;
      latestError = error;
    }
    if (attempt < options.retries)
      await wait(250 * 2 ** attempt, options.signal);
  }
  throw latestError instanceof Error
    ? latestError
    : new Error("Download failed.");
}

async function runWithConcurrency<T>(
  entries: readonly T[],
  concurrency: number,
  worker: (entry: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  async function runWorker() {
    while (cursor < entries.length) {
      const entry = entries[cursor];
      cursor += 1;
      if (entry) await worker(entry);
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(concurrency, 1), entries.length) },
      runWorker,
    ),
  );
}

export async function downloadOfflineCountryPack(
  unvalidatedManifest: OfflineCountryManifest,
  options: DownloadOfflineCountryPackOptions = {},
): Promise<OfflinePackState> {
  const manifest = offlineCountryManifestSchema.parse(unvalidatedManifest);
  const fetcher = options.fetcher ?? fetch;
  const cacheStorage = options.cacheStorage ?? caches;
  const retries = Math.max(0, options.retries ?? 3);
  try {
    const packResponse = await fetchWithRetry(manifest.packUrl, {
      fetcher,
      signal: options.signal,
      retries,
    });
    const pack = offlineCountryPackSchema.parse(await packResponse.json());
    if (
      pack.snapshotKey !== manifest.snapshotKey ||
      pack.entities.length !== manifest.entityCount
    ) {
      throw new Error("The country pack does not match its manifest.");
    }
    let checkpoint = await beginOfflinePackDownload(pack, manifest.assetCount);
    const completed = new Set(checkpoint.completedQids);
    const cache = await cacheStorage.open(
      getOfflineCountryCacheName(manifest.snapshotKey),
    );
    for (const flag of manifest.flags) {
      if (completed.has(flag.qid) && !(await cache.match(flag.url))) {
        completed.delete(flag.qid);
      }
    }
    if (completed.size !== checkpoint.completedQids.length) {
      checkpoint = {
        ...checkpoint,
        completedQids: [...completed],
        updatedAt: new Date().toISOString(),
      };
      await saveOfflineDownloadCheckpoint(checkpoint);
    }
    const pending = manifest.flags.filter((flag) => !completed.has(flag.qid));
    let checkpointWrite = Promise.resolve();
    options.onProgress?.({
      snapshotKey: manifest.snapshotKey,
      completedAssets: completed.size,
      totalAssets: manifest.assetCount,
    });
    await runWithConcurrency(
      pending,
      options.concurrency ?? 3,
      async (flag) => {
        throwIfAborted(options.signal);
        const response = await fetchWithRetry(flag.url, {
          fetcher,
          signal: options.signal,
          retries,
        });
        await cache.put(flag.url, response);
        completed.add(flag.qid);
        const nextCheckpoint = {
          ...checkpoint,
          completedQids: [...completed],
          updatedAt: new Date().toISOString(),
        } satisfies OfflineDownloadCheckpoint;
        checkpoint = nextCheckpoint;
        checkpointWrite = checkpointWrite.then(() =>
          saveOfflineDownloadCheckpoint(nextCheckpoint),
        );
        await checkpointWrite;
        options.onProgress?.({
          snapshotKey: manifest.snapshotKey,
          completedAssets: completed.size,
          totalAssets: manifest.assetCount,
        });
      },
    );
    for (const flag of manifest.flags) {
      if (!(await cache.match(flag.url))) {
        throw new Error(`Offline flag validation failed for ${flag.qid}.`);
      }
    }
    const previousSnapshotKey = await activateOfflinePack(manifest.snapshotKey);
    if (previousSnapshotKey && previousSnapshotKey !== manifest.snapshotKey) {
      await cacheStorage.delete(
        getOfflineCountryCacheName(previousSnapshotKey),
      );
    }
    return {
      schemaVersion: 1,
      status: "ready",
      activeSnapshotKey: manifest.snapshotKey,
      stagedSnapshotKey: null,
      downloadedAssets: manifest.assetCount,
      totalAssets: manifest.assetCount,
      error: null,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    await markOfflineDownloadFailed(manifest.snapshotKey, error);
    throw error;
  }
}
