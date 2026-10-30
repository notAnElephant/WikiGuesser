import type { GameMode } from "@/src/lib/types";
import {
  OFFLINE_CACHE_PREFIX,
  OFFLINE_SCHEMA_VERSION,
  offlineCountryPackSchema,
  offlineDownloadCheckpointSchema,
  offlineModeStatsSchema,
  offlinePackStateSchema,
  offlineRoundStateSchema,
  type OfflineCountryPack,
  type OfflineDownloadCheckpoint,
  type OfflineModeStats,
  type OfflinePackState,
  type OfflineRoundState,
} from "@/src/lib/offline/types";

const DATABASE_NAME = "wikiguesser-offline";
const DATABASE_VERSION = 1;
const STORE_META = "meta";
const STORE_PACKS = "packs";
const STORE_DOWNLOADS = "downloads";
const STORE_ROUNDS = "rounds";
const STORE_STATS = "stats";
const PACK_STATE_KEY = "pack-state";
const ACTIVE_ROUND_KEY = "active";

function requireIndexedDb(): IDBFactory {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is unavailable in this browser.");
  }
  return indexedDB;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(
        transaction.error ?? new Error("IndexedDB transaction was aborted."),
      );
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  const request = requireIndexedDb().open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_META))
      database.createObjectStore(STORE_META);
    if (!database.objectStoreNames.contains(STORE_PACKS))
      database.createObjectStore(STORE_PACKS);
    if (!database.objectStoreNames.contains(STORE_DOWNLOADS))
      database.createObjectStore(STORE_DOWNLOADS);
    if (!database.objectStoreNames.contains(STORE_ROUNDS))
      database.createObjectStore(STORE_ROUNDS);
    if (!database.objectStoreNames.contains(STORE_STATS))
      database.createObjectStore(STORE_STATS);
  };
  return requestResult(request);
}

async function withDatabase<T>(
  work: (database: IDBDatabase) => Promise<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await work(database);
  } finally {
    database.close();
  }
}

export function getOfflineCountryCacheName(snapshotKey: string): string {
  return `${OFFLINE_CACHE_PREFIX}-${encodeURIComponent(snapshotKey)}`;
}

export function createEmptyOfflinePackState(
  now = new Date().toISOString(),
): OfflinePackState {
  return {
    schemaVersion: OFFLINE_SCHEMA_VERSION,
    status: "unavailable",
    activeSnapshotKey: null,
    stagedSnapshotKey: null,
    downloadedAssets: 0,
    totalAssets: 0,
    error: null,
    updatedAt: now,
  };
}

export async function getOfflinePackState(): Promise<OfflinePackState> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(STORE_META, "readonly");
    const value = await requestResult(
      transaction.objectStore(STORE_META).get(PACK_STATE_KEY),
    );
    await transactionDone(transaction);
    return value
      ? offlinePackStateSchema.parse(value)
      : createEmptyOfflinePackState();
  });
}

export async function beginOfflinePackDownload(
  pack: OfflineCountryPack,
  totalAssets: number,
): Promise<OfflineDownloadCheckpoint> {
  const validatedPack = offlineCountryPackSchema.parse(pack);
  return withDatabase(async (database) => {
    const transaction = database.transaction(
      [STORE_META, STORE_PACKS, STORE_DOWNLOADS],
      "readwrite",
    );
    const downloads = transaction.objectStore(STORE_DOWNLOADS);
    const previous = await requestResult(
      downloads.get(validatedPack.snapshotKey),
    );
    const previousCheckpoint =
      offlineDownloadCheckpointSchema.safeParse(previous);
    const now = new Date().toISOString();
    const checkpoint: OfflineDownloadCheckpoint = {
      schemaVersion: OFFLINE_SCHEMA_VERSION,
      snapshotKey: validatedPack.snapshotKey,
      completedQids:
        previousCheckpoint.success &&
        previousCheckpoint.data.totalAssets === totalAssets
          ? previousCheckpoint.data.completedQids
          : [],
      totalAssets,
      updatedAt: now,
    };
    const currentStateValue = await requestResult(
      transaction.objectStore(STORE_META).get(PACK_STATE_KEY),
    );
    const currentState = offlinePackStateSchema.safeParse(currentStateValue);
    const nextState: OfflinePackState = {
      schemaVersion: OFFLINE_SCHEMA_VERSION,
      status: "downloading",
      activeSnapshotKey: currentState.success
        ? currentState.data.activeSnapshotKey
        : null,
      stagedSnapshotKey: validatedPack.snapshotKey,
      downloadedAssets: checkpoint.completedQids.length,
      totalAssets,
      error: null,
      updatedAt: now,
    };
    transaction
      .objectStore(STORE_PACKS)
      .put(validatedPack, validatedPack.snapshotKey);
    downloads.put(checkpoint, validatedPack.snapshotKey);
    transaction.objectStore(STORE_META).put(nextState, PACK_STATE_KEY);
    await transactionDone(transaction);
    return checkpoint;
  });
}

