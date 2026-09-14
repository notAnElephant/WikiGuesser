import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { VStack } from "@astryxdesign/core/VStack";
import { FeedbackForm } from "@/src/components/feedback-form";
import { CountryFlagPreview } from "@/src/components/game-shell/country-flag-preview";
import { getCategoryMeta } from "@/src/components/game-shell/utils";
import type { RoundOutcome } from "@/src/components/game-shell/types";
import type { GuessedCountryMapData } from "@/src/lib/types";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import {
  Ban,
  House,
  LogIn,
  MessageSquare,
  PartyPopper,
  RotateCcw,
  Trophy,
  UserPlus,
} from "lucide-react";
import dynamic from "next/dynamic";

const WorldMapDialog = dynamic(
  () =>
    import("@/src/components/game-shell/world-map-dialog").then(
      (module) => module.WorldMapDialog,
    ),
  { ssr: false },
);

interface GameResultDialogProps {
  clearForCategoryChoice: () => void;
  currentCategory: string | null;
  currentCategoryLabel: string;
  guessedCountries: readonly GuessedCountryMapData[];
  isBusy: boolean;
  onClose: () => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onTertiaryAction?: () => void;
  primaryActionIcon?: LucideIcon;
  primaryActionLabel?: string;
  result: RoundOutcome;
  secondaryActionLabel?: string | null;
  startRound: () => void;
  tertiaryActionLabel?: string;
}

export function GameResultDialog({
  clearForCategoryChoice,
  currentCategory,
  currentCategoryLabel,
  guessedCountries,
  isBusy,
  onClose,
  onPrimaryAction,
  onSecondaryAction,
  onTertiaryAction,
  primaryActionIcon,
  primaryActionLabel = "Play again",
  result,
  secondaryActionLabel = "Categories",
  startRound,
  tertiaryActionLabel,
}: GameResultDialogProps) {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const CurrentCategoryIcon = getCategoryMeta(currentCategory).icon;
  const flagUrl = result.clues.find(
    (clue) => clue.key === "flag-colors",
  )?.value;
  const handlePrimaryAction = onPrimaryAction ?? startRound;
  const handleSecondaryAction = onSecondaryAction ?? clearForCategoryChoice;
  const usesCreateAccountAction = primaryActionLabel === "Create account";
  const usesCreateAccountSecondaryAction =
    secondaryActionLabel === "Create account";
  const usesHomeAction =
    primaryActionLabel === "Home" || primaryActionLabel === "Daily hub";
  const PrimaryActionIcon =
    primaryActionIcon ??
    (usesCreateAccountAction ? UserPlus : usesHomeAction ? House : RotateCcw);
  return (
    <Dialog
      isOpen
      maxHeight="calc(100dvh - var(--spacing-8))"
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      padding={6}
      width="48rem"
    >
      <DialogHeader
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
        startContent={
          flagUrl ? (
            <CountryFlagPreview
              countryName={result.canonicalAnswer}
              src={flagUrl}
            />
          ) : result.status === "win" ? (
            <PartyPopper aria-hidden="true" className="text-accent" />
          ) : (
            <Ban aria-hidden="true" className="text-error" />
          )
        }
        subtitle={result.status === "win" ? "Solved" : "Missed"}
        title={result.canonicalAnswer}
      />

      {result.solutionCountry ? (
        <WorldMapDialog
          guessedCountries={guessedCountries}
          isExpanded={false}
          onExpandedChange={() => undefined}
          presentation="result"
          solutionCountry={result.solutionCountry}
        />
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Card className="flex items-center gap-3" padding={4}>
          <Trophy
            aria-hidden="true"
            className="size-5 text-accent"
            strokeWidth={2.1}
          />
          <div>
            <span className="block text-xs uppercase tracking-wider text-secondary">
              Score
            </span>
            <strong className="text-primary">{result.score} pts</strong>
          </div>
        </Card>
        <Card className="flex items-center gap-3" padding={4}>
          <CurrentCategoryIcon
            aria-hidden="true"
            className="size-5 text-accent"
            strokeWidth={2.1}
          />
          <div>
            <span className="block text-xs uppercase tracking-wider text-secondary">
              Category
            </span>
            <strong className="text-primary">{currentCategoryLabel}</strong>
          </div>
        </Card>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          className="flex-1"
          icon={<PrimaryActionIcon aria-hidden="true" />}
          isDisabled={isBusy}
          label={primaryActionLabel}
          onClick={handlePrimaryAction}
          variant="primary"
          width="100%"
        />
        {secondaryActionLabel ? (
          <Button
            className="flex-1"
            icon={
              usesCreateAccountSecondaryAction ? (
                <UserPlus aria-hidden="true" />
              ) : (
                <House aria-hidden="true" />
              )
            }
            isDisabled={isBusy}
            label={secondaryActionLabel}
            onClick={handleSecondaryAction}
            variant="secondary"
            width="100%"
          />
        ) : null}
      </div>
      {tertiaryActionLabel && onTertiaryAction ? (
        <Button
          className="mt-3"
          icon={<LogIn aria-hidden="true" />}
          isDisabled={isBusy}
          label={tertiaryActionLabel}
          onClick={onTertiaryAction}
          variant="secondary"
          width="100%"
        />
      ) : null}
      {isFeedbackOpen ? (
        <VStack gap={3} paddingBlockStart={6}>
          <strong className="text-primary">How was that round?</strong>
          <FeedbackForm
            context={{
              category: result.category,
              cluesRevealed: result.clues.filter(
                (clue) => clue.isRevealed,
              ).length,
              gameType: result.kind === "daily" ? "daily" : "free_play",
              mode: result.mode,
              outcome: result.status,
              score: result.score,
              source: "round-result",
            }}
            onSubmitted={() => setIsFeedbackOpen(false)}
          />
        </VStack>
      ) : (
        <Button
          className="mt-4"
          icon={<MessageSquare aria-hidden="true" />}
          label="Give feedback"
          onClick={() => setIsFeedbackOpen(true)}
          variant="ghost"
          width="100%"
        />
      )}
    </Dialog>
  );
}
