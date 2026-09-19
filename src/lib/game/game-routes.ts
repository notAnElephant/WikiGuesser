import type { GameMode } from "@/src/lib/types";

export type GameRouteKind = "daily" | "play";

export interface GameRouteTarget {
  kind: GameRouteKind;
  mode: GameMode;
}

const MODE_SLUGS: Record<GameMode, string> = {
  classic: "classic",
  "blurred-lines": "choose-clues",
};

export function getGameModeHref(kind: GameRouteKind, mode: GameMode) {
  return `/${kind}/${MODE_SLUGS[mode]}`;
}

export function parseGameModeSlug(
  kind: GameRouteKind,
  slug: string,
): GameRouteTarget | null {
  const entry = Object.entries(MODE_SLUGS).find(
    ([, modeSlug]) => modeSlug === slug,
  );

  return entry ? { kind, mode: entry[0] as GameMode } : null;
}