export async function saveOfflineDownloadCheckpoint(
  checkpoint: OfflineDownloadCheckpoint,
): Promise<void> {
  const validated = offlineDownloadCheckpointSchema.parse(checkpoint);
  await withDatabase(async (database) => {
    const transaction = database.transaction(
      [STORE_META, STORE_DOWNLOADS],
      "readwrite",
    );
    const meta = transaction.objectStore(STORE_META);
    const stateValue = await requestResult(meta.get(PACK_STATE_KEY));
    const state = offlinePackStateSchema.parse(stateValue);
    if (state.stagedSnapshotKey !== validated.snapshotKey) {
      transaction.abort();
      throw new Error(
        "The download checkpoint does not match the staged pack.",
      );
    }
    transaction
      .objectStore(STORE_DOWNLOADS)
      .put(validated, validated.snapshotKey);
    meta.put(
      {
        ...state,
        status: "downloading",
        downloadedAssets: validated.completedQids.length,
        error: null,
        updatedAt: validated.updatedAt,
      } satisfies OfflinePackState,
      PACK_STATE_KEY,
    );
    await transactionDone(transaction);
  });
}

export async function markOfflineDownloadFailed(
  snapshotKey: string,
  error: unknown,
): Promise<void> {
  await withDatabase(async (database) => {
    const transaction = database.transaction(STORE_META, "readwrite");
    const store = transaction.objectStore(STORE_META);
    const value = await requestResult(store.get(PACK_STATE_KEY));
    const current = offlinePackStateSchema.safeParse(value);
    const now = new Date().toISOString();
    store.put(
      {
        ...(current.success ? current.data : createEmptyOfflinePackState(now)),
        status: "error",
        stagedSnapshotKey: snapshotKey,
        error:
          error instanceof Error
            ? error.message
            : "The offline pack download failed.",
        updatedAt: now,
      } satisfies OfflinePackState,
      PACK_STATE_KEY,
    );
    await transactionDone(transaction);
  });
}

export async function activateOfflinePack(
  snapshotKey: string,
): Promise<string | null> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(
      [STORE_META, STORE_PACKS, STORE_DOWNLOADS, STORE_ROUNDS],
      "readwrite",
    );
    const packValue = await requestResult(
      transaction.objectStore(STORE_PACKS).get(snapshotKey),
    );
    offlineCountryPackSchema.parse(packValue);
    const meta = transaction.objectStore(STORE_META);
    const state = offlinePackStateSchema.parse(
      await requestResult(meta.get(PACK_STATE_KEY)),
    );
    if (
      state.stagedSnapshotKey !== snapshotKey ||
      state.downloadedAssets !== state.totalAssets
    ) {
      transaction.abort();
      throw new Error("The staged offline pack is incomplete.");
    }
    const previousSnapshotKey = state.activeSnapshotKey;
    const activeRoundValue = await requestResult(
      transaction.objectStore(STORE_ROUNDS).get(ACTIVE_ROUND_KEY),
    );
    const activeRound = offlineRoundStateSchema.safeParse(activeRoundValue);
    const previousPackIsInUse =
      Boolean(previousSnapshotKey) &&
      activeRound.success &&
      activeRound.data.snapshotKey === previousSnapshotKey;
    meta.put(
      {
        ...state,
        status: "ready",
        activeSnapshotKey: snapshotKey,
        stagedSnapshotKey: null,
        error: null,
        updatedAt: new Date().toISOString(),
      } satisfies OfflinePackState,
      PACK_STATE_KEY,
    );
    transaction.objectStore(STORE_DOWNLOADS).delete(snapshotKey);
    if (
      previousSnapshotKey &&
      previousSnapshotKey !== snapshotKey &&
      !previousPackIsInUse
    ) {
      transaction.objectStore(STORE_PACKS).delete(previousSnapshotKey);
    }
    await transactionDone(transaction);
    return previousPackIsInUse ? null : previousSnapshotKey;
  });
}

export async function getActiveOfflineCountryPack(): Promise<OfflineCountryPack | null> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(
      [STORE_META, STORE_PACKS],
      "readonly",
    );
    const stateValue = await requestResult(
      transaction.objectStore(STORE_META).get(PACK_STATE_KEY),
    );
    const state = offlinePackStateSchema.safeParse(stateValue);
    if (!state.success || !state.data.activeSnapshotKey) {
      await transactionDone(transaction);
      return null;
    }
    const packValue = await requestResult(
      transaction.objectStore(STORE_PACKS).get(state.data.activeSnapshotKey),
    );
    await transactionDone(transaction);
    const pack = offlineCountryPackSchema.safeParse(packValue);
    return pack.success ? pack.data : null;
  });
}

export async function getOfflineCountryPack(
  snapshotKey: string,
): Promise<OfflineCountryPack | null> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(STORE_PACKS, "readonly");
    const value = await requestResult(
      transaction.objectStore(STORE_PACKS).get(snapshotKey),
    );
    await transactionDone(transaction);
    const pack = offlineCountryPackSchema.safeParse(value);
    return pack.success ? pack.data : null;
  });
}

