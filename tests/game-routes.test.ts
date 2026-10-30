import { describe, expect, it } from "vitest";

import { getGameModeHref, parseGameModeSlug } from "@/src/lib/game/game-routes";

describe("game mode routes", () => {
  it.each([
    ["daily", "classic", "/daily/classic"],
    ["daily", "blurred-lines", "/daily/choose-clues"],
    ["play", "classic", "/play/classic"],
    ["play", "blurred-lines", "/play/choose-clues"],
  ] as const)("builds the %s %s URL", (kind, mode, expected) => {
    expect(getGameModeHref(kind, mode)).toBe(expected);
  });

  it.each([
    ["daily", "classic", "classic"],
    ["daily", "choose-clues", "blurred-lines"],
    ["play", "classic", "classic"],
    ["play", "choose-clues", "blurred-lines"],
  ] as const)("parses the %s/%s URL", (kind, slug, expectedMode) => {
    expect(parseGameModeSlug(kind, slug)).toEqual({
      kind,
      mode: expectedMode,
    });
  });

  it("rejects unknown mode slugs", () => {
    expect(parseGameModeSlug("play", "unknown")).toBeNull();
  });
});
