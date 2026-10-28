import type { useCodenamesGame } from "@/hooks/useCodenamesGame";
import type { GameState } from "@/lib/game/types";
import { Board } from "@/components/board/Board";
import { GameLogRail } from "@/components/log/GameLogRail";
import { CommandDock } from "@/components/status/CommandDock";
import { ClueBanner } from "@/components/status/ClueBanner";
import { BotStatus } from "@/components/status/BotStatus";

export interface GuesserLayoutProps {
  game: ReturnType<typeof useCodenamesGame>;
  state: GameState;
}

// Mockup 1d — "command-dock" layout: full-width board with a right-rail
// game log; the pending clue / bot status render below the board, same as
// the spymaster layout. Applies only when the human is playing guesser;
// never imports KeyCard, so the key card structurally can't leak into this
// view.
export function GuesserLayout({ game, state }: GuesserLayoutProps) {
  return (
    <div className="relative flex w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-divider">
      <CommandDock state={state} onRestart={game.restart} />
      <div className="flex min-h-[560px] xl:h-[calc(100vh-14rem)]">
        <div className="flex flex-1 flex-col items-center gap-4 p-7">
          <Board
            cards={state.board}
            onCardClick={
              game.humanIsGuesserNow ? game.submitGuess : undefined
            }
            disabled={game.botBusy || !game.humanIsGuesserNow}
            highlightWord={game.lastGuess?.word ?? null}
            highlightCorrect={game.lastGuess?.correct ?? null}
          />

          {game.pendingClue ? (
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
            <BotStatus
              phase={game.humanIsGuesserNow ? null : game.botPhase}
              team={state.currentTurn}
            />
          )}
        </div>
        <GameLogRail
          entries={game.log}
          onRestart={game.restart}
          transcriptSaved={game.transcriptSaved}
          showSpymasterReasoning={game.showSpymasterReasoning}
          showGuesserReasoning={game.showGuesserReasoning}
          showTimestamps={game.showTimestamps}
          onShowSpymasterReasoningChange={game.setShowSpymasterReasoning}
          onShowGuesserReasoningChange={game.setShowGuesserReasoning}
          reasoningAvailable={game.reasoningAvailable}
          onShowTimestampsChange={game.setShowTimestamps}
        />
      </div>
    </div>
  );
}
