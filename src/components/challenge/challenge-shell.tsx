"use client";

import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PageHeading } from "@/src/components/page-heading";
import {
  ShareChallenge,
  shareChallenge,
} from "@/src/components/challenge/share-challenge";
import { GamePlayView } from "@/src/components/game-shell/play-view";
import { GameResultDialog } from "@/src/components/game-shell/result-dialog";
import type {
  ActiveRound,
  RoundOutcome,
} from "@/src/components/game-shell/types";
import {
  getMessageAppearance,
  getModeMeta,
} from "@/src/components/game-shell/utils";
import {
  findUniqueCountryMatch,
  normalizeGuess,
} from "@/src/lib/game/answer-matching";
import type { FriendChallengeView } from "@/src/lib/types";

export function ChallengeShell({ code }: { code: string }) {
  const router = useRouter();
  const [challenge, setChallenge] = useState<FriendChallengeView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const busy = useRef(false);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
  const [messageRevision, setMessageRevision] = useState(0);
  const [showResult, setShowResult] = useState(true);
  const [shareUrl, setShareUrl] = useState("");
  const endpoint = `/api/challenges/${encodeURIComponent(code)}`;

  useEffect(() => {
    const controller = new AbortController();
    setShareUrl(
      window.location.origin + `/challenge/${encodeURIComponent(code)}`,
    );
    async function load() {
      try {
        const response = await fetch(endpoint, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error ?? "Could not load challenge.");
        setChallenge(payload as FriendChallengeView);
      } catch (error) {
        if (!controller.signal.aborted)
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not load challenge.",
          );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [code, endpoint]);

  const progress = challenge?.progress;
  const countryOptions = challenge?.countryOptions ?? [];
  const clues = progress?.clues ?? [];
  const guesses = progress?.guesses ?? [];
  const guessedNames = new Set(
    guesses.map((attempt) => normalizeGuess(attempt.name)),
  );
  const availableCountryOptions = countryOptions.filter(
    (name) => !guessedNames.has(normalizeGuess(name)),
  );
  const matchedCountry = findUniqueCountryMatch(countryOptions, guess);
  const validationMessage = guess.trim()
    ? !matchedCountry
      ? "Pick a listed country."
      : guessedNames.has(normalizeGuess(matchedCountry))
        ? "Already tried."
        : null
    : null;
  const round: ActiveRound | null =
    challenge && progress && !progress.isComplete
      ? {
          ...progress,
          playOrigin: "server",
          kind: "challenge",
          category: "countries",
          continent: null,
          mode: challenge.mode,
          roundId: code,
          token: "",
        }
      : null;
  const result: RoundOutcome | null =
    challenge && progress?.isComplete
      ? {
          playOrigin: "server",
          kind: "challenge",
          category: "countries",
          mode: challenge.mode,
          status: progress.isCorrect ? "win" : "loss",
          canonicalAnswer: progress.canonicalAnswer!,
          score: progress.score,
          clues,
          solutionCountry: progress.solutionCountry,
        }
      : null;
  const resultText = progress
    ? `WikiGuesser challenge: ${progress.isCorrect ? "Solved" : "Missed"} · ${progress.score} points · ${clues.filter((clue) => clue.isRevealed).length} clues used. Can you solve it?`
    : undefined;

  async function act(
    action: "start" | "guess" | "reveal" | "give-up",
    extra: Record<string, string> = {},
  ) {
    if (busy.current) return;
    busy.current = true;
    setIsBusy(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, version: progress?.version, ...extra }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ?? "Could not update challenge.");
      const next = payload as FriendChallengeView;
      setChallenge(next);
      setGuess("");
      setShowResult(true);
      setMessage(
        next.progress?.isComplete
          ? next.progress.isCorrect
            ? "Correct."
            : `Answer: ${next.progress.canonicalAnswer}.`
          : action === "guess"
            ? next.mode === "classic"
              ? "Miss. The next clue is open."
              : "Miss. Choose another clue."
            : next.progress?.canGuess
              ? "Make your guess."
              : "Choose a clue.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Connection lost. Retry to continue.",
      );
    } finally {
      setMessageRevision((revision) => revision + 1);
      busy.current = false;
      setIsBusy(false);
    }
  }

  async function shareResult() {
    try {
      const status = await shareChallenge(shareUrl, resultText!);
      if (status) {
        setMessage(status);
        setShowResult(false);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setMessage("Sharing failed. Use the challenge link below.");
        setShowResult(false);
      }
    }
  }

  if (isLoading) return <Text role="status">Loading challenge…</Text>;
  if (!challenge || !progress || challenge.isCreator) {
    return (
      <VStack className="mx-auto w-full max-w-2xl" gap={5}>
        <PageHeading title="A country challenge for you" />
        {challenge ? (
          <>
            <Text>
              {challenge.isCreator
                ? "You chose this answer. Send the challenge to your friends."
                : "A friend picked a mystery country. Can you guess it?"}
            </Text>
            <Text color="secondary">
              {getModeMeta(challenge.mode).label} · One country · One scored
              attempt
            </Text>
            {challenge.isCreator ? (
              <ShareChallenge url={shareUrl} />
            ) : (
              <>
                <Text color="secondary">
                  No sign-in needed. Your progress is saved for this account or
                  browser, and challenge scores stay separate from daily
                  leaderboards and regular stats.
                </Text>
                <Button
                  label="Start challenge"
                  isLoading={isBusy}
                  isDisabled={isBusy}
                  onClick={() => void act("start")}
                  variant="primary"
                />
              </>
            )}
          </>
        ) : (
          <Button
            label="Retry"
            onClick={() => window.location.reload()}
            variant="secondary"
          />
        )}
        {message ? <Text role="alert">{message}</Text> : null}
        <Button href="/" label="Back to games" variant="ghost" />
      </VStack>
    );
  }

  return (
    <>
      <GamePlayView
        availableCountryOptions={availableCountryOptions}
        canSubmitGuess={Boolean(
          round?.canGuess && matchedCountry && !validationMessage && !isBusy,
        )}
        clearForCategoryChoice={() => router.push("/")}
        currentCategory="countries"
        currentCategoryLabel="Countries"
        currentClues={clues}
        currentMode={challenge.mode}
        displayScore={progress.score}
        flowLabel="Friend challenge"
        giveUpRound={() => void act("give-up")}
        guess={guess}
        guessedEntities={guesses}
        guessButtonLabel="Guess"
        handleGuessSubmit={(event) => {
          event.preventDefault();
          if (matchedCountry && !validationMessage)
            void act("guess", { guess: matchedCountry, method: "text" });
        }}
        handleMapGuess={(name) => {
          if (!guessedNames.has(normalizeGuess(name)))
            void act("guess", { guess: name, method: "map" });
        }}
        homeButtonLabel="Back to games"
        isBusy={isBusy}
        isCountryRound
        message={
          message ||
          (result
            ? result.status === "win"
              ? "Correct."
              : "Challenge complete."
            : "Challenge live.")
        }
        messageRevision={messageRevision}
        result={result}
        revealClue={(clueKey) => void act("reveal", { clueKey })}
        revealedCount={clues.filter((clue) => clue.isRevealed).length}
        round={round}
        setGuess={setGuess}
        showHomeButton={Boolean(result)}
        showRestartButton={false}
        startRound={() => undefined}
        statusAppearance={getMessageAppearance(message, result?.status ?? null)}
        validationMessage={validationMessage}
        view={result ? "result" : "round"}
        visibleClassicClues={clues.filter((clue) => clue.isRevealed)}
        sideFooter={
          result ? (
            <VStack gap={3}>
              <ShareChallenge url={shareUrl} text={resultText} />
              <Button
                href="/challenges/new"
                label="Create a challenge"
                variant="secondary"
              />
            </VStack>
          ) : undefined
        }
      />
      {result && showResult ? (
        <GameResultDialog
          clearForCategoryChoice={() => router.push("/challenges/new")}
          currentCategory="countries"
          currentCategoryLabel="Friend challenge"
          guessedCountries={guesses.flatMap((attempt) =>
            attempt.mapData ? [attempt.mapData] : [],
          )}
          isBusy={isBusy}
          onClose={() => setShowResult(false)}
          onPrimaryAction={() => void shareResult()}
          primaryActionIcon={Share2}
          primaryActionLabel="Share result"
          result={result}
          secondaryActionLabel="Create a challenge"
          startRound={() => undefined}
        />
      ) : null}
    </>
  );
}
