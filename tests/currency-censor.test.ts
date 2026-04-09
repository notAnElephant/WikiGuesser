import { describe, expect, it } from "vitest";

import { splitCurrencyRevealSegments } from "@/src/lib/game/currency-censor";

describe("currency censor", () => {
  it("blurs country adjectives before the currency noun", () => {
    expect(splitCurrencyRevealSegments("French franc")).toEqual([
      { isBlurred: true, text: "French" },
      { isBlurred: false, text: " franc" },
    ]);
  });

  it("blurs multi-word country references", () => {
    expect(splitCurrencyRevealSegments("United States dollar")).toEqual([
      { isBlurred: true, text: "United States" },
      { isBlurred: false, text: " dollar" },
    ]);
  });

  it("leaves neutral currency names untouched", () => {
    expect(splitCurrencyRevealSegments("Euro")).toEqual([
      { isBlurred: false, text: "Euro" },
    ]);
  });
});
