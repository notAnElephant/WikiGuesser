import { describe, expect, it } from "vitest";

import { toGameContext } from "@/src/lib/analytics";

describe("toGameContext", () => {
  it("labels daily rounds", () => {
    expect(toGameContext("daily", "countries", "classic")).toEqual({
      category: "countries",
      game_type: "daily",
      mode: "classic",
    });
  });

  it("labels standard rounds as free play", () => {
    expect(
      toGameContext("standard", "countries", "blurred-lines"),
    ).toEqual({
      category: "countries",
      game_type: "free_play",
      mode: "blurred-lines",
    });
  });
});
