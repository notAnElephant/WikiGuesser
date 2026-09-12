"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Dice5, Play, WifiOff } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { GamePlayView } from "@/src/components/game-shell/play-view";
import { GameResultDialog } from "@/src/components/game-shell/result-dialog";
import type {
  ActiveRound,
  RoundOutcome,
} from "@/src/components/game-shell/types";
import { getMessageAppearance } from "@/src/components/game-shell/utils";
import { GAME_MODE_OPTIONS } from "@/src/components/game-shell/config";
import { OfflinePackStatus } from "@/src/components/offline-pack-status";
import { useOfflinePack } from "@/src/components/offline-pack-provider";
import { ContinentPickerDialog } from "@/src/components/shared-landing-shell";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { CONTINENT_LABELS, isContinentId } from "@/src/lib/content/continents";
import { normalizeGuess } from "@/src/lib/game/answer-matching";
import {
  getActiveOfflineCountryPack,
  getActiveOfflineRound,
  getOfflineCountryPack,
  getOfflineModeStats,
  giveUpOfflineRound,
  recordOfflineResult,
  resumeOfflineRound,
  revealOfflineClue,
  saveActiveOfflineRound,
  startOfflineRound,
  submitOfflineGuess,
  type OfflineCountryPack,
  type OfflineModeStats,
  type OfflineRoundProgress,
  type OfflineRoundState,
} from "@/src/lib/offline";
import type { ContinentId, ContinentOption, GameMode } from "@/src/lib/types";

function toActiveRound(progress: OfflineRoundProgress): ActiveRound {
  return { ...progress, playOrigin: "offline", token: null };
}

function buildContinentOptions(pack: OfflineCountryPack): ContinentOption[] {
  return Object.entries(CONTINENT_LABELS).flatMap(([id, label]) => {
    const continentId = id as ContinentId;
    const entityCount = pack.entities.filter((entity) =>
      entity.continents.includes(continentId),
    ).length;
    return entityCount > 0 ? [{ id: continentId, label, entityCount }] : [];
  });
}

