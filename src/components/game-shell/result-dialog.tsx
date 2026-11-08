import { promoteToastViewport } from "@/src/components/app-toaster";
import { FeedbackForm } from "@/src/components/feedback-form";
import { CountryFlagPreview } from "@/src/components/game-shell/country-flag-preview";
import type { RoundOutcome } from "@/src/components/game-shell/types";
import { ThemeRatingPrompt } from "@/src/components/theme-rating-prompt";
import type { GuessedCountryMapData } from "@/src/lib/types";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import { VStack } from "@astryxdesign/core/VStack";
import type { LucideIcon } from "lucide-react";
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
import { useEffect, useState } from "react";

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
  statsHref?: string;
  startRound: () => void;
  tertiaryActionLabel?: string;
}

export function GameResultDialog({
  clearForCategoryChoice,
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
  statsHref,
  startRound,
  tertiaryActionLabel,
}: GameResultDialogProps) {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isRatingPromptVisible, setIsRatingPromptVisible] = useState(true);
  useEffect(() => {
    promoteToastViewport();
  }, []);

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
      padding={4}
      width="48rem"
    >
      <DialogHeader
        className="select-none"
        data-autofocus
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
        startContent={
          result.status === "win" ? (
            <PartyPopper aria-hidden="true" className="text-accent" />
          ) : (
            <Ban aria-hidden="true" className="text-error" />
          )
        }
        subtitle={result.status === "win" ? "Solved" : "Missed"}
        tabIndex={-1}
        title={result.canonicalAnswer}
      />

      <StackItem size="fill" isScrollable>
        <VStack gap={0}>
          <HStack align="center" justify="between" gap={3} paddingBlock={3}>
            <VStack gap={1}>
              <Text color="secondary" type="supporting">
                Round score
              </Text>
              <HStack align="center" gap={2}>
                <Text className="text-3xl" weight="bold" hasTabularNumbers>
                  {result.score} pts
                </Text>
                {result.status === "win" && result.guessMethod === "text" ? (
                  <Tooltip content="Guessing by name gives you double points!">
                    <Token color="green" label="2× points" size="sm" />
                  </Tooltip>
                ) : null}
              </HStack>
              <Text color="secondary" type="supporting">
                {currentCategoryLabel}
              </Text>
            </VStack>
            {flagUrl ? (
              <CountryFlagPreview
                countryName={result.canonicalAnswer}
                src={flagUrl}
              />
            ) : null}
          </HStack>

          <Grid
            className="mt-4"
            columns={{ minWidth: 220, max: 2, repeat: "fit" }}
            gap={2}
          >
            <Button
              icon={<PrimaryActionIcon aria-hidden="true" />}
              isDisabled={isBusy}
              label={primaryActionLabel}
              onClick={handlePrimaryAction}
              variant="primary"
              width="100%"
            />
            {secondaryActionLabel ? (
              <Button
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
          </Grid>
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
          {statsHref ? (
            <Button
              className="mt-3"
              icon={<Trophy aria-hidden="true" />}
              label="View my stats"
              href={statsHref}
              variant="secondary"
              width="100%"
            />
          ) : null}
          <VStack paddingBlockStart={4}>
            {result.solutionCountry ? (
              <WorldMapDialog
                guessedCountries={guessedCountries}
                isExpanded={false}
                onExpandedChange={() => undefined}
                presentation="result"
                solutionCountry={result.solutionCountry}
              />
            ) : null}
          </VStack>
          {isRatingPromptVisible ? (
            <ThemeRatingPrompt
              onDismiss={() => setIsRatingPromptVisible(false)}
            />
          ) : null}
          {isFeedbackOpen ? (
            <VStack gap={3} paddingBlockStart={6}>
              <Text weight="semibold">How was that round?</Text>
              <FeedbackForm
                context={{
                  category: result.category,
                  cluesRevealed: result.clues.filter((clue) => clue.isRevealed)
                    .length,
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
              label="Give additional feedback"
              onClick={() => setIsFeedbackOpen(true)}
              variant="ghost"
              width="100%"
            />
          )}
        </VStack>
      </StackItem>
    </Dialog>
  );
}
