import { describe, expect, it } from "vitest";

import {
  getCurrencyRedactionTexts,
  splitCurrencyRevealSegments,
} from "@/src/lib/game/currency-censor";

describe("currency censor", () => {
  it("blurs country adjectives before the currency noun", () => {
    expect(
      splitCurrencyRevealSegments(
        "French franc",
        getCurrencyRedactionTexts("French franc", "France"),
      ),
    ).toEqual([
      { isBlurred: true, text: "French" },
      { isBlurred: false, text: " franc" },
    ]);
  });

  it("blurs multi-word country references", () => {
    expect(
      splitCurrencyRevealSegments(
        "United States dollar",
        getCurrencyRedactionTexts("United States dollar", "United States"),
      ),
    ).toEqual([
      { isBlurred: true, text: "United States" },
      { isBlurred: false, text: " dollar" },
    ]);
  });

  it("blurs accented country names before the São Tomé and Príncipe dobra", () => {
    expect(
      splitCurrencyRevealSegments(
        "São Tomé and Príncipe dobra",
        getCurrencyRedactionTexts(
          "São Tomé and Príncipe dobra",
          "São Tomé and Príncipe",
        ),
      ),
    ).toEqual([
      { isBlurred: true, text: "São Tomé and Príncipe" },
      { isBlurred: false, text: " dobra" },
    ]);
  });

  it("leaves neutral currency names untouched", () => {
    expect(splitCurrencyRevealSegments("Euro")).toEqual([
      { isBlurred: false, text: "Euro" },
    ]);
  });

  it("redacts only references to the answer country", () => {
    expect(getCurrencyRedactionTexts("Swiss franc", "Liechtenstein")).toEqual(
      [],
    );
    expect(getCurrencyRedactionTexts("Swiss franc", "Switzerland")).toEqual([
      "Swiss",
    ]);
    expect(
      getCurrencyRedactionTexts("United States dollar", "Ecuador"),
    ).toEqual([]);
    expect(getCurrencyRedactionTexts("Australian dollar", "Nauru")).toEqual([]);
    expect(
      getCurrencyRedactionTexts(
        "Central African CFA franc",
        "Central African Republic",
      ),
    ).toEqual([]);
  });

  it("recognizes accented and multi-word country currency qualifiers", () => {
    expect(getCurrencyRedactionTexts("Icelandic króna", "Iceland")).toEqual([
      "Icelandic",
    ]);
    expect(
      getCurrencyRedactionTexts("Costa Rican colón", "Costa Rica"),
    ).toEqual(["Costa Rican"]);
    expect(
      getCurrencyRedactionTexts("Cape Verdean escudo", "Cape Verde"),
    ).toEqual(["Cape Verdean"]);
    expect(getCurrencyRedactionTexts("Maldivian rufiyaa", "Maldives")).toEqual([
      "Maldivian",
    ]);
    expect(getCurrencyRedactionTexts("Iranian rial", "Iran")).toEqual([
      "Iranian",
    ]);
    expect(
      getCurrencyRedactionTexts("Argentine convertible peso", "Argentina"),
    ).toEqual(["Argentine"]);
    expect(getCurrencyRedactionTexts("Paraguayan guaraní", "Paraguay")).toEqual(
      ["Paraguayan"],
    );
    expect(getCurrencyRedactionTexts("Samoan tālā", "Samoa")).toEqual([
      "Samoan",
    ]);
    expect(
      getCurrencyRedactionTexts("Turkmenistan new manat", "Turkmenistan"),
    ).toEqual(["Turkmenistan"]);
    expect(
      getCurrencyRedactionTexts("Dominican peso", "Dominican Republic"),
    ).toEqual(["Dominican"]);
    expect(getCurrencyRedactionTexts("Tongan paʻanga", "Tonga")).toEqual([
      "Tongan",
    ]);
  });
});
