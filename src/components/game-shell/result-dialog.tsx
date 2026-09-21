import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
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
  statsHref?: string;
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
  statsHref,
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
      padding={4}
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

      <StackItem size="fill" isScrollable>
        <VStack gap={0}>
          {result.solutionCountry ? (
            <WorldMapDialog
              guessedCountries={guessedCountries}
              isExpanded={false}
              onExpandedChange={() => undefined}
              presentation="result"
              solutionCountry={result.solutionCountry}
            />
          ) : null}

          <Grid className="mt-3" columns={{ minWidth: 220, max: 2 }} gap={2}>
            <Card className="rounded-lg" padding={2}>
              <HStack align="center" gap={2}>
                <Icon color="accent" icon={Trophy} size="sm" />
                <VStack gap={0}>
                  <Text
                    className="uppercase tracking-wider"
                    color="secondary"
                    type="supporting"
                  >
                    Score
                  </Text>
                  <Text weight="semibold">{result.score} pts</Text>
                </VStack>
              </HStack>
            </Card>
            <Card className="rounded-lg" padding={2}>
              <HStack align="center" gap={2}>
                <Icon color="accent" icon={CurrentCategoryIcon} size="sm" />
                <VStack gap={0}>
                  <Text
                    className="uppercase tracking-wider"
                    color="secondary"
                    type="supporting"
                  >
                    Category
                  </Text>
                  <Text weight="semibold">{currentCategoryLabel}</Text>
                </VStack>
              </HStack>
            </Card>
          </Grid>

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
              label="Give feedback"
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
