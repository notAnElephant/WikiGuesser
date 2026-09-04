import { beforeEach, describe, expect, it, vi } from "vitest";

import { demoSnapshot } from "@/src/lib/content/demo-snapshot";
import {
  buildDuelView,
  createDuel,
  guessDuelRound,
  revealDuelClue,
  getDuel,
} from "@/src/lib/game/duel-service";
import type { DuelWithDetails } from "@/src/lib/repository/duel-repository";

const repository = vi.hoisted(() => ({
  acceptDuel: vi.fn(),
  completeDuelIfReady: vi.fn(async () => false),
  createDuel: vi.fn(),
  ensureDuelUserProfile: vi.fn(),
  getDuelByInviteCode: vi.fn(),
  getDuelByInviteCodeOrRefresh: vi.fn(),
  getOrCreateDuelAttempt: vi.fn(),
  getOrRefreshDuelByInviteCode: vi.fn(),
  updateDuelAttempt: vi.fn(),
}));

vi.mock("@/src/lib/repository/duel-repository", () => ({
  acceptDuel: repository.acceptDuel,
  completeDuelIfReady: repository.completeDuelIfReady,
  createDuel: repository.createDuel,
  ensureDuelUserProfile: repository.ensureDuelUserProfile,
  getDuelByInviteCode: repository.getDuelByInviteCode,
  getOrCreateDuelAttempt: repository.getOrCreateDuelAttempt,
  getOrRefreshDuelByInviteCode: repository.getOrRefreshDuelByInviteCode,
  updateDuelAttempt: repository.updateDuelAttempt,
}));

vi.mock("@/src/lib/repository/snapshot-repository", () => ({
  getLatestSnapshot: vi.fn(async () => demoSnapshot),
}));

vi.mock("node:crypto", async () => {
  const actual =
    await vi.importActual<typeof import("node:crypto")>("node:crypto");
  return {
    ...actual,
    randomUUID: vi.fn(() => "fixed-seed"),
    randomBytes: vi.fn(() => ({ toString: () => "invite-123" })),
  };
});

const date = new Date("2026-04-09T12:00:00.000Z");

function attempt(
  userProfileId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `${userProfileId}-attempt`,
    duelRoundId: "round-1",
    userProfileId,
    revealedClueKeys: [],
    guesses: [],
    canGuess: true,
    version: 7,
    score: null,
    isCorrect: null,
    completedAt: null,
    givenUp: false,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  };
}

function duel(overrides: Record<string, unknown> = {}) {
  const entity = demoSnapshot.entities[0];
  return {
    id: "duel-1",
    inviteCode: "abc123",
    status: "ACTIVE",
    category: "countries",
    mode: "blurred-lines",
    roundCount: 1,
    snapshotKey: demoSnapshot.key,
    challengerId: "challenger",
    opponentId: "opponent",
    expiresAt: new Date("2026-04-16T12:00:00.000Z"),
    createdAt: date,
    startedAt: date,
    completedAt: null,
    challenger: { id: "challenger", displayName: "Ada", imageUrl: null },
    opponent: { id: "opponent", displayName: "Grace", imageUrl: null },
    snapshotVersion: null,
    rounds: [
      {
        id: "round-1",
        duelId: "duel-1",
        position: 1,
        snapshotEntityId: entity.id,
        entityQid: entity.qid,
        canonicalAnswer: entity.canonicalAnswer,
        acceptedAnswers: entity.acceptedAnswers,
        clues: entity.clues,
        metadata: entity.metadata,
        snapshotEntity: null,
        attempts: [],
      },
    ],
    ...overrides,
  } as unknown as DuelWithDetails;
}

