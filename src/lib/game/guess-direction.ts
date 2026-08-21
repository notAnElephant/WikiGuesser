import { normalizeGuess } from "@/src/lib/game/answer-matching";
import type { GuessDirection, NormalizedEntity } from "@/src/lib/types";

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

export function getGuessDirection(
  guess: string,
  goal: NormalizedEntity,
  entities: NormalizedEntity[],
): GuessDirection | null {
  if (goal.category !== "countries") {
    return null;
  }

  const normalizedGuess = normalizeGuess(guess);
  const guessedEntity = entities.find(
    (candidate) =>
      candidate.category === "countries" &&
      candidate.acceptedAnswers.some(
        (answer) => answer.normalized === normalizedGuess,
      ),
  );
  const from = guessedEntity ? getCoordinate(guessedEntity) : null;
  const to = getCoordinate(goal);

  if (!from || !to) {
    return null;
  }

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
