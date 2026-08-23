const knownEntityLabels: Readonly<Record<string, string>> = {
  // Wikidata stores the euro's language-neutral label under `mul`, so older
  // hydrated snapshots may not contain an English label.
  Q4916: "euro",
};

export function getKnownEntityLabel(entityId: string): string | null {
  return knownEntityLabels[entityId] ?? null;
}
