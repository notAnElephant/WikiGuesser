import type {
  FriendChallenge,
  FriendChallengeAttempt,
  Prisma,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  challengeActionSchema,
  createChallengeSchema,
} from "@/src/lib/api-schemas";
import { demoSnapshot } from "@/src/lib/content/demo-snapshot";
import {
  createFriendChallenge,
  getFriendChallenge,
  playFriendChallenge,
} from "@/src/lib/game/challenge-service";

const { db, getLatestSnapshot } = vi.hoisted(() => ({
  db: {
    friendChallenge: { create: vi.fn(), findUnique: vi.fn() },
    friendChallengeAttempt: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  getLatestSnapshot: vi.fn(),
}));
vi.mock("@/src/lib/repository/prisma", () => ({ getPrismaClient: () => db }));
vi.mock("@/src/lib/repository/snapshot-repository", () => ({
  getLatestSnapshot,
}));

describe("friend challenges", () => {
  let challenge: FriendChallenge;
  let attempts: Map<string, FriendChallengeAttempt>;
  const countryOptions = demoSnapshot.entities
    .filter((entity) => entity.category === "countries")
    .map((entity) => entity.canonicalAnswer)
    .sort();

  beforeEach(() => {
    vi.resetAllMocks();
    attempts = new Map();
    challenge = {
      id: "challenge-1",
      code: "opaque-code",
      creatorClerkUserId: "creator",
      mode: "classic",
      entity: structuredClone({
        ...demoSnapshot.entities[0],
        countryOptions,
      }) as unknown as Prisma.JsonValue,
      createdAt: new Date(),
    };
    getLatestSnapshot.mockResolvedValue(demoSnapshot);
    db.friendChallenge.findUnique.mockImplementation(async ({ where }) =>
      where.code === challenge.code ? structuredClone(challenge) : null,
    );
    db.friendChallenge.create.mockImplementation(async ({ data }) => ({
      ...challenge,
      ...data,
    }));
    db.friendChallengeAttempt.findUnique.mockImplementation(async ({ where }) =>
      structuredClone(attempts.get(where.challengeId_actorId.actorId) ?? null),
    );
    db.friendChallengeAttempt.upsert.mockImplementation(async ({ create }) => {
      if (!attempts.has(create.actorId))
        attempts.set(create.actorId, {
          ...create,
          id: `attempt-${create.actorId}`,
          version: 0,
          guesses: [],
          score: 0,
          isCorrect: false,
          completedAt: null,
          createdAt: new Date(),
        });
      return structuredClone(attempts.get(create.actorId));
    });
    db.friendChallengeAttempt.updateMany.mockImplementation(
      async ({ where, data }) => {
        const current = attempts.get(where.actorId);
        if (
          !current ||
          current.version !== where.version ||
          current.completedAt
        )
          return { count: 0 };
        attempts.set(where.actorId, {
          ...current,
          ...data,
          version: current.version + 1,
        });
        return { count: 1 };
      },
    );
  });

  it("creates an opaque link and freezes the selected country and clues", async () => {
    const result = await createFriendChallenge(
      { country: "French Republic", mode: "classic" },
      "creator",
    );
    expect(result.path).toBe(`/challenge/${result.code}`);
    expect(result.code).toMatch(/^[\w-]{22}$/);
    expect(JSON.stringify(result)).not.toMatch(/france|Q142/i);
    expect(db.friendChallenge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        creatorClerkUserId: "creator",
        mode: "classic",
        entity: { ...demoSnapshot.entities[0], countryOptions },
      }),
    });
  });

  it("rejects unavailable answers and countries without playable clues", async () => {
    await expect(
      createFriendChallenge(
        { country: "Atlantis", mode: "classic" },
        "creator",
      ),
    ).rejects.toThrow("not available");
    getLatestSnapshot.mockResolvedValue({
      ...demoSnapshot,
      entities: [{ ...demoSnapshot.entities[0], clues: [] }],
    });
    await expect(
      createFriendChallenge({ country: "France", mode: "classic" }, "creator"),
    ).rejects.toThrow("not available");
    expect(db.friendChallenge.create).not.toHaveBeenCalled();
  });

  it("returns a spoiler-free invitation, and never exposes another player's attempt", async () => {
    await playFriendChallenge(challenge.code, "guest:a", { action: "start" });
    await playFriendChallenge(challenge.code, "guest:a", {
      action: "guess",
      version: 0,
      guess: "France",
    });
    const invitation = await getFriendChallenge(challenge.code, "guest:b");
    expect(invitation).toEqual({
      code: challenge.code,
      mode: "classic",
      countryOptions,
      isCreator: false,
      progress: null,
    });
    expect(
      JSON.stringify((await getFriendChallenge(challenge.code, null)).progress),
    ).not.toMatch(/France|Q142|Paris/);
  });

  it.each(["classic", "blurred-lines"] as const)(
    "hides unrevealed clue values and entity identifiers in %s",
    async (mode) => {
      challenge.mode = mode;
      const view = await playFriendChallenge(challenge.code, "guest:a", {
        action: "start",
      });
      expect(view.countryOptions).toEqual(countryOptions);
      const json = JSON.stringify(view.progress);
      expect(json).not.toMatch(/France|Q142|Paris|551,695|Flag%20/);
      expect(
        view.progress?.clues
          .filter((clue) => !clue.isRevealed)
          .every((clue) => clue.value === null && clue.prefetchedValue === ""),
      ).toBe(true);
      expect(view.progress?.revealedClues).toHaveLength(
        mode === "classic" ? 1 : 0,
      );
    },
  );

  it("redacts country-specific currency qualifiers on the server", async () => {
    challenge.mode = "blurred-lines";
    const entity =
      challenge.entity as unknown as (typeof demoSnapshot.entities)[0];
    entity.clues.find((clue) => clue.key === "currency")!.value =
      "French franc";
    await playFriendChallenge(challenge.code, "guest:a", { action: "start" });
    const view = await playFriendChallenge(challenge.code, "guest:a", {
      action: "reveal",
      version: 0,
      clueKey: "currency",
    });
    expect(JSON.stringify(view.progress)).not.toMatch(/French|France/);
    expect(view.progress?.revealedClues[0].value).toBe("??? franc");
  });

  it("keeps progress independent and resumes instead of resetting on start", async () => {
    await playFriendChallenge(challenge.code, "guest:a", { action: "start" });
    await playFriendChallenge(challenge.code, "guest:a", {
      action: "guess",
      version: 0,
      guess: "Japan",
    });
    const resumed = await playFriendChallenge(challenge.code, "guest:a", {
      action: "start",
    });
    const other = await playFriendChallenge(challenge.code, "guest:b", {
      action: "start",
    });
    expect(resumed.progress).toMatchObject({
      version: 1,
      guesses: [{ name: "Japan" }],
      isComplete: false,
    });
    expect(resumed.progress?.revealedClues).toHaveLength(2);
    expect(other.progress).toMatchObject({ version: 0, guesses: [] });
    expect(await getFriendChallenge(challenge.code, "guest:a")).toEqual(
      resumed,
    );
  });

  it.each(["classic", "blurred-lines"] as const)(
    "uses frozen clues and accepted answers after a snapshot update in %s",
    async (mode) => {
      challenge.mode = mode;
      getLatestSnapshot.mockResolvedValue({ ...demoSnapshot, entities: [] });
      await playFriendChallenge(challenge.code, "guest:a", { action: "start" });
      if (mode === "blurred-lines")
        await playFriendChallenge(challenge.code, "guest:a", {
          action: "reveal",
          version: 0,
          clueKey: "continent",
        });
      const view = await playFriendChallenge(challenge.code, "guest:a", {
        action: "guess",
        version: mode === "classic" ? 0 : 1,
        guess: "French Republic",
      });
      expect(view.progress).toMatchObject({
        isComplete: true,
        isCorrect: true,
        canonicalAnswer: "France",
        score: 100,
      });
      expect(
        view.progress?.clues.find((clue) => clue.key === "capital")?.value,
      ).toBe("Paris");
    },
  );

  it("halves the score for a map guess", async () => {
    await playFriendChallenge(challenge.code, "guest:a", { action: "start" });
    const view = await playFriendChallenge(challenge.code, "guest:a", {
      action: "guess",
      version: 0,
      guess: "France",
      method: "map",
    });
    expect(view.progress?.score).toBe(50);
  });

  it("keeps the original country roster playable after a country leaves the active snapshot", async () => {
    getLatestSnapshot.mockResolvedValue({ ...demoSnapshot, entities: [] });
    const view = await playFriendChallenge(challenge.code, "guest:a", {
      action: "start",
    });
    expect(view.countryOptions).toEqual(countryOptions);
    const miss = await playFriendChallenge(challenge.code, "guest:a", {
      action: "guess",
      version: 0,
      guess: "Japan",
    });
    expect(miss.progress?.guesses[0]).toMatchObject({
      name: "Japan",
      mapData: null,
    });
  });

  it("enforces Choose Clues guess gating and late clue locking", async () => {
    challenge.mode = "blurred-lines";
    await playFriendChallenge(challenge.code, "guest:a", { action: "start" });
    await expect(
      playFriendChallenge(challenge.code, "guest:a", {
        action: "guess",
        version: 0,
        guess: "France",
      }),
    ).rejects.toThrow("Reveal a clue");
    await expect(
      playFriendChallenge(challenge.code, "guest:a", {
        action: "reveal",
        version: 0,
        clueKey: "capital",
      }),
    ).rejects.toThrow("Reveal");
    await playFriendChallenge(challenge.code, "guest:a", {
      action: "reveal",
      version: 0,
      clueKey: "continent",
    });
    const miss = await playFriendChallenge(challenge.code, "guest:a", {
      action: "guess",
      version: 1,
      guess: "Japan",
    });
    expect(miss.progress).toMatchObject({ canGuess: false, isComplete: false });
  });

  it("rejects invalid and duplicate guesses without consuming a clue", async () => {
    await playFriendChallenge(challenge.code, "guest:a", { action: "start" });
    await expect(
      playFriendChallenge(challenge.code, "guest:a", {
        action: "guess",
        version: 0,
        guess: "Atlantis",
      }),
    ).rejects.toThrow("listed country");
    await playFriendChallenge(challenge.code, "guest:a", {
      action: "guess",
      version: 0,
      guess: "Japan",
    });
    await expect(
      playFriendChallenge(challenge.code, "guest:a", {
        action: "guess",
        version: 1,
        guess: "Nippon",
      }),
    ).rejects.toThrow("Already tried");
    expect(attempts.get("guest:a")?.version).toBe(1);
  });

  it("finishes with zero points on the final miss in both modes", async () => {
    const entity =
      challenge.entity as unknown as (typeof demoSnapshot.entities)[0];
    entity.clues = entity.clues.slice(0, 1);
    for (const mode of ["classic", "blurred-lines"] as const) {
      challenge.mode = mode;
      const actor = `guest:${mode}`;
      await playFriendChallenge(challenge.code, actor, { action: "start" });
      if (mode === "blurred-lines")
        await playFriendChallenge(challenge.code, actor, {
          action: "reveal",
          version: 0,
          clueKey: "continent",
        });
      const view = await playFriendChallenge(challenge.code, actor, {
        action: "guess",
        version: mode === "classic" ? 0 : 1,
        guess: "Japan",
      });
      expect(view.progress).toMatchObject({
        isComplete: true,
        isCorrect: false,
        canGuess: false,
        score: 0,
        canonicalAnswer: "France",
      });
    }
  });

  it("persists give-up, prevents replay, and never changes a completed score", async () => {
    await playFriendChallenge(challenge.code, "guest:a", { action: "start" });
    const view = await playFriendChallenge(challenge.code, "guest:a", {
      action: "give-up",
      version: 0,
    });
    expect(view.progress).toMatchObject({
      isComplete: true,
      isCorrect: false,
      score: 0,
      canonicalAnswer: "France",
    });
    expect(
      (
        await playFriendChallenge(challenge.code, "guest:a", {
          action: "start",
        })
      ).progress,
    ).toEqual(view.progress);
    await expect(
      playFriendChallenge(challenge.code, "guest:a", {
        action: "guess",
        version: 1,
        guess: "France",
      }),
    ).rejects.toThrow("already completed");
  });

  it("rejects stale and racing requests using an atomic version check", async () => {
    await playFriendChallenge(challenge.code, "guest:a", { action: "start" });
    const outcomes = await Promise.allSettled([
      playFriendChallenge(challenge.code, "guest:a", {
        action: "guess",
        version: 0,
        guess: "France",
      }),
      playFriendChallenge(challenge.code, "guest:a", {
        action: "give-up",
        version: 0,
      }),
    ]);
    expect(
      outcomes.filter((outcome) => outcome.status === "fulfilled"),
    ).toHaveLength(1);
    expect(attempts.get("guest:a")?.version).toBe(1);
    expect(db.friendChallengeAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "attempt-guest:a",
          actorId: "guest:a",
          version: 0,
          completedAt: null,
        },
      }),
    );
  });

  it("rejects missing challenges, unstarted attempts, and creator play", async () => {
    await expect(getFriendChallenge("missing", null)).rejects.toThrow(
      "does not exist",
    );
    await expect(
      playFriendChallenge(challenge.code, "guest:a", {
        action: "guess",
        version: 0,
        guess: "France",
      }),
    ).rejects.toThrow("Start");
    await expect(
      playFriendChallenge(challenge.code, "user:creator", { action: "start" }),
    ).rejects.toThrow("You chose this answer");
    expect(
      (await getFriendChallenge(challenge.code, "user:creator")).isCreator,
    ).toBe(true);
  });

  it("validates untrusted creation and mutation inputs", () => {
    expect(
      createChallengeSchema.safeParse({ country: "France", mode: "unknown" })
        .success,
    ).toBe(false);
    for (const input of [
      { action: "guess", guess: "France" },
      { action: "guess", guess: "France", version: -1 },
      { action: "reveal", clueKey: "", version: 0 },
      { action: "unknown" },
    ])
      expect(challengeActionSchema.safeParse(input).success).toBe(false);
  });
});
