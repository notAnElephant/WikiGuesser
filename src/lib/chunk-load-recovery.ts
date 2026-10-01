const RELOAD_FLAG_KEY = "wikiguesser:chunk-reload-at";

// A second chunk failure inside this window means the reload did not help,
// so the boundary shows the retry screen instead of reloading again.
export const CHUNK_RELOAD_WINDOW_MS = 30_000;

const CHUNK_LOAD_MESSAGE =
  /Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

type ReloadFlagStorage = Pick<Storage, "getItem" | "setItem">;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "ChunkLoadError" || CHUNK_LOAD_MESSAGE.test(error.message);
}

export function claimChunkReload(
  getStorage: () => ReloadFlagStorage,
  now = Date.now(),
): boolean {
  try {
    const storage = getStorage();
    const lastReloadAt = Number(storage.getItem(RELOAD_FLAG_KEY));

    if (lastReloadAt && now - lastReloadAt < CHUNK_RELOAD_WINDOW_MS) {
      return false;
    }

    storage.setItem(RELOAD_FLAG_KEY, String(now));
    return true;
  } catch {
    // Without storage we cannot detect a reload loop, so do not reload.
    return false;
  }
}
