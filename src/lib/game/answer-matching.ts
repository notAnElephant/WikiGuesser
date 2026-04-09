import type { AcceptedAnswer, NormalizedEntity } from "@/src/lib/types";

export function normalizeGuess(value: string): string {
  return value
    .replace(/Ł/g, "L")
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function dedupeAcceptedAnswers(
  answers: AcceptedAnswer[],
): AcceptedAnswer[] {
  const seen = new Set<string>();

  return answers.filter((answer) => {
    if (seen.has(answer.normalized)) {
      return false;
    }

    seen.add(answer.normalized);
    return true;
  });
}

export function matchesEntityGuess(
  entity: NormalizedEntity,
  guess: string,
): boolean {
  const normalizedGuess = normalizeGuess(guess);

  return entity.acceptedAnswers.some(
    (answer) => answer.normalized === normalizedGuess,
  );
}
