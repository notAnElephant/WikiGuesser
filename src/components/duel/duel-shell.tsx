"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { GamePlayView } from "@/src/components/game-shell/play-view";
import { normalizeGuess } from "@/src/lib/game/answer-matching";
import type {
  EntityCategory,
  GameMode,
  GuessedCountryMapData,
  RoundClue,
  SolutionCountryMapData,
} from "@/src/lib/types";
import {
  Check,
  Clock3,
  Copy,
  Flag,
  LoaderCircle,
  LogIn,
  RotateCcw,
  Share2,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

const WorldMapDialog = dynamic(
  () =>
    import("@/src/components/game-shell/world-map-dialog").then(
      (module) => module.WorldMapDialog,
    ),
  { ssr: false },
);

export type DuelStatus = "pending" | "active" | "completed" | "expired";

export interface DuelPlayer {
  id: string;
  name: string;
  imageUrl?: string | null;
}

export interface DuelClue {
  key: string;
  label: string;
  value?: string | null;
  isRevealed: boolean;
  difficulty?: number;
  spoilerLevel?: "safe" | "late";
}

export interface DuelGuess {
  name: string;
  mapData: GuessedCountryMapData | null;
}

export interface DuelRound {
  position: number;
  version: number;
  status: "available" | "in-progress" | "completed" | "waiting";
  clues: DuelClue[];
  canGuess?: boolean;
  score?: number | null;
  guess?: string | null;
  guesses: DuelGuess[];
  answer?: string | null;
  solutionCountry?: SolutionCountryMapData | null;
  message?: string | null;
}

export interface DuelResponse {
  id: string;
  inviteCode: string;
  status: DuelStatus;
  challenger: DuelPlayer;
  opponent?: DuelPlayer | null;
  playerRole: "challenger" | "opponent" | "spectator";
  canAccept?: boolean;
  settings: {
    rounds: number;
    category: EntityCategory;
    mode: GameMode;
  };
  rounds: DuelRound[];
  currentRound?: DuelRound | null;
  opponentProgress?: { completed: number; score: number | null };
  ownProgress?: { completed: number; score: number };
  scores?: { challenger: number; opponent: number };
  shareUrl?: string;
  expiresAt?: string | null;
}

interface DuelShellProps {
  countryOptions: string[];
  inviteCode: string;
}

type Action = "accept" | "start" | "reveal" | "guess" | "give-up";

function unwrapDuel(payload: unknown): DuelResponse {
  if (
    payload &&
    typeof payload === "object" &&
    "duel" in payload &&
    payload.duel &&
    typeof payload.duel === "object"
  ) {
    return payload.duel as DuelResponse;
  }
  return payload as DuelResponse;
}

function playerLabel(player: DuelPlayer | null | undefined, fallback: string) {
  return player?.name?.trim() || fallback;
}

function formatCategory(category: string) {
  return category
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function DuelShell({ countryOptions, inviteCode }: DuelShellProps) {
  const [duel, setDuel] = useState<DuelResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guess, setGuess] = useState("");
  const [copied, setCopied] = useState(false);

  const loadDuel = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/duels/${encodeURIComponent(inviteCode)}`,
        {
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error("This duel could not be loaded.");
      setDuel(unwrapDuel(await response.json()));
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "This duel could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [inviteCode]);

  useEffect(() => {
    void loadDuel();
  }, [loadDuel]);

  useEffect(() => {
    if (duel?.status !== "pending" && duel?.status !== "active") return;
    const intervalId = window.setInterval(() => void loadDuel(), 7000);
    return () => window.clearInterval(intervalId);
  }, [duel?.status, loadDuel]);

  const mutate = useCallback(
    async (
      action: Action,
      position?: number,
      body?: Record<string, unknown>,
    ) => {
      setIsBusy(true);
      setError(null);
      try {
        const suffix =
          action === "accept" ? "accept" : `rounds/${position}/${action}`;
        const response = await fetch(
          `/api/duels/${encodeURIComponent(inviteCode)}/${suffix}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined,
          },
        );
        const payload = (await response.json()) as unknown;
        if (!response.ok) {
          throw new Error(
            payload &&
              typeof payload === "object" &&
              "error" in payload &&
              typeof payload.error === "string"
              ? payload.error
              : "Something went wrong. Please try again.",
          );
        }
        setDuel(unwrapDuel(payload));
        if (action === "guess") setGuess("");
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Something went wrong.",
        );
      } finally {
        setIsBusy(false);
      }
    },
    [inviteCode],
  );

  const shareUrl =
    duel?.shareUrl ??
    (typeof window !== "undefined" ? window.location.href : "");
  const currentRound =
    duel?.currentRound ??
    duel?.rounds.find(
      (round) => round.status === "in-progress" || round.status === "available",
    );
  const completedRounds =
    duel?.rounds.filter((round) => round.status === "completed").length ?? 0;
  const opponentName = playerLabel(
    duel?.playerRole === "challenger" ? duel?.opponent : duel?.challenger,
    "Waiting for opponent",
  );
  const winner = useMemo(() => {
    if (!duel?.scores) return null;
    if (duel.scores.challenger === duel.scores.opponent) return "draw";
    const challengerWon = duel.scores.challenger > duel.scores.opponent;
    if (duel.playerRole === "spectator") {
      return challengerWon ? "challenger" : "opponent";
    }
    return (duel.playerRole === "challenger") === challengerWon
      ? "you"
      : "opponent";
  }, [duel]);

  async function copyInvite() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function createRematch() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/duels/${encodeURIComponent(inviteCode)}/rematch`,
        { method: "POST" },
      );
      const payload = (await response.json().catch(() => null)) as {
        inviteUrl?: string;
        inviteCode?: string;
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not create a rematch.");
      }
      const nextUrl =
        payload?.inviteUrl ??
        (payload?.inviteCode ? `/duel/${payload.inviteCode}` : null);
      if (!nextUrl) throw new Error("The rematch link was missing.");
      window.location.assign(nextUrl);
    } catch (rematchError) {
      setError(
        rematchError instanceof Error
          ? rematchError.message
          : "Could not create a rematch.",
      );
      setIsBusy(false);
    }
  }

  if (isLoading) return <LoadingState />;
  if (error && !duel)
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setIsLoading(true);
          void loadDuel();
        }}
      />
    );
  if (!duel) return null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-3 pb-10 pt-24 sm:px-4 sm:pb-12 sm:pt-28">
      <div className="mb-5 flex items-center justify-between gap-3 px-1 sm:mb-7">
        <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-accent-bg/10 text-accent">
            <Swords className="size-4" />
          </span>
          Duel mode
        </div>
        <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">
          #{duel.inviteCode}
        </span>
      </div>

      {error ? (
        <div
          className="mb-4 rounded-2xl border border-warning bg-warning-muted text-warning"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {duel.status === "pending" && duel.canAccept ? (
        <InviteState
          duel={duel}
          isBusy={isBusy}
          onAccept={() => void mutate("accept")}
        />
      ) : null}
      {duel.status === "pending" && !duel.canAccept ? (
        <WaitingState
          duel={duel}
          copied={copied}
          onCopy={() => void copyInvite()}
        />
      ) : null}
      {duel.status === "expired" ? (
        <TerminalState
          title="This duel has expired"
          description="The invitation window has closed. Start a fresh challenge from the game hub."
          icon={<Clock3 />}
        />
      ) : null}
      {duel.status === "completed" ? (
        <Scoreboard
          duel={duel}
          winner={winner}
          isBusy={isBusy}
          onRematch={
            duel.playerRole === "spectator"
              ? undefined
              : () => void createRematch()
          }
        />
      ) : null}
      {duel.status === "active" ? (
        <ActiveDuel
          duel={duel}
          currentRound={currentRound}
          completedRounds={completedRounds}
          opponentName={opponentName}
          guess={guess}
          isBusy={isBusy}
          onGuessChange={setGuess}
          onStart={() =>
            currentRound && void mutate("start", currentRound.position)
          }
          onReveal={(clueKey) =>
            currentRound &&
            void mutate("reveal", currentRound.position, {
              clueKey,
              version: currentRound.version,
            })
          }
          onGuess={() =>
            currentRound &&
            void mutate("guess", currentRound.position, {
              guess: guess.trim(),
              method: "text",
              version: currentRound.version,
            })
          }
          onGiveUp={() =>
            currentRound &&
            void mutate("give-up", currentRound.position, {
              version: currentRound.version,
            })
          }
          onMapGuess={(countryName) =>
            currentRound &&
            void mutate("guess", currentRound.position, {
              guess: countryName,
              method: "map",
              version: currentRound.version,
            })
          }
          countryOptions={countryOptions}
        />
      ) : null}
    </main>
  );
}

function LoadingState() {
  return (
    <main className="grid min-h-screen place-items-center px-4 pt-20">
      <Card
        className="flex items-center gap-3 text-sm text-secondary"
        elevation="low"
        padding={5}
      >
        <LoaderCircle className="size-4 animate-spin text-accent" /> Loading
        duel…
      </Card>
    </main>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <main className="mx-auto grid min-h-screen max-w-xl place-items-center px-4 pt-20">
      <Card
        className="w-full p-7 text-center sm:p-10"
        elevation="low"
        padding={0}
      >
        <Shield className="mx-auto size-8 text-warning" />
        <h1 className="mt-4 font-heading text-3xl font-semibold">
          Duel unavailable
        </h1>
        <p className="mt-2 text-sm text-secondary">{message}</p>
        <Button
          className="mt-6"
          label="Try again"
          onClick={onRetry}
          variant="primary"
        />
      </Card>
    </main>
  );
}

function InviteState({
  duel,
  isBusy,
  onAccept,
}: {
  duel: DuelResponse;
  isBusy: boolean;
  onAccept: () => void;
}) {
  return (
    <Card
      className="mx-auto max-w-3xl overflow-hidden"
      elevation="low"
      padding={0}
    >
      <div className="bg-accent-muted p-6 sm:p-10">
        <div className="flex size-14 items-center justify-center rounded-lg bg-accent-bg text-on-accent shadow-md ">
          <Swords className="size-7" />
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-wider text-accent">
          You’ve been challenged
        </p>
        <h1 className="mt-2 max-w-xl font-heading text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Settle it over {duel.settings.rounds} rounds.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-secondary">
          {playerLabel(duel.challenger, "A player")} picked a duel in{" "}
          {formatCategory(duel.settings.category)}. Every round is the same for
          both players.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            icon={<LogIn />}
            isLoading={isBusy}
            label="Accept challenge"
            onClick={onAccept}
            variant="primary"
          />
          <span className="text-xs text-secondary">
            {formatCategory(duel.settings.mode)} · {duel.settings.rounds} rounds
          </span>
        </div>
      </div>
    </Card>
  );
}

function WaitingState({
  duel,
  copied,
  onCopy,
}: {
  duel: DuelResponse;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Card className="mx-auto max-w-3xl p-6 sm:p-10" elevation="low" padding={0}>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-warning-muted text-warning">
        <Users className="size-6" />
      </div>
      <p className="mt-7 text-xs font-bold uppercase tracking-wider text-warning">
        Challenge created
      </p>
      <h1 className="mt-2 font-heading text-4xl font-semibold leading-none sm:text-5xl">
        Your opponent is one link away.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-secondary">
        Share the invite and this room will unlock as soon as they accept.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-secondary">
          <Share2 className="size-4 shrink-0 text-accent" />
          <span className="truncate">
            {duel.shareUrl ?? `wikiguesser.com/duel/${duel.inviteCode}`}
          </span>
        </div>
        <Button
          icon={copied ? <Check /> : <Copy />}
          label={copied ? "Copied" : "Copy link"}
          onClick={onCopy}
          variant="secondary"
        />
      </div>
      <div className="mt-8 flex items-center gap-2 text-sm text-secondary">
        <span className="inline-flex size-2 rounded-full bg-warning" /> Waiting
        for opponent to join
      </div>
    </Card>
  );
}

function ActiveDuel({
  duel,
  currentRound,
  completedRounds,
  opponentName,
  guess,
  isBusy,
  onGuessChange,
  onStart,
  onReveal,
  onGuess,
  onGiveUp,
  onMapGuess,
  countryOptions,
}: {
  duel: DuelResponse;
  currentRound?: DuelRound;
  completedRounds: number;
  opponentName: string;
  guess: string;
  isBusy: boolean;
  onGuessChange: (value: string) => void;
  onStart: () => void;
  onReveal: (key: string) => void;
  onGuess: () => void;
  onGiveUp: () => void;
  onMapGuess: (countryName: string) => void;
  countryOptions: string[];
}) {
  if (!currentRound)
    return (
      <TerminalState
        title="Your rounds are complete"
        description={`Waiting for ${opponentName} to finish.`}
        icon={<Sparkles />}
      />
    );
  const roundFinished =
    currentRound.status === "completed" || currentRound.status === "waiting";
  const isCountryDuel = duel.settings.category === "countries";
  const guessedCountryNames = new Set(
    currentRound.guesses.map((entry) => normalizeGuess(entry.name)),
  );
  const normalizedGuess = normalizeGuess(guess);
  const isCountryGuessValid =
    !isCountryDuel ||
    countryOptions.some(
      (country) => normalizeGuess(country) === normalizedGuess,
    );
  const isRepeatedGuess = guessedCountryNames.has(normalizedGuess);
  const validationMessage =
    isCountryDuel && guess.trim() && !isCountryGuessValid
      ? "Pick a listed country."
      : isRepeatedGuess
        ? "Already tried."
        : null;
  const clues: RoundClue[] = currentRound.clues.map((clue) => ({
    key: clue.key,
    label: clue.label,
    value: clue.value ?? null,
    prefetchedValue: clue.value ?? "",
    isRevealed: clue.isRevealed,
    difficulty: clue.difficulty ?? 1,
    spoilerLevel: clue.spoilerLevel ?? "safe",
  }));
  const activeRound =
    currentRound.status === "in-progress"
      ? {
          roundId: `${duel.id}:${currentRound.position}`,
          token: "duel",
          kind: "standard" as const,
          category: duel.settings.category,
          continent: null,
          mode: duel.settings.mode,
          clues,
          revealedClues: [],
          remainingClues: clues.filter((clue) => !clue.isRevealed).length,
          canGuess: Boolean(currentRound.canGuess),
        }
      : null;

  return (
    <GamePlayView
      availableCountryOptions={countryOptions.filter(
        (country) => !guessedCountryNames.has(normalizeGuess(country)),
      )}
      boardAction={
        currentRound.status === "available" ? (
          <Button
            icon={<Sparkles />}
            isLoading={isBusy}
            label="Start round"
            onClick={onStart}
            variant="primary"
          />
        ) : null
      }
      canSubmitGuess={
        Boolean(guess.trim()) &&
        Boolean(currentRound.canGuess) &&
        isCountryGuessValid &&
        !isRepeatedGuess &&
        !isBusy
      }
      clearForCategoryChoice={() => undefined}
      currentCategory={duel.settings.category}
      currentCategoryLabel={duel.settings.category}
      currentClues={clues}
      currentMode={duel.settings.mode}
      displayScore={currentRound.score ?? 0}
      giveUpRound={onGiveUp}
      guess={guess}
      guessedEntities={currentRound.guesses.map((entry) => ({
        name: entry.name,
        direction: entry.mapData?.direction ?? null,
        mapData: entry.mapData,
      }))}
      guessButtonLabel="Submit guess"
      handleGuessSubmit={(event) => {
        event.preventDefault();
        if (
          guess.trim() &&
          currentRound.canGuess &&
          isCountryGuessValid &&
          !isRepeatedGuess
        )
          onGuess();
      }}
      handleMapGuess={onMapGuess}
      header={
        <DuelScoreRail
          duel={duel}
          completedRounds={completedRounds}
          opponentName={opponentName}
        />
      }
      isBusy={isBusy}
      isCountryRound={isCountryDuel}
      message={currentRound.message ?? ""}
      messageRevision={currentRound.version}
      result={null}
      revealClue={onReveal}
      revealedCount={clues.filter((clue) => clue.isRevealed).length}
      round={activeRound}
      setGuess={onGuessChange}
      showHomeButton={false}
      showRestartButton={false}
      sideFooter={
        <ProgressCard
          duel={duel}
          completedRounds={completedRounds}
          opponentName={opponentName}
        />
      }
      solutionCountry={currentRound.solutionCountry}
      startRound={() => undefined}
      statusAppearance={{
        icon: Sparkles,
        className: "",
        tone: roundFinished ? "info" : "warning",
      }}
      validationMessage={validationMessage}
      view="round"
      visibleClassicClues={clues.filter((clue) => clue.isRevealed)}
    />
  );
}

function DuelScoreRail({
  duel,
  completedRounds,
  opponentName,
}: {
  duel: DuelResponse;
  completedRounds: number;
  opponentName: string;
}) {
  const opponentCompleted = duel.opponentProgress?.completed ?? 0;
  return (
    <Card
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4 sm:px-7"
      aria-label="Duel scoreboard"
      elevation="low"
      padding={0}
    >
      <div className="min-w-0">
        <p className="truncate font-heading text-xl font-semibold sm:text-2xl">
          You
        </p>
        <p className="mt-1 text-xs font-semibold text-accent">
          {completedRounds}/{duel.settings.rounds} rounds ·{" "}
          {duel.ownProgress?.score ?? 0} pts
        </p>
      </div>
      <div className="grid place-items-center gap-1 border-x border-border px-4 text-center sm:px-8">
        <Swords className="size-4 text-accent" />
        <span className="text-xs font-bold uppercase tracking-wide text-secondary">
          VS
        </span>
      </div>
      <div className="min-w-0 text-right">
        <p className="truncate font-heading text-xl font-semibold sm:text-2xl">
          {opponentName}
        </p>
        <p className="mt-1 text-xs font-semibold text-warning">
          {opponentCompleted}/{duel.settings.rounds} rounds
        </p>
      </div>
    </Card>
  );
}

function ProgressCard({
  duel,
  completedRounds,
  opponentName,
}: {
  duel: DuelResponse;
  completedRounds: number;
  opponentName: string;
}) {
  const opponentCompleted = duel.opponentProgress?.completed ?? 0;
  return (
    <Card elevation="low" padding={5}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Users className="size-4 text-accent" /> Duel progress
      </div>
      <div className="mt-5 space-y-4">
        <ProgressRow
          name="You"
          value={completedRounds}
          total={duel.settings.rounds}
        />
        <ProgressRow
          name={opponentName}
          value={opponentCompleted}
          total={duel.settings.rounds}
          muted
        />
      </div>
      <div className="mt-5 border-t border-border pt-4 text-xs leading-5 text-secondary">
        Scores stay private until the duel is complete.
      </div>
    </Card>
  );
}

function ProgressRow({
  name,
  value,
  total,
  muted = false,
}: {
  name: string;
  value: number;
  total: number;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-xs font-semibold">
        <span className="truncate">{name}</span>
        <span className="text-secondary">
          {value}/{total}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-track">
        <div
          className={`h-2 rounded-full transition-all ${muted ? "bg-warning" : "bg-accent-bg"}`}
          style={{
            width: `${total ? Math.min(100, (value / total) * 100) : 0}%`,
          }}
        />
      </div>
    </div>
  );
}

function Scoreboard({
  duel,
  winner,
  isBusy,
  onRematch,
}: {
  duel: DuelResponse;
  winner: "you" | "challenger" | "opponent" | "draw" | null;
  isBusy: boolean;
  onRematch?: () => void;
}) {
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const challengerScore = duel.scores?.challenger ?? 0;
  const opponentScore = duel.scores?.opponent ?? 0;
  const isSpectator = duel.playerRole === "spectator";
  const youScore =
    duel.playerRole === "opponent" ? opponentScore : challengerScore;
  const theirScore =
    duel.playerRole === "opponent" ? challengerScore : opponentScore;
  const otherPlayer =
    duel.playerRole === "opponent" ? duel.challenger : duel.opponent;
  const title =
    winner === "draw"
      ? "A perfectly matched duel."
      : winner === "challenger"
        ? `${playerLabel(duel.challenger, "The challenger")} won the duel.`
        : isSpectator
          ? `${playerLabel(duel.opponent, "The opponent")} won the duel.`
          : winner === "you"
            ? "You take the duel."
            : "That was a close one.";
  const resultText = `${title} Final score: ${youScore}–${theirScore}.`;

  async function shareResult() {
    const url = duel.shareUrl ?? window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "WikiGuesser duel result",
          text: resultText,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${resultText} ${url}`);
      setShareStatus("copied");
    } catch {
      setShareStatus("failed");
    }
  }

  return (
    <Card
      className="mx-auto max-w-3xl overflow-hidden"
      elevation="low"
      padding={0}
    >
      <div className="bg-accent-muted p-6 text-center sm:p-10">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-warning-muted text-warning">
          <Trophy className="size-8" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-wider text-warning">
          Duel complete
        </p>
        <h1 className="mt-2 font-heading text-4xl font-semibold sm:text-5xl">
          {title}
        </h1>
        <div className="mx-auto mt-8 grid max-w-md grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div>
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-secondary">
              {isSpectator ? playerLabel(duel.challenger, "Challenger") : "You"}
            </p>
            <p className="mt-1 text-4xl font-semibold text-accent">
              {youScore}
            </p>
          </div>
          <span className="text-sm font-bold text-secondary">VS</span>
          <div>
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-secondary">
              {playerLabel(otherPlayer, "Opponent")}
            </p>
            <p className="mt-1 text-4xl font-semibold">{theirScore}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {onRematch ? (
            <Button
              icon={<RotateCcw />}
              isLoading={isBusy}
              label="Rematch"
              onClick={onRematch}
              variant="primary"
            />
          ) : null}
          <Button
            icon={shareStatus === "copied" ? <Check /> : <Share2 />}
            label={
              shareStatus === "copied"
                ? "Result copied"
                : shareStatus === "failed"
                  ? "Try sharing again"
                  : "Share result"
            }
            onClick={() => void shareResult()}
            variant="secondary"
          />
        </div>
      </div>
      {isSpectator ? null : <DuelRoundResults rounds={duel.rounds} />}
    </Card>
  );
}

