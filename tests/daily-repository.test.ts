import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { demoSnapshot } from "@/src/lib/content/demo-snapshot";
import { getOrCreateDailyChallenge } from "@/src/lib/repository/daily-repository";

const { dailyChallenge, getLatestSnapshot } = vi.hoisted(() => ({
  dailyChallenge: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  getLatestSnapshot: vi.fn(),
}));

vi.mock("@/src/lib/repository/prisma", () => ({
  getPrismaClient: () => ({ dailyChallenge }),
}));
vi.mock("@/src/lib/repository/snapshot-repository", () => ({
  getLatestSnapshot,
}));
vi.mock("@/src/lib/auth/user-profile", () => ({}));

describe("daily challenge creation", () => {
  const challenge = { id: "winner", dayKey: "2026-10-18" };

  beforeEach(() => {
    vi.resetAllMocks();
    dailyChallenge.findUnique.mockResolvedValue(null);
    getLatestSnapshot.mockResolvedValue(demoSnapshot);
  });

  it("returns existing challenges without loading a snapshot or writing", async () => {
    dailyChallenge.findUnique.mockResolvedValue(challenge);

    await expect(
      getOrCreateDailyChallenge("countries", "classic", challenge.dayKey),
    ).resolves.toBe(challenge);
    expect(getLatestSnapshot).not.toHaveBeenCalled();
    expect(dailyChallenge.create).not.toHaveBeenCalled();
  });

  it("creates a missing challenge", async () => {
    dailyChallenge.create.mockResolvedValue(challenge);

    await expect(
      getOrCreateDailyChallenge("countries", "classic", challenge.dayKey),
    ).resolves.toBe(challenge);
    expect(dailyChallenge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dayKey: challenge.dayKey,
        category: "countries",
        mode: "classic",
      }),
    });
  });

  it("returns the winning row when another request creates it first", async () => {
    dailyChallenge.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7",
      }),
    );
    dailyChallenge.findUniqueOrThrow.mockResolvedValue(challenge);

    await expect(
      getOrCreateDailyChallenge("countries", "classic", challenge.dayKey),
    ).resolves.toBe(challenge);
    expect(dailyChallenge.findUniqueOrThrow).toHaveBeenCalledWith({
      where: {
        dayKey_category_mode: {
          dayKey: challenge.dayKey,
          category: "countries",
          mode: "classic",
        },
      },
    });
  });

  it("propagates other database failures", async () => {
    const error = new Error("Connection lost");
    dailyChallenge.create.mockRejectedValue(error);

    await expect(
      getOrCreateDailyChallenge("countries", "classic", challenge.dayKey),
    ).rejects.toBe(error);
    expect(dailyChallenge.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
