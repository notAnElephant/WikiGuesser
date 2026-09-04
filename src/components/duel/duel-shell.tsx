"use client";

import {
  primaryButtonClass,
  secondaryButtonClass,
  surfaceClass,
} from "@/src/components/game-shell/config";
import {
  Check,
  Clipboard,
  Clock3,
  Copy,
  Flag,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  RotateCcw,
  Send,
  Share2,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
}

export interface DuelRound {
  position: number;
  version: number;
  status: "available" | "in-progress" | "completed" | "waiting";
  clues: DuelClue[];
  canGuess?: boolean;
  score?: number | null;
  guess?: string | null;
  answer?: string | null;
  message?: string | null;
}

export interface DuelResponse {
  id: string;
  inviteCode: string;
  status: DuelStatus;
  challenger: DuelPlayer;
  opponent?: DuelPlayer | null;
  playerRole: "challenger" | "opponent";
  canAccept?: boolean;
  settings: {
    rounds: number;
    category: string;
    mode: string;
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

export function DuelShell({ inviteCode }: DuelShellProps) {
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
        <div className="flex items-center gap-2 text-sm font-semibold text-[#6b6259] dark:text-[#9aa9bb]">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#0f766e]/10 text-[#0f766e] dark:bg-[#24d4c2]/12 dark:text-[#8ff4e7]">
            <Swords className="size-4" />
          </span>
          Duel mode
        </div>
        <span className="rounded-full border border-black/8 bg-white/55 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#81776d] dark:border-white/10 dark:bg-white/6 dark:text-[#9aa9bb]">
          #{duel.inviteCode}
        </span>
      </div>

      {error ? (
        <div
          className="mb-4 rounded-2xl border border-[#f59e0b]/30 bg-[#fef3c7]/70 px-4 py-3 text-sm text-[#92400e] dark:bg-[#451a03]/40 dark:text-[#fcd34d]"
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
          onRematch={() => void createRematch()}
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
              version: currentRound.version,
            })
          }
          onGiveUp={() =>
            currentRound &&
            void mutate("give-up", currentRound.position, {
              version: currentRound.version,
            })
          }
        />
      ) : null}
    </main>
  );
}

