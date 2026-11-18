import { afterEach, describe, expect, it, vi } from "vitest";

const snapshotVersion = vi.hoisted(() => ({ findFirst: vi.fn() }));

vi.mock("@/src/lib/env", () => ({ env: { databaseUrl: "postgres://test" } }));
vi.mock("@/src/lib/repository/prisma", () => ({
  getPrismaClient: () => ({ snapshotVersion }),
}));

describe("snapshot repository cache", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("keeps the loaded snapshot cached for five minutes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T12:00:00Z"));
    snapshotVersion.findFirst.mockResolvedValue({
      key: "snapshot-1",
      sourceFingerprint: "fingerprint",
      createdAt: new Date("2026-11-17T11:00:00Z"),
      entities: [],
    });

    const { getLatestSnapshot } = await import(
      "@/src/lib/repository/snapshot-repository"
    );
    await getLatestSnapshot();
    vi.advanceTimersByTime(5 * 60_000 - 1);
    await getLatestSnapshot();
    expect(snapshotVersion.findFirst).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await getLatestSnapshot();
    expect(snapshotVersion.findFirst).toHaveBeenCalledTimes(2);
  });
});
