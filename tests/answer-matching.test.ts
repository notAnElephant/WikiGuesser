import { describe, expect, it } from "vitest";

import {
  matchesEntityGuess,
  normalizeGuess,
} from "@/src/lib/game/answer-matching";
import { demoSnapshot } from "@/src/lib/content/demo-snapshot";

describe("answer matching", () => {
  it("normalizes punctuation, casing, and diacritics", () => {
    expect(normalizeGuess("Maria Skłodowska-Curie")).toBe(
      "maria sklodowska curie",
    );
    expect(normalizeGuess("  French   Republic ")).toBe("french republic");
    expect(normalizeGuess("Nihon (Japan)")).toBe("nihon");
  });

  it("matches aliases and canonical answers", () => {
    const marieCurie = demoSnapshot.entities.find(
      (entity) => entity.id === "people-marie-curie",
    );
    expect(marieCurie).toBeTruthy();

    expect(matchesEntityGuess(marieCurie!, "marie curie")).toBe(true);
    expect(matchesEntityGuess(marieCurie!, "Maria Sklodowska Curie")).toBe(
      true,
    );
    expect(matchesEntityGuess(marieCurie!, "Albert Einstein")).toBe(false);
  });
});