describe("duel service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("only exposes revealed clues to the current player", () => {
    const current = duel({
      rounds: [
        {
          ...duel().rounds[0],
          attempts: [
            attempt("challenger", { revealedClueKeys: ["continent"] }),
          ],
        },
      ],
    });
    const view = buildDuelView(current, "challenger", "https://example.test");
    const round = view.rounds[0];

    expect(round.clues.find((clue) => clue.key === "continent")).toMatchObject({
      value: "Europe",
      isRevealed: true,
    });
    expect(round.clues.find((clue) => clue.key === "capital")).toMatchObject({
      value: null,
      isRevealed: false,
    });
    expect(JSON.stringify(view)).not.toContain("Paris");
  });

  it("selects distinct deterministic rounds and passes the stored creation shape", async () => {
    const entities = demoSnapshot.entities.filter(
      (entity) => entity.category === "countries",
    );
    const snapshot = {
      ...demoSnapshot,
      entities: [...entities, { ...entities[0], id: "countries-france-copy" }],
    };
    const getLatest = await import("@/src/lib/repository/snapshot-repository");
    vi.mocked(getLatest.getLatestSnapshot).mockResolvedValue(snapshot);
    repository.ensureDuelUserProfile.mockResolvedValue({
      id: "challenger",
      clerkUserId: "clerk-1",
      displayName: "Ada",
      imageUrl: null,
    });
    repository.createDuel.mockImplementation(async (input) =>
      duel({
        inviteCode: input.inviteCode,
        roundCount: input.roundCount,
        rounds: input.rounds.map((round: unknown, index: number) => ({
          ...duel().rounds[0],
          ...(round as object),
          id: `round-${index + 1}`,
          position: index + 1,
        })),
      }),
    );

    const result = await createDuel(
      { category: "countries", mode: "classic", roundCount: 3 },
      "clerk-1",
      "https://example.test",
    );
    const input = repository.createDuel.mock.calls[0][0];
    expect(input.rounds).toHaveLength(3);
    expect(
      new Set(
        input.rounds.map(
          (round: { snapshotEntityId?: string }) => round.snapshotEntityId,
        ),
      ).size,
    ).toBe(3);
    expect(input.roundCount).toBe(3);
    expect(input.snapshotKey).toBe(snapshot.key);
    expect(result.inviteUrl).toBe("https://example.test/duel/invite-123");
  });

  it("rejects a nonparticipant from reading an occupied duel", async () => {
    repository.ensureDuelUserProfile.mockResolvedValue({ id: "outsider" });
    repository.getOrRefreshDuelByInviteCode.mockResolvedValue(duel());
    await expect(getDuel("abc123", "clerk-outsider")).rejects.toThrow(
      "belongs to two other players",
    );
  });

  it("passes the optimistic version when revealing a clue", async () => {
    const current = duel({
      rounds: [{ ...duel().rounds[0], attempts: [attempt("challenger")] }],
    });
    repository.ensureDuelUserProfile.mockResolvedValue({ id: "challenger" });
    repository.getOrRefreshDuelByInviteCode.mockResolvedValue(current);
    repository.getDuelByInviteCode.mockResolvedValue(current);
    repository.updateDuelAttempt.mockResolvedValue(
      attempt("challenger", { version: 8 }),
    );
    await revealDuelClue(
      "abc123",
      1,
      { clueKey: "continent", version: 7 },
      "clerk",
    );
    expect(repository.updateDuelAttempt).toHaveBeenCalledWith(
      "challenger-attempt",
      "challenger",
      7,
      expect.objectContaining({ canGuess: true }),
    );
  });

  it("passes the optimistic version when guessing", async () => {
    const current = duel({
      rounds: [{ ...duel().rounds[0], attempts: [attempt("challenger")] }],
    });
    repository.ensureDuelUserProfile.mockResolvedValue({ id: "challenger" });
    repository.getOrRefreshDuelByInviteCode.mockResolvedValue(current);
    repository.getDuelByInviteCode.mockResolvedValue(current);
    repository.updateDuelAttempt.mockResolvedValue(
      attempt("challenger", { version: 8 }),
    );
    await guessDuelRound("abc123", 1, { guess: "France", version: 7 }, "clerk");
    expect(repository.updateDuelAttempt).toHaveBeenCalledWith(
      "challenger-attempt",
      "challenger",
      7,
      expect.objectContaining({ isCorrect: true }),
    );
  });
});
