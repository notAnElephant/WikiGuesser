import { describe, expect, it } from "vitest";

import {
  CHUNK_RELOAD_WINDOW_MS,
  claimChunkReload,
  isChunkLoadError,
} from "@/src/lib/chunk-load-recovery";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("isChunkLoadError", () => {
  it("detects webpack chunk load errors", () => {
    const error = new Error("Loading chunk 3242 failed.\n(error: /_next/static/chunks/3242.js)");
    error.name = "ChunkLoadError";

    expect(isChunkLoadError(error)).toBe(true);
    expect(isChunkLoadError(new Error("Loading CSS chunk 12 failed."))).toBe(true);
  });

  it("detects failed dynamic imports", () => {
    expect(
      isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: /x.js")),
    ).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isChunkLoadError(new Error("Minified React error #418"))).toBe(false);
    expect(isChunkLoadError("Loading chunk 1 failed")).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe("claimChunkReload", () => {
  it("allows one reload per window", () => {
    const storage = createStorage();

    expect(claimChunkReload(() => storage, 1_000)).toBe(true);
    expect(claimChunkReload(() => storage, 2_000)).toBe(false);
  });

  it("allows a new reload after the window ends", () => {
    const storage = createStorage();

    expect(claimChunkReload(() => storage, 1_000)).toBe(true);
    expect(claimChunkReload(() => storage, 1_000 + CHUNK_RELOAD_WINDOW_MS)).toBe(true);
  });

  it("does not reload when storage is not available", () => {
    expect(
      claimChunkReload(() => {
        throw new DOMException("denied", "SecurityError");
      }),
    ).toBe(false);
  });
});