export async function saveActiveOfflineRound(
  state: OfflineRoundState | null,
): Promise<void> {
  let staleSnapshotKey: string | null = null;
  await withDatabase(async (database) => {
    const transaction = database.transaction(
      [STORE_META, STORE_PACKS, STORE_ROUNDS],
      "readwrite",
    );
    const rounds = transaction.objectStore(STORE_ROUNDS);
    if (state) {
      rounds.put(offlineRoundStateSchema.parse(state), ACTIVE_ROUND_KEY);
    } else {
      const previousValue = await requestResult(rounds.get(ACTIVE_ROUND_KEY));
      const previous = offlineRoundStateSchema.safeParse(previousValue);
      const packStateValue = await requestResult(
        transaction.objectStore(STORE_META).get(PACK_STATE_KEY),
      );
      const packState = offlinePackStateSchema.safeParse(packStateValue);
      if (
        previous.success &&
        packState.success &&
        previous.data.snapshotKey !== packState.data.activeSnapshotKey
      ) {
        staleSnapshotKey = previous.data.snapshotKey;
        transaction.objectStore(STORE_PACKS).delete(staleSnapshotKey);
      }
      rounds.delete(ACTIVE_ROUND_KEY);
    }
    await transactionDone(transaction);
  });
  if (staleSnapshotKey && typeof caches !== "undefined") {
    await caches.delete(getOfflineCountryCacheName(staleSnapshotKey));
  }
}

export async function getActiveOfflineRound(): Promise<OfflineRoundState | null> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(STORE_ROUNDS, "readonly");
    const value = await requestResult(
      transaction.objectStore(STORE_ROUNDS).get(ACTIVE_ROUND_KEY),
    );
    await transactionDone(transaction);
    const result = offlineRoundStateSchema.safeParse(value);
    return result.success ? result.data : null;
  });
}

export function createEmptyOfflineModeStats(
  mode: GameMode,
  now = new Date().toISOString(),
): OfflineModeStats {
  return {
    schemaVersion: OFFLINE_SCHEMA_VERSION,
    mode,
    roundsPlayed: 0,
    roundsWon: 0,
    totalScore: 0,
    bestScore: 0,
    currentStreak: 0,
    bestStreak: 0,
    updatedAt: now,
  };
}

export function applyOfflineResultToStats(
  current: OfflineModeStats,
  result: { isCorrect: boolean; score: number },
  now = new Date().toISOString(),
): OfflineModeStats {
  const nextStreak = result.isCorrect ? current.currentStreak + 1 : 0;
  return offlineModeStatsSchema.parse({
    ...current,
    roundsPlayed: current.roundsPlayed + 1,
    roundsWon: current.roundsWon + (result.isCorrect ? 1 : 0),
    totalScore: current.totalScore + result.score,
    bestScore: Math.max(current.bestScore, result.score),
    currentStreak: nextStreak,
    bestStreak: Math.max(current.bestStreak, nextStreak),
    updatedAt: now,
  });
}

export async function getOfflineModeStats(
  mode: GameMode,
): Promise<OfflineModeStats> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(STORE_STATS, "readonly");
    const value = await requestResult(
      transaction.objectStore(STORE_STATS).get(mode),
    );
    await transactionDone(transaction);
    const parsed = offlineModeStatsSchema.safeParse(value);
    return parsed.success ? parsed.data : createEmptyOfflineModeStats(mode);
  });
}

export async function recordOfflineResult(
  mode: GameMode,
  result: { isCorrect: boolean; score: number },
): Promise<OfflineModeStats> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(STORE_STATS, "readwrite");
    const store = transaction.objectStore(STORE_STATS);
    const value = await requestResult(store.get(mode));
    const parsed = offlineModeStatsSchema.safeParse(value);
    const next = applyOfflineResultToStats(
      parsed.success ? parsed.data : createEmptyOfflineModeStats(mode),
      result,
    );
    store.put(next, mode);
    await transactionDone(transaction);
    return next;
  });
}

export async function deleteOfflineCountryData(
  cacheStorage: Pick<CacheStorage, "keys" | "delete"> = caches,
): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(
      [STORE_META, STORE_PACKS, STORE_DOWNLOADS, STORE_ROUNDS, STORE_STATS],
      "readwrite",
    );
    for (const storeName of [
      STORE_META,
      STORE_PACKS,
      STORE_DOWNLOADS,
      STORE_ROUNDS,
      STORE_STATS,
    ]) {
      transaction.objectStore(storeName).clear();
    }
    await transactionDone(transaction);
  } finally {
    database.close();
  }
  const cacheNames = await cacheStorage.keys();
  await Promise.all(
    cacheNames
      .filter((name) => name.startsWith(OFFLINE_CACHE_PREFIX))
      .map((name) => cacheStorage.delete(name)),
  );
}

export async function requestPersistentOfflineStorage(): Promise<
  boolean | null
> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist)
    return null;
  return navigator.storage.persist();
}
