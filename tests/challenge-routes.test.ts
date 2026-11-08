import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as create } from "@/app/api/challenges/route";
import { GET, POST } from "@/app/api/challenges/[code]/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getActorId: vi.fn(),
  getOptionalActorId: vi.fn(),
  createFriendChallenge: vi.fn(),
  getFriendChallenge: vi.fn(),
  playFriendChallenge: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/src/lib/auth/actor", () => mocks);
vi.mock("@/src/lib/game/challenge-service", () => mocks);

const context = { params: Promise.resolve({ code: "opaque" }) };
const request = (body: unknown) =>
  new Request("http://localhost/api/challenges/opaque", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("challenge API routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ userId: null });
    mocks.getOptionalActorId.mockResolvedValue(null);
    mocks.getActorId.mockResolvedValue("guest:browser");
  });

  it("requires sign-in to create and never calls creation for guests", async () => {
    const response = await create(
      request({ country: "France", mode: "classic" }),
    );
    expect(response.status).toBe(401);
    expect(mocks.createFriendChallenge).not.toHaveBeenCalled();
  });

  it("creates for the authenticated identity and rejects invalid settings", async () => {
    mocks.auth.mockResolvedValue({ userId: "creator" });
    mocks.createFriendChallenge.mockResolvedValue({
      code: "opaque",
      path: "/challenge/opaque",
    });
    expect(
      (await create(request({ country: "France", mode: "classic" }))).status,
    ).toBe(201);
    expect(mocks.createFriendChallenge).toHaveBeenCalledWith(
      { country: "France", mode: "classic" },
      "creator",
    );
    expect(
      (await create(request({ country: "France", mode: "bad" }))).status,
    ).toBe(400);
    expect(mocks.createFriendChallenge).toHaveBeenCalledTimes(1);
  });

  it("loads a public invitation without creating a guest identity and disables caching", async () => {
    mocks.getFriendChallenge.mockResolvedValue({
      code: "opaque",
      progress: null,
    });
    const response = await GET(
      new Request("http://localhost/api/challenges/opaque"),
      context,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.getFriendChallenge).toHaveBeenCalledWith("opaque", null);
    expect(mocks.getActorId).not.toHaveBeenCalled();
  });

  it("starts and mutates only the server-resolved actor's attempt", async () => {
    mocks.playFriendChallenge.mockResolvedValue({
      code: "opaque",
      progress: { version: 0 },
    });
    const response = await POST(
      request({ action: "start", actorId: "user:someone-else" }),
      context,
    );
    expect(response.status).toBe(200);
    expect(mocks.playFriendChallenge).toHaveBeenCalledWith(
      "opaque",
      "guest:browser",
      { action: "start" },
    );
    expect(
      (await POST(request({ action: "guess", guess: "France" }), context))
        .status,
    ).toBe(400);
    expect(mocks.playFriendChallenge).toHaveBeenCalledTimes(1);
  });

  it("reports service failures without returning stored state", async () => {
    mocks.playFriendChallenge.mockRejectedValue(
      new Error("Challenge already completed."),
    );
    const response = await POST(
      request({ action: "give-up", version: 1 }),
      context,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Challenge already completed.",
    });
  });
});
