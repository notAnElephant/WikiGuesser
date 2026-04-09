import type { EntityCategory, GameMode, NormalizedEntity } from "@/src/lib/types";
import { DAILY_RESET_TIME_ZONE } from "@/src/lib/types";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DAILY_RESET_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getDailyDayKey(date: Date = new Date()) {
  return dayKeyFormatter.format(date);
}

export function getDailyComboKey(category: EntityCategory, mode: GameMode) {
  return `${category}:${mode}`;
}

function hashSeed(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function selectDailyChallengeEntity(
  entities: NormalizedEntity[],
  dayKey: string,
  category: EntityCategory,
  mode: GameMode,
) {
  const matchingEntities = entities.filter((entity) => entity.category === category);

  if (matchingEntities.length === 0) {
    throw new Error("No playable entities are available for that category.");
  }

  const seed = `${dayKey}:${category}:${mode}`;
  const index = hashSeed(seed) % matchingEntities.length;

  return matchingEntities[index]!;
}
