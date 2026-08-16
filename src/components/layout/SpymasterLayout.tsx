import type { useCodenamesGame } from "@/hooks/useCodenamesGame";
import type { GameState } from "@/lib/game/types";
import { Board } from "@/components/board/Board";
import { KeyCard } from "@/components/board/KeyCard";
import { ClueInput } from "@/components/clue/ClueInput";
import { GameLog } from "@/components/log/GameLog";
import { ClueBanner } from "@/components/status/ClueBanner";
import { BotStatus } from "@/components/status/BotStatus";
import { GameHeader } from "@/components/status/GameHeader";
import { Button } from "@/components/ui/Button";

export interface SpymasterLayoutProps {
  game: ReturnType<typeof useCodenamesGame>;
  state: GameState;
}

// Mockup 1c — "today's layout": board + key card + clue form stacked
// center, restart + game log in a sidebar. This is the layout the app
// already shipped with; kept as its own component so it applies only when
// the human is playing spymaster.
export function SpymasterLayout({ game, state }: SpymasterLayoutProps) {
  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 xl:flex-row xl:items-start xl:justify-center">
      <div className="relative flex w-full max-w-3xl flex-col items-center gap-6">
        <GameHeader state={state} />

        <Board
          cards={state.board}
          onCardClick={game.humanIsGuesserNow ? game.submitGuess : undefined}
          disabled={game.botBusy || !game.humanIsGuesserNow}
          highlightWord={game.lastGuess?.word ?? null}
          highlightCorrect={game.lastGuess?.correct ?? null}
        />

        <KeyCard cards={state.board} />

        <div className="flex w-full max-w-md flex-col items-center gap-3">
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
            <BotStatus phase={game.botPhase} team={state.currentTurn} />
          )}
        </div>
      </div>

      <div className="flex w-full flex-1 shrink-0 flex-col gap-4 xl:sticky xl:top-8 xl:h-[calc(100vh-4rem)] xl:min-h-0 xl:w-72">
        <div className="flex shrink-0 flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={game.restart}
            className="w-full"
          >
            Restart game
          </Button>
          {game.transcriptSaved && (
            <p className="text-center text-xs text-foreground/40">
              Transcript saved to logs/{game.transcriptSaved}
            </p>
          )}
        </div>

        <GameLog entries={game.log} />
      </div>
    </div>
  );
}
