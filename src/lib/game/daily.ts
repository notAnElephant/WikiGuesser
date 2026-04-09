import type { EntityCategory, GameMode, NormalizedEntity } from "@/src/lib/types";
import { DAILY_RESET_TIME_ZONE } from "@/src/lib/types";
import { hashString } from "@/src/lib/utils/hash";

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
  const index =
    Number.parseInt(hashString(seed).slice(0, 8), 16) % matchingEntities.length;

  return matchingEntities[index]!;
}
