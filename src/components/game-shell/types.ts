import type {
  CategorySummary,
  EntityCategory,
  GameMode,
  RevealClueResult,
  RoundKind,
  RoundClue,
  StartRoundResult,
} from "@/src/lib/types";
import type { LucideIcon } from "lucide-react";

export interface GameShellProps {
  categories: CategorySummary[];
  countryOptions: string[];
}

export type ActiveRound = StartRoundResult | RevealClueResult;

export interface RoundOutcome {
  status: "win" | "loss";
  canonicalAnswer: string;
  score: number;
  kind: RoundKind;
  category: EntityCategory;
  mode: GameMode;
  clues: RoundClue[];
}

export interface CategoryCardMeta {
  icon: LucideIcon;
  accent: string;
  shortLabel: string;
}

export interface GameModeOption {
  id: GameMode;
  label: string;
  icon: LucideIcon;
  summary: string;
  hint: string;
}

export interface MessageAppearance {
  icon: LucideIcon;
  className: string;
}