function LoadingState() {
  return (
    <main className="grid min-h-screen place-items-center px-4 pt-20">
      <div
        className={`${surfaceClass} flex items-center gap-3 px-5 py-4 text-sm text-[#6b6259] dark:text-[#b7c4d1]`}
      >
        <LoaderCircle className="size-4 animate-spin text-[#0f766e]" /> Loading
        duel…
      </div>
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
      <div className={`${surfaceClass} w-full p-7 text-center sm:p-10`}>
        <Shield className="mx-auto size-8 text-[#b45309]" />
        <h1 className="mt-4 font-serif-display text-3xl font-semibold">
          Duel unavailable
        </h1>
        <p className="mt-2 text-sm text-[#6b6259] dark:text-[#9aa9bb]">
          {message}
        </p>
        <button className={`${primaryButtonClass} mt-6`} onClick={onRetry}>
          Try again
        </button>
      </div>
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
    <section className={`${surfaceClass} mx-auto max-w-3xl overflow-hidden`}>
      <div className="bg-[linear-gradient(135deg,rgba(15,118,110,0.12),rgba(245,158,11,0.12),transparent)] p-6 sm:p-10">
        <div className="flex size-14 items-center justify-center rounded-[20px] bg-[#0f766e] text-white shadow-[0_14px_32px_rgba(15,118,110,0.24)] dark:bg-[#24d4c2] dark:text-[#082825]">
          <Swords className="size-7" />
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-[#0f766e] dark:text-[#8ff4e7]">
          You’ve been challenged
        </p>
        <h1 className="mt-2 max-w-xl font-serif-display text-4xl font-semibold leading-[0.98] tracking-tight sm:text-6xl">
          Settle it over {duel.settings.rounds} rounds.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-[#6b6259] dark:text-[#b7c4d1]">
          {playerLabel(duel.challenger, "A player")} picked a duel in{" "}
          {formatCategory(duel.settings.category)}. Every round is the same for
          both players.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            className={primaryButtonClass}
            disabled={isBusy}
            onClick={onAccept}
          >
            {isBusy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <LogIn className="size-4" />
            )}{" "}
            Accept challenge
          </button>
          <span className="text-xs text-[#81776d] dark:text-[#9aa9bb]">
            {formatCategory(duel.settings.mode)} · {duel.settings.rounds} rounds
          </span>
        </div>
      </div>
    </section>
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
    <section className={`${surfaceClass} mx-auto max-w-3xl p-6 sm:p-10`}>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f59e0b]/15 text-[#b45309] dark:bg-[#fbbf24]/15 dark:text-[#fcd34d]">
        <Users className="size-6" />
      </div>
      <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-[#b45309] dark:text-[#fcd34d]">
        Challenge created
      </p>
      <h1 className="mt-2 font-serif-display text-4xl font-semibold leading-none sm:text-5xl">
        Your opponent is one link away.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-[#6b6259] dark:text-[#b7c4d1]">
        Share the invite and this room will unlock as soon as they accept.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-black/8 bg-white/65 px-4 py-3 text-sm text-[#6b6259] dark:border-white/10 dark:bg-white/6 dark:text-[#c6d1dc]">
          <Share2 className="size-4 shrink-0 text-[#0f766e]" />
          <span className="truncate">
            {duel.shareUrl ?? `wikiguesser.com/duel/${duel.inviteCode}`}
          </span>
        </div>
        <button className={secondaryButtonClass} onClick={onCopy}>
          {copied ? (
            <Check className="size-4 text-[#0f766e]" />
          ) : (
            <Copy className="size-4" />
          )}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <div className="mt-8 flex items-center gap-2 text-sm text-[#81776d] dark:text-[#9aa9bb]">
        <span className="inline-flex size-2 rounded-full bg-[#f59e0b]" />{" "}
        Waiting for opponent to join
      </div>
    </section>
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
}) {
  if (!currentRound)
    return (
      <TerminalState
        title="Your rounds are complete"
        description={`Waiting for ${opponentName} to finish.`}
        icon={<Sparkles />}
      />
    );
  const revealedCount = currentRound.clues.filter(
    (clue) => clue.isRevealed,
  ).length;
  const roundFinished =
    currentRound.status === "completed" || currentRound.status === "waiting";
  return (
    <div className="grid gap-4">
      <DuelScoreRail
        duel={duel}
        completedRounds={completedRounds}
        opponentName={opponentName}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className={`${surfaceClass} p-5 sm:p-7`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f766e] dark:text-[#8ff4e7]">
                Round {currentRound.position} of {duel.settings.rounds}
              </p>
              <h1 className="mt-2 font-serif-display text-3xl font-semibold sm:text-4xl">
                Find the answer.
              </h1>
            </div>
            <div className="rounded-full bg-[#0f766e]/10 px-3 py-1.5 text-xs font-semibold text-[#0f766e] dark:bg-[#24d4c2]/12 dark:text-[#8ff4e7]">
              {revealedCount}/{currentRound.clues.length} clues revealed
            </div>
          </div>
          <div
            className="mt-6 grid grid-flow-col auto-cols-fr gap-1.5"
            aria-label={`${revealedCount} of ${currentRound.clues.length} clues revealed`}
            role="progressbar"
            aria-valuenow={revealedCount}
            aria-valuemin={0}
            aria-valuemax={currentRound.clues.length}
          >
            {currentRound.clues.map((clue) => (
              <span
                key={clue.key}
                className={`h-2 rounded-full ${clue.isRevealed ? "bg-[#0f766e] dark:bg-[#24d4c2]" : "bg-[#ded7cc] dark:bg-white/12"}`}
              />
            ))}
          </div>
          <div className="mt-6 overflow-hidden rounded-[22px] border border-black/8 dark:border-white/10">
            {currentRound.clues.map((clue, index) => (
              <div
                className={`flex items-start justify-between gap-4 px-4 py-4 ${index % 2 === 0 ? "bg-white/65 dark:bg-white/5" : "bg-transparent"}`}
                key={clue.key}
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#81776d] dark:text-[#9aa9bb]">
                    {clue.label}
                  </p>
                  <p className="mt-1 text-base leading-6 text-[#1f1b17] dark:text-[#f5f7fb]">
                    {clue.isRevealed
                      ? (clue.value ?? "No value")
                      : "Clue hidden"}
                  </p>
                </div>
                {!clue.isRevealed &&
                !roundFinished &&
                duel.settings.mode === "blurred-lines" ? (
                  <button
                    aria-label={`Reveal ${clue.label}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#0f766e]/20 px-3 py-2 text-xs font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/8 disabled:opacity-50 dark:border-[#24d4c2]/20 dark:text-[#8ff4e7]"
                    disabled={isBusy}
                    onClick={() => onReveal(clue.key)}
                  >
                    <LockKeyhole className="size-3.5" /> Reveal
                  </button>
                ) : (
                  <span className="mt-1 text-[#b3aa9f] dark:text-[#607286]">
                    <Flag className="size-4" />
                  </span>
                )}
              </div>
            ))}
          </div>
          {currentRound.status === "available" ? (
            <button
              className={`${primaryButtonClass} mt-6 w-full sm:w-auto`}
              disabled={isBusy}
              onClick={onStart}
            >
              {isBusy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}{" "}
              Start round
            </button>
          ) : null}
          {currentRound.status === "in-progress" && !roundFinished ? (
            <form
              className="mt-6 flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (guess.trim() && currentRound.canGuess) onGuess();
              }}
            >
              <input
                className="min-h-12 min-w-0 flex-1 rounded-full border border-black/10 bg-white/75 px-5 text-sm outline-none transition placeholder:text-[#a79e93] focus:border-[#0f766e] dark:border-white/10 dark:bg-white/6 dark:placeholder:text-[#718297]"
                value={guess}
                onChange={(event) => onGuessChange(event.target.value)}
                placeholder={
                  currentRound.canGuess
                    ? "Type your answer…"
                    : "Reveal a clue first…"
                }
                autoComplete="off"
                disabled={!currentRound.canGuess}
              />
              <button
                className={primaryButtonClass}
                disabled={isBusy || !guess.trim() || !currentRound.canGuess}
              >
                {isBusy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}{" "}
                Submit guess
              </button>
            </form>
          ) : null}
          {currentRound.status === "in-progress" ? (
            <button
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#81776d] transition hover:text-[#b91c1c] dark:text-[#9aa9bb] dark:hover:text-[#fca5a5]"
              disabled={isBusy}
              onClick={onGiveUp}
            >
              <Flag className="size-3.5" /> Give up this round
            </button>
          ) : null}
          {currentRound.message ? (
            <p className="mt-4 rounded-2xl bg-[#0f766e]/8 px-4 py-3 text-sm text-[#0f766e] dark:bg-[#24d4c2]/10 dark:text-[#8ff4e7]">
              {currentRound.message}
            </p>
          ) : null}
        </section>
        <aside className="grid content-start gap-4">
          <ProgressCard
            duel={duel}
            completedRounds={completedRounds}
            opponentName={opponentName}
          />
        </aside>
      </div>
    </div>
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
    <section
      className={`${surfaceClass} grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4 sm:px-7`}
      aria-label="Duel scoreboard"
    >
      <div className="min-w-0">
        <p className="truncate font-serif-display text-xl font-semibold sm:text-2xl">
          You
        </p>
        <p className="mt-1 text-xs font-semibold text-[#0f766e] dark:text-[#8ff4e7]">
          {completedRounds}/{duel.settings.rounds} rounds ·{" "}
          {duel.ownProgress?.score ?? 0} pts
        </p>
      </div>
      <div className="grid place-items-center gap-1 border-x border-black/8 px-4 text-center dark:border-white/10 sm:px-8">
        <Swords className="size-4 text-[#0f766e] dark:text-[#8ff4e7]" />
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#81776d] dark:text-[#9aa9bb]">
          VS
        </span>
      </div>
      <div className="min-w-0 text-right">
        <p className="truncate font-serif-display text-xl font-semibold sm:text-2xl">
          {opponentName}
        </p>
        <p className="mt-1 text-xs font-semibold text-[#b45309] dark:text-[#fcd34d]">
          {opponentCompleted}/{duel.settings.rounds} rounds
        </p>
      </div>
    </section>
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
    <div className={`${surfaceClass} p-5`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Users className="size-4 text-[#0f766e] dark:text-[#8ff4e7]" /> Duel
        progress
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
      <div className="mt-5 border-t border-black/8 pt-4 text-xs leading-5 text-[#81776d] dark:border-white/10 dark:text-[#9aa9bb]">
        Scores stay private until the duel is complete.
      </div>
    </div>
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
        <span className="text-[#81776d] dark:text-[#9aa9bb]">
          {value}/{total}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[#ded7cc] dark:bg-white/10">
        <div
          className={`h-2 rounded-full transition-all ${muted ? "bg-[#f59e0b]" : "bg-[#0f766e] dark:bg-[#24d4c2]"}`}
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
  winner: "you" | "opponent" | "draw" | null;
  isBusy: boolean;
  onRematch: () => void;
}) {
  const challengerScore = duel.scores?.challenger ?? 0;
  const opponentScore = duel.scores?.opponent ?? 0;
  const youScore =
    duel.playerRole === "challenger" ? challengerScore : opponentScore;
  const theirScore =
    duel.playerRole === "challenger" ? opponentScore : challengerScore;
  const otherPlayer =
    duel.playerRole === "challenger" ? duel.opponent : duel.challenger;
  const title =
    winner === "draw"
      ? "A perfectly matched duel."
      : winner === "you"
        ? "You take the duel."
        : "That was a close one.";
  return (
    <section className={`${surfaceClass} mx-auto max-w-3xl overflow-hidden`}>
      <div className="bg-[linear-gradient(135deg,rgba(15,118,110,0.12),rgba(245,158,11,0.14),transparent)] p-6 text-center sm:p-10">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#f59e0b]/18 text-[#b45309] dark:bg-[#fbbf24]/15 dark:text-[#fcd34d]">
          <Trophy className="size-8" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#b45309] dark:text-[#fcd34d]">
          Duel complete
        </p>
        <h1 className="mt-2 font-serif-display text-4xl font-semibold sm:text-5xl">
          {title}
        </h1>
        <div className="mx-auto mt-8 grid max-w-md grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div>
            <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-[#81776d]">
              You
            </p>
            <p className="mt-1 text-4xl font-semibold text-[#0f766e] dark:text-[#8ff4e7]">
              {youScore}
            </p>
          </div>
          <span className="text-sm font-bold text-[#b3aa9f]">VS</span>
          <div>
            <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-[#81776d]">
              {playerLabel(otherPlayer, "Opponent")}
            </p>
            <p className="mt-1 text-4xl font-semibold">{theirScore}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            className={primaryButtonClass}
            disabled={isBusy}
            onClick={onRematch}
          >
            {isBusy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            Rematch
          </button>
          <button
            className={secondaryButtonClass}
            onClick={() =>
              void navigator.clipboard.writeText(
                duel.shareUrl ?? window.location.href,
              )
            }
          >
            <Clipboard className="size-4" /> Share result
          </button>
        </div>
      </div>
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
    <section
      className={`${surfaceClass} mx-auto max-w-2xl p-8 text-center sm:p-12`}
    >
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#0f766e]/10 text-[#0f766e] dark:bg-[#24d4c2]/12 dark:text-[#8ff4e7]">
        {icon}
      </div>
      <h1 className="mt-5 font-serif-display text-3xl font-semibold">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#6b6259] dark:text-[#9aa9bb]">
        {description}
      </p>
    </section>
  );
}
