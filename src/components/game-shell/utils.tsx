import { splitCurrencyRevealSegments } from "@/src/lib/game/currency-censor";

import {
  CATEGORY_META,
  CLUE_ICON_MAP,
  GAME_MODE_OPTIONS,
} from "@/src/components/game-shell/config";
import type {
  CategoryCardMeta,
  MessageAppearance,
} from "@/src/components/game-shell/types";
import type { GameMode, PlayableClue, RoundClue } from "@/src/lib/types";
import {
  Ban,
  CircleAlert,
  PartyPopper,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export function selectionCardClass(
  isActive: boolean,
  isDisabled = false,
): string {
  return `group grid gap-3 rounded-[26px] border p-4 text-left transition ${
    isDisabled
      ? "cursor-not-allowed border-black/5 bg-[rgba(255,255,255,0.56)] opacity-55 dark:border-white/8 dark:bg-white/6"
      : isActive
        ? "border-[#0f766e] bg-[linear-gradient(160deg,rgba(15,118,110,0.14),rgba(255,255,255,0.94))] shadow-[0_18px_44px_rgba(15,118,110,0.14)] dark:border-[#24d4c2]/60 dark:bg-[linear-gradient(160deg,rgba(36,212,194,0.14),rgba(17,24,39,0.94))] dark:shadow-[0_18px_44px_rgba(0,0,0,0.28)]"
        : "border-black/10 bg-white/86 hover:-translate-y-0.5 hover:border-black/14 dark:border-white/10 dark:bg-[rgba(13,21,32,0.84)] dark:hover:border-white/14"
  }`;
}

export function getMenuMessage(
  category: string | null,
  mode: GameMode | null,
): string {
  if (!category) {
    return "Pick a category.";
  }

  if (!mode) {
    return "Pick a mode.";
  }

  return "Start free play.";
}

export function hasHiddenSafeClues(clues: RoundClue[]): boolean {
  return clues.some((clue) => clue.spoilerLevel === "safe" && !clue.isRevealed);
}

export function isClueLocked(clues: RoundClue[], clue: RoundClue): boolean {
  return clue.spoilerLevel === "late" && hasHiddenSafeClues(clues);
}

export function toPlayableClues(clues: RoundClue[]): PlayableClue[] {
  return clues
    .filter((clue) => clue.isRevealed)
    .map((clue) => ({
      key: clue.key,
      label: clue.label,
      value: clue.value ?? clue.prefetchedValue,
      difficulty: clue.difficulty,
      spoilerLevel: clue.spoilerLevel,
    }));
}

export function renderClueValue(
  clue: Pick<RoundClue, "key" | "value">,
): ReactNode {
  if (!clue.value) {
    return null;
  }

  if (clue.key !== "currency") {
    return clue.value;
  }

  const segments = splitCurrencyRevealSegments(clue.value);

  if (!segments.some((segment) => segment.isBlurred)) {
    return clue.value;
  }

  return segments.map((segment, index) =>
    segment.isBlurred ? (
      <span
        className="inline-block align-baseline"
        key={`${segment.text}-${index}`}
      >
        <span
          aria-hidden="true"
          className="select-none rounded-[0.45rem] bg-black/10 px-1.5 text-transparent [text-shadow:0_0_14px_rgba(31,27,23,0.98)] blur-[4.8px] dark:bg-white/14 dark:[text-shadow:0_0_14px_rgba(245,247,251,0.98)]"
        >
          {segment.text}
        </span>
        <span className="sr-only">country reference hidden</span>
      </span>
    ) : (
      <span key={`${segment.text}-${index}`}>{segment.text}</span>
    ),
  );
}

export function renderHiddenCluePlaceholder(
  clue: Pick<RoundClue, "prefetchedValue">,
  isLocked: boolean,
): ReactNode {
  return (
    <span
      aria-hidden="true"
      className={`inline-block select-none align-top text-[1.02rem] leading-7 text-transparent [text-shadow:0_0_14px_rgba(31,27,23,0.98)] blur-[4.8px] dark:[text-shadow:0_0_14px_rgba(245,247,251,0.98)] ${
        isLocked ? "opacity-55" : "opacity-78"
      }`}
    >
      {clue.prefetchedValue}
    </span>
  );
}

export function getCategoryMeta(categoryId: string | null): CategoryCardMeta {
  if (categoryId && categoryId in CATEGORY_META) {
    return CATEGORY_META[categoryId as keyof typeof CATEGORY_META];
  }

  return {
    icon: Sparkles,
    accent:
      "from-[#0f766e]/16 via-[#f59e0b]/6 to-transparent dark:from-[#24d4c2]/18 dark:via-[#fbbf24]/6",
    shortLabel: "Live category",
  };
}

export function getModeMeta(mode: GameMode | null) {
  return (
    GAME_MODE_OPTIONS.find((entry) => entry.id === mode) ?? GAME_MODE_OPTIONS[0]
  );
}

export function getClueIcon(key: string): LucideIcon {
  return CLUE_ICON_MAP[key] ?? Sparkles;
}

export function getMessageAppearance(
  message: string,
  resultStatus: "win" | "loss" | null,
): MessageAppearance {
  const lowerMessage = message.toLowerCase();

  if (resultStatus === "win" || lowerMessage.includes("correct")) {
    return {
      icon: PartyPopper,
      className:
        "border-emerald-500/18 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/18 dark:bg-emerald-400/10 dark:text-emerald-200",
    };
  }

  if (
    lowerMessage.includes("failed") ||
    lowerMessage.includes("couldn't") ||
    lowerMessage.includes("already") ||
    lowerMessage.includes("pick")
  ) {
    return {
      icon: CircleAlert,
      className:
        "border-amber-500/18 bg-amber-500/10 text-amber-700 dark:border-amber-300/16 dark:bg-amber-300/10 dark:text-amber-200",
    };
  }

  if (lowerMessage.includes("out") || lowerMessage.includes("answer")) {
    return {
      icon: Ban,
      className:
        "border-rose-500/18 bg-rose-500/10 text-rose-700 dark:border-rose-300/18 dark:bg-rose-300/10 dark:text-rose-200",
    };
  }

  return {
    icon: Sparkles,
    className:
      "border-[#0f766e]/14 bg-[#0f766e]/8 text-[#115e59] dark:border-[#24d4c2]/14 dark:bg-[#24d4c2]/8 dark:text-[#8ff4e7]",
  };
}
