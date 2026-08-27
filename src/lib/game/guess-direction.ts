import { normalizeGuess } from "@/src/lib/game/answer-matching";
import type {
  GuessedCountryMapData,
  GuessDirection,
  NormalizedEntity,
  SolutionCountryMapData,
} from "@/src/lib/types";

interface Coordinate {
  latitude: number;
  longitude: number;
}

function getCoordinate(entity: NormalizedEntity): Coordinate | null {
  const latitude = entity.metadata.centroidLatitude;
  const longitude = entity.metadata.centroidLongitude;

  return typeof latitude === "number" && typeof longitude === "number"
    ? { latitude, longitude }
    : null;
}

function findGuessedCountry(
  guess: string,
  entities: NormalizedEntity[],
): NormalizedEntity | null {
  const normalizedGuess = normalizeGuess(guess);

  return (
    entities.find(
      (candidate) =>
        candidate.category === "countries" &&
        candidate.acceptedAnswers.some(
          (answer) => answer.normalized === normalizedGuess,
        ),
    ) ?? null
  );
}

function getDirection(from: Coordinate, to: Coordinate): GuessDirection {
  const fromLatitude = (from.latitude * Math.PI) / 180;
  const toLatitude = (to.latitude * Math.PI) / 180;
  const longitudeDelta = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(longitudeDelta) * Math.cos(toLatitude);
  const x =
    Math.cos(fromLatitude) * Math.sin(toLatitude) -
    Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(longitudeDelta);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  const normalizedBearing = (bearing + 360) % 360;
  const directions: GuessDirection[] = [
    "north",
    "northeast",
    "east",
    "southeast",
    "south",
    "southwest",
    "west",
    "northwest",
  ];

  return directions[Math.round(normalizedBearing / 45) % 8]!;
}

export function getGuessedCountryMapData(
  guess: string,
  goal: NormalizedEntity,
  entities: NormalizedEntity[],
): GuessedCountryMapData | null {
  if (goal.category !== "countries") {
    return null;
  }

  const guessedEntity = findGuessedCountry(guess, entities);
  const from = guessedEntity ? getCoordinate(guessedEntity) : null;
  const to = getCoordinate(goal);

  if (!guessedEntity || !from || !to) {
    return null;
  }

  return {
    qid: guessedEntity.qid,
    name: guessedEntity.canonicalAnswer,
    mapNames: Array.from(
      new Set([
        guessedEntity.canonicalAnswer,
        ...guessedEntity.acceptedAnswers.map((answer) => answer.value),
      ]),
    ),
    latitude: from.latitude,
    longitude: from.longitude,
    direction: getDirection(from, to),
  };
}

export function getSolutionCountryMapData(
  entity: NormalizedEntity,
): SolutionCountryMapData | null {
  const coordinate = getCoordinate(entity);

  if (entity.category !== "countries" || !coordinate) {
    return null;
  }

  return {
    qid: entity.qid,
    name: entity.canonicalAnswer,
    mapNames: Array.from(
      new Set([
        entity.canonicalAnswer,
        ...entity.acceptedAnswers.map((answer) => answer.value),
      ]),
    ),
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
  };
}

export function getGuessDirection(
  guess: string,
  goal: NormalizedEntity,
  entities: NormalizedEntity[],
): GuessDirection | null {
  return getGuessedCountryMapData(guess, goal, entities)?.direction ?? null;
}
