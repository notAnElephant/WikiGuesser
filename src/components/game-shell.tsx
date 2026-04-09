"use client";

import Confetti from "react-confetti";

import { GameMenuView } from "@/src/components/game-shell/menu-view";
import { GamePlayView } from "@/src/components/game-shell/play-view";
import { GameResultDialog } from "@/src/components/game-shell/result-dialog";
import type { GameShellProps } from "@/src/components/game-shell/types";
import { useGameShellController } from "@/src/components/game-shell/use-game-shell-controller";
import { useViewportSize } from "@/src/components/game-shell/use-viewport-size";

export function GameShell(props: GameShellProps) {
  const game = useGameShellController(props);
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();

  if (game.view === "menu") {
    return (
      <GameMenuView
        canStartRound={game.canStartRound}
        categories={game.categories}
        handleCategorySelect={game.handleCategorySelect}
        handleModeSelect={game.handleModeSelect}
        message={game.message}
        selectedCategory={game.selectedCategory}
        selectedCategoryLabel={game.selectedCategoryLabel}
        selectedMode={game.selectedMode}
        showRandomMix={game.showRandomMix}
        startRound={game.startRound}
        statusAppearance={game.statusAppearance}
        totalEntityCount={game.totalEntityCount}
        totalSelectedEntityCount={game.totalSelectedEntityCount}
      />
    );
  }

  const playView = game.view === "result" ? "result" : "round";

  return (
    <>
      <GamePlayView
        availableCountryOptions={game.availableCountryOptions}
        canSubmitGuess={game.canSubmitGuess}
        clearForCategoryChoice={game.clearForCategoryChoice}
        currentCategory={game.currentCategory}
        currentCategoryLabel={game.currentCategoryLabel}
        currentClues={game.currentClues}
        currentMode={game.currentMode}
        displayScore={game.displayScore}
        guess={game.guess}
        guessedEntities={game.guessedEntities}
        guessButtonLabel={game.guessButtonLabel}
        handleGuessSubmit={game.handleGuessSubmit}
        isBusy={game.isBusy}
        isCountryRound={game.isCountryRound}
        message={game.message}
        result={game.result}
        revealClue={game.revealClue}
        revealedCount={game.revealedCount}
        round={game.round}
        setGuess={game.setGuess}
        startRound={game.startRound}
        statusAppearance={game.statusAppearance}
        validationMessage={game.validationMessage}
        view={playView}
        visibleClassicClues={game.visibleClassicClues}
      />

      {game.result ? (
        <>
          {game.result.status === "win" &&
          viewportWidth > 0 &&
          viewportHeight > 0 ? (
            <Confetti
              gravity={0.16}
              height={viewportHeight}
              numberOfPieces={320}
              recycle={false}
              style={{
                inset: 0,
                pointerEvents: "none",
                position: "fixed",
                zIndex: 60,
              }}
              width={viewportWidth}
            />
          ) : null}
          <GameResultDialog
            clearForCategoryChoice={game.clearForCategoryChoice}
            currentCategory={game.currentCategory}
            currentCategoryLabel={game.currentCategoryLabel}
            isBusy={game.isBusy}
            result={game.result}
            startRound={game.startRound}
          />
        </>
      ) : null}
    </>
  );
}
