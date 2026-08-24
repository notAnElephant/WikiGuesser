import { describe, expect, it } from "vitest";

import {
  deriveDisplayName,
  deriveLeaderboardNameDefault,
} from "@/src/lib/auth/user-profile";

describe("user profile names", () => {
  it("defaults the leaderboard field to first and last name", () => {
    expect(
      deriveLeaderboardNameDefault({
        firstName: "Ada",
        lastName: "Lovelace",
        fullName: "Different Full Name",
      }),
    ).toBe("Ada Lovelace");
  });

  it("falls back to the available Clerk profile identity", () => {
    expect(
      deriveLeaderboardNameDefault({ username: "analytical_engine" }),
    ).toBe("analytical_engine");
  });

  it("uses the chosen leaderboard name for score snapshots", () => {
    expect(
      deriveDisplayName({
        firstName: "Ada",
        lastName: "Lovelace",
        publicMetadata: { leaderboardName: "Countess of Computing" },
      }),
    ).toBe("Countess of Computing");
  });

  it("ignores an empty leaderboard name in metadata", () => {
    expect(
      deriveDisplayName({
        firstName: "Ada",
        lastName: "Lovelace",
        publicMetadata: { leaderboardName: "   " },
      }),
    ).toBe("Ada Lovelace");
  });
});
