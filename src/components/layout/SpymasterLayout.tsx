import type { useCodenamesGame } from "@/hooks/useCodenamesGame";
import type { GameState } from "@/lib/game/types";
import { Board } from "@/components/board/Board";
import { KeyCard } from "@/components/board/KeyCard";
import { ClueInput } from "@/components/clue/ClueInput";
import { GameLogRail } from "@/components/log/GameLogRail";
import { CommandDock } from "@/components/status/CommandDock";
import { ClueBanner } from "@/components/status/ClueBanner";
import { BotStatus } from "@/components/status/BotStatus";

export interface SpymasterLayoutProps {
  game: ReturnType<typeof useCodenamesGame>;
  state: GameState;
}

// Command-dock layout: full-width board with a right-rail game log,
// matching the guesser layout's structure. Applies when the human is
// playing spymaster, so it also renders the KeyCard/ClueInput.
export function SpymasterLayout({ game, state }: SpymasterLayoutProps) {
  return (
    <div className="relative flex w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-divider">
      <CommandDock state={state} onRestart={game.restart} />
      <div className="flex min-h-[560px] xl:h-[calc(100vh-14rem)]">
        <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto p-7">
          <Board
            cards={state.board}
            onCardClick={game.humanIsGuesserNow ? game.submitGuess : undefined}
            disabled={game.botBusy || !game.humanIsGuesserNow}
            highlightWord={game.lastGuess?.word ?? null}
            highlightCorrect={game.lastGuess?.correct ?? null}
          />

          
          <div className="mt-5 flex w-full max-w-md flex-col items-center gap-3">
            {state.winner ? null : game.humanIsSpymasterNow ? (
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
              <BotStatus
                phase={game.humanIsGuesserNow ? null : game.botPhase}
                team={state.currentTurn}
              />
            )}
          </div>
          <KeyCard cards={state.board} />
        </div>
        <GameLogRail
          entries={game.log}
          onRestart={game.restart}
          transcriptSaved={game.transcriptSaved}
          showSpymasterReasoning={game.showSpymasterReasoning}
          showGuesserReasoning={game.showGuesserReasoning}
          showTimestamps={game.showTimestamps}
          onShowTimestampsChange={game.setShowTimestamps}
          onShowSpymasterReasoningChange={game.setShowSpymasterReasoning}
          onShowGuesserReasoningChange={game.setShowGuesserReasoning}
          reasoningAvailable={game.reasoningAvailable}
        />
      </div>
    </div>
  );
}