function DuelRoundResults({ rounds }: { rounds: DuelRound[] }) {
  return (
    <section className="grid gap-4 p-6 sm:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">
          Round review
        </p>
        <h2 className="mt-1 font-heading text-2xl font-semibold">
          Answers and clues
        </h2>
      </div>
      <ol className="grid gap-4">
        {rounds.map((round) => {
          const flagUrl = round.clues.find(
            (clue) => clue.key === "flag-colors",
          )?.value;
          const guessedCountries = round.guesses.flatMap((guess) =>
            guess.mapData ? [guess.mapData] : [],
          );

          return (
            <li
              className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_15rem]"
              key={round.position}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Round {round.position}
                </p>
                <h3 className="mt-1 font-heading text-xl font-semibold">
                  {round.answer ?? "Answer unavailable"}
                </h3>
                {round.guesses.length > 0 ? (
                  <p className="mt-3 text-sm text-secondary">
                    Your guesses:{" "}
                    {round.guesses.map((guess) => guess.name).join(", ")}
                  </p>
                ) : null}
                {flagUrl ? (
                  <img
                    alt={`Flag of ${round.answer ?? "the answer"}`}
                    className="mt-4 block h-auto max-h-40 w-auto max-w-full rounded-lg border border-border object-contain"
                    height={160}
                    src={flagUrl}
                    width={240}
                  />
                ) : null}
              </div>
              {round.solutionCountry ? (
                <WorldMapDialog
                  guessedCountries={guessedCountries}
                  isExpanded={false}
                  onExpandedChange={() => undefined}
                  presentation="result"
                  solutionCountry={round.solutionCountry}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function TerminalState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card
      className="mx-auto max-w-2xl p-8 text-center sm:p-12"
      elevation="low"
      padding={0}
    >
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent-bg/10 text-accent">
        {icon}
      </div>
      <h1 className="mt-5 font-heading text-3xl font-semibold">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-secondary">
        {description}
      </p>
    </Card>
  );
}
