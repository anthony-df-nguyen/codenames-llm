"use client";

import { GameSetup } from "@/components/setup/GameSetup";
import { Board } from "@/components/board/Board";
import { KeyCard } from "@/components/board/KeyCard";
import { ClueInput } from "@/components/clue/ClueInput";
import { GameLog } from "@/components/log/GameLog";
import { ClueBanner } from "@/components/status/ClueBanner";
import { BotStatus } from "@/components/status/BotStatus";
import { GameHeader } from "@/components/status/GameHeader";
import { Button } from "@/components/ui/Button";
import { useCodenamesGame } from "@/hooks/useCodenamesGame";

const PAGE_SHELL =
  "flex flex-1 flex-col items-center bg-zinc-50 p-8 font-sans dark:bg-black";

export default function Home() {
  const game = useCodenamesGame();
  const { state } = game;

  if (!state) {
    return (
      <div className={`${PAGE_SHELL} justify-center`}>
        <GameSetup onStart={game.startGame} />
      </div>
    );
  }

  return (
    <div className={`${PAGE_SHELL} gap-6`}>
      <div className="flex w-full max-w-6xl flex-col gap-6 xl:flex-row xl:items-start xl:justify-center">
        <div className="flex w-full max-w-5xl flex-col items-center gap-6">
          <GameHeader state={state} />

          <Board
            cards={state.board}
            onCardClick={game.humanIsGuesserNow ? game.submitGuess : undefined}
            disabled={game.botBusy || !game.humanIsGuesserNow}
            highlightWord={game.lastGuess?.word ?? null}
            highlightCorrect={game.lastGuess?.correct ?? null}
          />

          {state.humanRole === "spymaster" && <KeyCard cards={state.board} />}

          <div className="flex w-full max-w-md flex-col items-center gap-3">
            {state.winner ? (
              <Button size="pill" onClick={game.endSession}>
                New game
              </Button>
            ) : game.humanIsSpymasterNow ? (
              <ClueInput
                onSubmit={game.submitClue}
                error={game.clueError}
                disabled={game.botBusy}
              />
            ) : game.pendingClue ? (
              <ClueBanner
                clue={game.pendingClue}
                team={state.currentTurn}
                guessesLeft={game.guessesLeft}
                interactive={game.humanIsGuesserNow}
                canStop={game.guessesMade > 0}
                onStop={game.stopGuessing}
                phase={game.humanIsGuesserNow ? null : game.botPhase}
              />
            ) : (
              <BotStatus phase={game.botPhase} team={state.currentTurn} />
            )}
          </div>
        </div>

        <div className="flex w-full max-w-md shrink-0 flex-col gap-4 xl:sticky xl:top-8 xl:h-[calc(100vh-4rem)] xl:w-72">
          <Button
            variant="outline"
            size="sm"
            onClick={game.restart}
            className="shrink-0"
          >
            Restart game
          </Button>

          <GameLog entries={game.log} />
        </div>
      </div>
    </div>
  );
}
