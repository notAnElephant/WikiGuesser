import { splitCurrencyRevealSegments } from "@/src/lib/game/currency-censor";
export {
  getClueUnlockRoundsRemaining,
  isClueLocked,
} from "@/src/lib/game/clue-locking";

import { FlagColorsClue } from "@/src/components/game-shell/flag-colors-clue";
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
  return `group grid gap-3 rounded-xl border p-4 text-left transition ${
    isDisabled
      ? "cursor-not-allowed border-border bg-muted opacity-50"
      : isActive
        ? "border-accent-bg bg-accent-muted shadow-md"
        : "border-border bg-card hover:-translate-y-0.5 hover:border-border-strong"
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

export function getFlagImageUrl(
  clues: Array<Pick<RoundClue, "key" | "prefetchedValue">>,
): string | null {
  return (
    clues.find((clue) => clue.key === "flag-colors")?.prefetchedValue ?? null
  );
}

export function renderClueValue(
  clue: Pick<RoundClue, "key" | "value" | "currencyRedactionTexts">,
): ReactNode {
  if (!clue.value) {
    return null;
  }

  if (clue.key === "flag-colors") {
    return <FlagColorsClue src={clue.value} />;
  }

  if (clue.key !== "currency") {
    return clue.value;
  }

  const segments = splitCurrencyRevealSegments(
    clue.value,
    clue.currencyRedactionTexts,
  );

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
          className="clue-redaction select-none rounded-sm px-1.5 text-transparent"
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
  clue: Pick<RoundClue, "key" | "prefetchedValue">,
  isLocked: boolean,
): ReactNode {
  if (clue.key === "flag-colors") {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className={`clue-redaction inline-block select-none align-top text-base leading-7 text-transparent ${
        isLocked ? "opacity-50" : "opacity-75"
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
    accent: "from-teal-subtle via-yellow-subtle to-transparent",
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
      className: "border-success bg-success-muted text-success",
      tone: "success",
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
      className: "border-warning bg-warning-muted text-warning",
      tone: "warning",
    };
  }

  if (lowerMessage.includes("out") || lowerMessage.includes("answer")) {
    return {
      icon: Ban,
      className: "border-error bg-error-muted text-error",
      tone: "error",
    };
  }

  return {
    icon: Sparkles,
    className: "border-accent-bg bg-accent-bg/8 text-accent",
    tone: "info",
  };
}

export function shouldDisplayGameStatusToast(message: string): boolean {
  if (
    message === "Round live." ||
    message === "Daily live." ||
    message === "Tap a row."
  ) {
    return false;
  }

  return message !== "Correct." && !message.startsWith("Answer: ");
}