export function OfflineCountriesShell() {
  const { state: managedPackState } = useOfflinePack();
  const [pack, setPack] = useState<OfflineCountryPack | null>(null);
  const [roundState, setRoundState] = useState<OfflineRoundState | null>(null);
  const [round, setRound] = useState<ActiveRound | null>(null);
  const [result, setResult] = useState<RoundOutcome | null>(null);
  const [guess, setGuess] = useState("");
  const [message, setMessageState] = useState("Offline country pack ready.");
  const [messageRevision, setMessageRevision] = useState(0);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedContinent, setSelectedContinent] =
    useState<ContinentId | null>(null);
  const [stats, setStats] = useState<OfflineModeStats[]>([]);
  const [completedGuesses, setCompletedGuesses] = useState<
    OfflineRoundState["guesses"]
  >([]);
  const [isBusy, setIsBusy] = useState(true);

  function setMessage(value: string) {
    setMessageState(value);
    setMessageRevision((current) => current + 1);
  }

  async function reloadStats() {
    setStats(
      await Promise.all(
        GAME_MODE_OPTIONS.map((mode) => getOfflineModeStats(mode.id)),
      ),
    );
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      const savedRound = await getActiveOfflineRound();
      let activePack = savedRound
        ? await getOfflineCountryPack(savedRound.snapshotKey)
        : await getActiveOfflineCountryPack();

      if (savedRound && !activePack) {
        await saveActiveOfflineRound(null);
        activePack = await getActiveOfflineCountryPack();
      }

      if (!active) return;
      setPack(activePack);
      await reloadStats();
      if (!active || !activePack) {
        setIsBusy(false);
        return;
      }

      if (savedRound && activePack) {
        try {
          const resumed = resumeOfflineRound(activePack, savedRound);
          setRoundState(resumed.state);
          setRound(toActiveRound(resumed));
          setSelectedMode(resumed.mode);
          setSelectedContinent(resumed.continent);
          setMessage("Offline round resumed.");
        } catch {
          await saveActiveOfflineRound(null);
        }
      } else {
        const params = new URLSearchParams(window.location.search);
        const requestedMode = params.get("mode");
        const requestedContinent = params.get("continent");
        if (requestedMode === "classic" || requestedMode === "blurred-lines") {
          const continent = isContinentId(requestedContinent)
            ? requestedContinent
            : null;
          start(activePack, requestedMode, continent);
        }
      }
      setIsBusy(false);
    })().catch(() => {
      if (active) setIsBusy(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!managedPackState) return;

    if (!managedPackState.activeSnapshotKey) {
      setPack(null);
      setRound(null);
      setRoundState(null);
      return;
    }

    if (managedPackState.status === "ready" && !roundState) {
      void getActiveOfflineCountryPack().then(setPack);
    }
  }, [managedPackState, roundState]);

  const countryOptions = useMemo(
    () =>
      [...(pack?.entities ?? [])]
        .map((entity) => entity.canonicalAnswer)
        .sort((left, right) => left.localeCompare(right)),
    [pack],
  );
  const guessedEntities = roundState?.guesses ?? completedGuesses;
  const guessedNames = new Set(
    guessedEntities.map((entry) => normalizeGuess(entry.name)),
  );
  const availableCountryOptions = countryOptions.filter(
    (country) => !guessedNames.has(normalizeGuess(country)),
  );
  const currentClues = round?.clues ?? result?.clues ?? [];
  const currentMode = round?.mode ?? result?.mode ?? selectedMode;
  const normalizedGuess = normalizeGuess(guess);
  const hasGuess = normalizedGuess.length > 0;
  const isValidGuess = countryOptions.some(
    (country) => normalizeGuess(country) === normalizedGuess,
  );
  const isAlreadyGuessed = guessedNames.has(normalizedGuess);
  const canSubmitGuess = Boolean(
    round?.canGuess && hasGuess && isValidGuess && !isAlreadyGuessed && !isBusy,
  );
  const validationMessage = !hasGuess
    ? null
    : !isValidGuess
      ? "Pick a listed country."
      : isAlreadyGuessed
        ? "Already tried."
        : null;
  const view = result ? "result" : "round";
  const statusAppearance = getMessageAppearance(
    message,
    result?.status ?? null,
  );

  function start(
    activePack: OfflineCountryPack,
    mode: GameMode,
    continent: ContinentId | null,
  ) {
    const started = startOfflineRound(activePack, {
      continent: continent ?? undefined,
      mode,
    });
    setSelectedMode(mode);
    setSelectedContinent(continent);
    setRoundState(started.state);
    setRound(toActiveRound(started));
    setResult(null);
    setCompletedGuesses([]);
    setGuess("");
    setMessage(mode === "blurred-lines" ? "Tap a row." : "Round live.");
    void saveActiveOfflineRound(started.state);
  }

  function startSelectedRound() {
    if (pack && selectedMode) start(pack, selectedMode, selectedContinent);
  }

  function revealClue(clueKey: string) {
    if (!pack || !roundState || isBusy) return;
    try {
      const revealed = revealOfflineClue(pack, roundState, clueKey);
      setRoundState(revealed.state);
      setRound(toActiveRound(revealed));
      setMessage(
        revealed.remainingClues === 0 ? "Last clue." : "Clue unlocked.",
      );
      void saveActiveOfflineRound(revealed.state);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reveal failed.");
    }
  }

  async function submitGuess(countryName?: string) {
    const submittedGuess = countryName ?? guess.trim();
    if (!pack || !roundState || !submittedGuess || isBusy) return;
    if (!countryName && (!isValidGuess || isAlreadyGuessed)) return;

    setIsBusy(true);
    try {
      const outcome = submitOfflineGuess(
        pack,
        roundState,
        submittedGuess,
        countryName ? "map" : "text",
      );
      setGuess("");

      if (outcome.isComplete) {
        await finishRound(outcome);
        return;
      }

      setRoundState(outcome.state);
      setRound(toActiveRound(outcome));
      await saveActiveOfflineRound(outcome.state);
      setMessage(
        outcome.mode === "blurred-lines"
          ? "Miss. Pick another row."
          : outcome.remainingClues === 0
            ? "Miss. Last chance."
            : "Miss. Next clue.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function finishRound(outcome: ReturnType<typeof submitOfflineGuess>) {
    setRound(null);
    setRoundState(null);
    setCompletedGuesses(outcome.guesses);
    setResult({
      canonicalAnswer: outcome.canonicalAnswer ?? "Unknown",
      category: "countries",
      clues: outcome.clues,
      kind: "standard",
      mode: outcome.mode,
      playOrigin: "offline",
      score: outcome.score,
      solutionCountry: outcome.solutionCountry,
      status: outcome.isCorrect ? "win" : "loss",
    });
    await saveActiveOfflineRound(null);
    setPack(await getActiveOfflineCountryPack());
    await recordOfflineResult(outcome.mode, {
      isCorrect: outcome.isCorrect,
      score: outcome.score,
    });
    await reloadStats();
    setMessage(
      outcome.isCorrect
        ? "Correct."
        : `Answer: ${outcome.canonicalAnswer ?? "Unknown"}.`,
    );
  }

  async function giveUpRound() {
    if (!pack || !roundState || isBusy) return;
    setIsBusy(true);
    try {
      await finishRound(giveUpOfflineRound(pack, roundState));
    } finally {
      setIsBusy(false);
    }
  }

  function clearToMenu() {
    setRound(null);
    setRoundState(null);
    setResult(null);
    setGuess("");
    setCompletedGuesses([]);
    setSelectedMode(null);
    setSelectedContinent(null);
    void saveActiveOfflineRound(null).then(async () => {
      setPack(await getActiveOfflineCountryPack());
    });
  }

  if (!pack) {
    return (
      <OfflineFrame>
        <OfflinePackStatus alwaysVisible />
        <EmptyState
          description="Open the installed app once while connected so WikiGuesser can save all country data and flags."
          headingLevel={1}
          icon={<WifiOff />}
          title={
            isBusy ? "Checking offline setup…" : "Countries are not downloaded"
          }
        />
      </OfflineFrame>
    );
  }

  if (!round && !result) {
    const continentOptions = buildContinentOptions(pack);
    return (
      <OfflineFrame>
        <OfflinePackStatus alwaysVisible />
        <section className="grid gap-4">
          <header>
            <h1 className="m-0 font-heading text-4xl font-semibold text-primary sm:text-5xl">
              Play countries offline
            </h1>
            <p className="m-0 mt-2 text-secondary">
              Both modes, every downloaded country, no connection required.
            </p>
          </header>
          <section className="grid gap-3 lg:grid-cols-2">
            {GAME_MODE_OPTIONS.map((mode) => (
              <Card className="grid gap-4" key={mode.id} padding={5}>
                <header className="flex items-start gap-3">
                  <mode.icon
                    aria-hidden="true"
                    className="size-6 text-accent"
                  />
                  <section>
                    <h2 className="m-0 font-heading text-2xl font-semibold text-primary">
                      {mode.label}
                    </h2>
                    <p className="m-0 mt-1 text-sm text-secondary">
                      {mode.hint}
                    </p>
                  </section>
                </header>
                <Button
                  icon={<Play aria-hidden="true" />}
                  label={`Play ${mode.label} offline`}
                  onClick={() => setSelectedMode(mode.id)}
                  variant="primary"
                  width="100%"
                >
                  Choose continent
                </Button>
              </Card>
            ))}
          </section>
          <section className="grid gap-3 sm:grid-cols-2">
            {stats.map((entry) => (
              <Card className="grid gap-2" key={entry.mode} padding={4}>
                <p className="m-0 text-sm font-semibold text-primary">
                  {GAME_MODE_OPTIONS.find((mode) => mode.id === entry.mode)
                    ?.label ?? entry.mode}
                </p>
                <p className="m-0 text-sm text-secondary">
                  {entry.roundsWon}/{entry.roundsPlayed} won ·{" "}
                  {entry.totalScore} points · best streak {entry.bestStreak}
                </p>
              </Card>
            ))}
          </section>
        </section>
        {selectedMode ? (
          <ContinentPickerDialog
            continentOptions={continentOptions}
            mode={selectedMode}
            onClose={() => setSelectedMode(null)}
            onSelect={(continent) => start(pack, selectedMode, continent)}
            selectedContinent={selectedContinent}
            totalCountryCount={pack.entities.length}
          />
        ) : null}
      </OfflineFrame>
    );
  }

  const flowLabel = selectedContinent
    ? `${CONTINENT_LABELS[selectedContinent]} · Offline · unranked`
    : "Offline · unranked";

  return (
    <OfflineFrame isGame>
      <GamePlayView
        availableCountryOptions={availableCountryOptions}
        canSubmitGuess={canSubmitGuess}
        clearForCategoryChoice={clearToMenu}
        currentCategory="countries"
        currentCategoryLabel="Countries"
        currentClues={currentClues}
        currentMode={currentMode}
        displayScore={result?.score ?? 0}
        flowLabel={flowLabel}
        giveUpRound={() => void giveUpRound()}
        guess={guess}
        guessedEntities={guessedEntities}
        guessButtonLabel={isBusy ? "…" : round?.canGuess ? "Guess" : "Reveal"}
        handleGuessSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void submitGuess();
        }}
        handleMapGuess={(country) => void submitGuess(country)}
        homeButtonLabel="Offline games"
        isBusy={isBusy}
        isCountryRound
        message={message}
        messageRevision={messageRevision}
        result={result}
        revealClue={revealClue}
        revealedCount={currentClues.filter((clue) => clue.isRevealed).length}
        restartButtonLabel="New offline round"
        round={round}
        setGuess={setGuess}
        startRound={startSelectedRound}
        statusAppearance={statusAppearance}
        validationMessage={validationMessage}
        view={view}
        visibleClassicClues={currentClues.filter((clue) => clue.isRevealed)}
      />
      {result && result.showDialog !== false ? (
        <GameResultDialog
          clearForCategoryChoice={clearToMenu}
          currentCategory="countries"
          currentCategoryLabel="Countries"
          guessedCountries={guessedEntities.flatMap((attempt) =>
            attempt.mapData ? [attempt.mapData] : [],
          )}
          isBusy={isBusy}
          onClose={() =>
            setResult((current) =>
              current ? { ...current, showDialog: false } : current,
            )
          }
          primaryActionLabel="Play again offline"
          result={result}
          secondaryActionLabel="Offline games"
          startRound={startSelectedRound}
        />
      ) : null}
    </OfflineFrame>
  );
}

function OfflineFrame({
  children,
  isGame = false,
}: {
  children: React.ReactNode;
  isGame?: boolean;
}) {
  return (
    <main className="fixed inset-0 z-50 overflow-y-auto bg-body">
      <header className="sticky top-0 z-40 border-b border-border bg-body/95 px-3 py-3 backdrop-blur-md sm:px-4">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <a
            className="inline-flex items-center gap-2 font-semibold text-primary"
            href="/offline"
          >
            <Dice5 aria-hidden="true" className="size-5 text-accent" />
            WikiGuesser
          </a>
          <p className="m-0 inline-flex items-center gap-2 text-sm text-secondary">
            <StatusDot label="Offline mode" variant="warning" />
            Offline
          </p>
          <ThemeToggle />
        </nav>
      </header>
      <section
        className={`mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-5 ${isGame ? "" : "grid gap-5"}`}
      >
        {children}
      </section>
    </main>
  );
}
