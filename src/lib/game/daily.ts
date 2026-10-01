import type {
  EntityCategory,
  GameMode,
  NormalizedEntity,
} from "@/src/lib/types";
import { DAILY_RESET_TIME_ZONE, GAME_MODES } from "@/src/lib/types";

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

export function findOtherAvailableDaily<
  T extends {
    category: EntityCategory;
    mode: GameMode;
    playerStatus: { hasPlayed: boolean };
  },
>(options: T[], current: { category: EntityCategory; mode: GameMode }) {
  return (
    options.find(
      (option) =>
        option.category === current.category &&
        option.mode !== current.mode &&
        !option.playerStatus.hasPlayed,
    ) ?? null
  );
}

function hashSeed(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function shuffleWithSeed<T>(items: T[], seed: string) {
  const shuffled = [...items];
  let state = hashSeed(seed);

  // Mulberry32 gives a small deterministic PRNG suitable for a daily deck.
  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex]!,
      shuffled[index]!,
    ];
  }

  return shuffled;
}

function getUtcDayOrdinal(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return Math.floor(Date.UTC(year!, month! - 1, day!) / 86_400_000);
}

export function selectDailyChallengeEntity(
  entities: NormalizedEntity[],
  dayKey: string,
  category: EntityCategory,
  mode: GameMode,
) {
  const matchingEntities = entities.filter(
    (entity) => entity.category === category,
  );

  if (matchingEntities.length === 0) {
    throw new Error("No playable entities are available for that category.");
  }

  if (category === "countries") {
    if (matchingEntities.length < GAME_MODES.length) {
      throw new Error("Each daily mode needs a distinct playable country.");
    }

    const dayOrdinal = getUtcDayOrdinal(dayKey);
    const cycle = Math.floor(dayOrdinal / matchingEntities.length);
    const position =
      ((dayOrdinal % matchingEntities.length) + matchingEntities.length) %
      matchingEntities.length;
    // QIDs are the stable identity stored in DailyChallenge.entityQid. Sort
    // before shuffling so a snapshot's row order cannot alter the deck.
    const stablePool = [...matchingEntities].sort((left, right) =>
      left.qid.localeCompare(right.qid),
    );
    const deck = shuffleWithSeed(stablePool, `daily-country-cycle:${cycle}`);

    // Keep each mode's country unique on the same day while preserving a
    // complete, deterministic rotation through the deck for both modes.
    const modeOffset =
      GAME_MODES.indexOf(mode) * Math.floor(deck.length / GAME_MODES.length);
    return deck[(position + modeOffset) % deck.length]!;
  }

  const seed = `${dayKey}:${category}:${mode}`;
  const index = hashSeed(seed) % matchingEntities.length;

  return matchingEntities[index]!;
}
