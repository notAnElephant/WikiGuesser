import { describe, expect, it } from "vitest";

import { demoSnapshot } from "@/src/lib/content/demo-snapshot";
import {
  getDailyComboKey,
  getDailyDayKey,
  selectDailyChallengeEntity,
} from "@/src/lib/game/daily";

describe("daily helpers", () => {
  it("builds combo keys from category and mode", () => {
    expect(getDailyComboKey("countries", "classic")).toBe("countries:classic");
  });

  it("uses the Budapest calendar day across DST boundaries", () => {
    expect(getDailyDayKey(new Date("2026-03-28T22:59:59.000Z"))).toBe(
      "2026-03-28",
    );
    expect(getDailyDayKey(new Date("2026-03-28T23:00:00.000Z"))).toBe(
      "2026-03-29",
    );
    expect(getDailyDayKey(new Date("2026-10-24T21:59:59.000Z"))).toBe(
      "2026-10-24",
    );
    expect(getDailyDayKey(new Date("2026-10-24T22:00:00.000Z"))).toBe(
      "2026-10-25",
    );
  });

  it("selects the same entity for the same day, category, and mode", () => {
    const first = selectDailyChallengeEntity(
      demoSnapshot.entities,
      "2026-04-09",
      "countries",
      "classic",
    );
    const second = selectDailyChallengeEntity(
      demoSnapshot.entities,
      "2026-04-09",
      "countries",
      "classic",
    );

    expect(first.id).toBe(second.id);
    expect(first.category).toBe("countries");
  });
});
