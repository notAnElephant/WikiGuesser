import {
  Building2,
  Clock3,
  Compass,
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
    accent:
      "from-[#1d4ed8]/18 via-[#0ea5e9]/10 to-transparent dark:from-[#38bdf8]/22 dark:via-[#22d3ee]/10",
    shortLabel: "Mixed category",
  },
  countries: {
    icon: Globe2,
    accent:
      "from-[#0f766e]/16 via-[#2dd4bf]/8 to-transparent dark:from-[#24d4c2]/20 dark:via-[#2dd4bf]/8",
    shortLabel: "World facts",
  },
  cities: {
    icon: Building2,
    accent:
      "from-[#b45309]/16 via-[#f59e0b]/8 to-transparent dark:from-[#f59e0b]/18 dark:via-[#fbbf24]/8",
    shortLabel: "Capital hunt",
  },
  people: {
    icon: Medal,
    accent:
      "from-[#7c3aed]/16 via-[#c084fc]/8 to-transparent dark:from-[#a855f7]/18 dark:via-[#d8b4fe]/8",
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
    label: "Blurred",
    icon: ScanSearch,
    summary: "Pick each reveal",
    hint: "Open only what you need.",
  },
];

export const pillButtonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0";
export const primaryButtonClass = `${pillButtonBase} bg-[#0f766e] text-white shadow-[0_12px_28px_rgba(15,118,110,0.22)] dark:bg-[#24d4c2] dark:text-[#082825]`;
export const secondaryButtonClass = `${pillButtonBase} border border-black/8 bg-white/76 text-[#1f1b17] dark:border-white/10 dark:bg-white/6 dark:text-[#f5f7fb]`;
export const surfaceClass =
  "rounded-[30px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,251,245,0.96),rgba(255,247,238,0.88))] shadow-[0_24px_60px_rgba(53,36,22,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(13,21,32,0.96),rgba(17,27,40,0.9))] dark:shadow-[0_24px_60px_rgba(0,0,0,0.34)]";
