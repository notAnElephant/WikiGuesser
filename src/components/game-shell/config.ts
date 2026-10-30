import {
  Building2,
  Clock3,
  Compass,
  Flag,
  Globe2,
  GraduationCap,
  Landmark,
  Layers3,
  Map as MapIcon,
  MapPinned,
  Medal,
  ScanSearch,
  Shuffle,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

import type { GameModeOption } from "@/src/components/game-shell/types";
import type { LucideIcon } from "lucide-react";

export const CATEGORY_META = {
  random: {
    icon: Shuffle,
    accent: "from-blue-subtle via-cyan-subtle to-transparent",
    shortLabel: "Mixed category",
  },
  countries: {
    icon: Globe2,
    accent: "from-teal-subtle via-green-subtle to-transparent",
    shortLabel: "World facts",
  },
  cities: {
    icon: Building2,
    accent: "from-orange-subtle via-yellow-subtle to-transparent",
    shortLabel: "Capital hunt",
  },
  people: {
    icon: Medal,
    accent: "from-purple-subtle via-pink-subtle to-transparent",
    shortLabel: "Famous names",
  },
} as const;

export const CLUE_ICON_MAP: Record<string, LucideIcon> = {
  "admin-region": MapIcon,
  area: Compass,
  award: Medal,
  capital: Landmark,
  citizenship: Globe2,
  continent: Globe2,
  country: Globe2,
  currency: Trophy,
  education: GraduationCap,
  elevation: MapPinned,
  field: Sparkles,
  "flag-colors": Flag,
  founded: Clock3,
  occupation: Medal,
  population: Users,
  timezone: Clock3,
};

export const GAME_MODE_OPTIONS: GameModeOption[] = [
  {
    id: "classic",
    label: "Classic",
    icon: Layers3,
    summary: "Auto clues",
    hint: "Guess, miss, reveal.",
  },
  {
    id: "blurred-lines",
    label: "Choose Clues",
    icon: ScanSearch,
    summary: "Pick each reveal",
    hint: "Open only what you need.",
  },
];
