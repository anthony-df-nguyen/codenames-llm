import { remainingCardsByTeam, type GameState } from "@/lib/game/types";
import { MUTED_TEXT, TEAM_STYLES } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export interface CommandDockProps {
  state: GameState;
  onRestart: () => void;
}

// Top bar for the guesser layout (1d): team counts and a restart control.
// The pending-clue pill and bot status now render below the board, same as
// the spymaster layout's ClueBanner/BotStatus placement.
export function CommandDock({ state, onRestart }: CommandDockProps) {
  const remaining = remainingCardsByTeam(state.board);

  return (
    <div className="flex w-full items-center justify-between gap-5 border-b border-divider px-7 py-3.5">
      <div className="flex items-baseline gap-3.5">
        <h5 className="m-0 text-base font-medium text-foreground">
          Codenames
        </h5>
        <span className={cn("text-[12.5px]", MUTED_TEXT)}>
          You are{" "}
          <span
            className="font-semibold"
            style={{ color: TEAM_STYLES[state.humanTeam].textStrong }}
          >
            {state.humanTeam}
          </span>{" "}
          team&apos;s guesser
        </span>
      </div>

      <div className="flex items-center gap-4.5">
        <TeamDot team="red" remaining={remaining.red} />
        <TeamDot team="blue" remaining={remaining.blue} />
        <Button
          variant="outline"
          size="icon"
          title="Restart game"
          onClick={onRestart}
        >
          ⟲
        </Button>
      </div>
    </div>
  );
}

function TeamDot({
  team,
  remaining,
}: {
  team: GameState["currentTurn"];
  remaining: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: TEAM_STYLES[team].dot }}
      />
      <span
        className="text-sm font-semibold tabular-nums"
        style={{ color: TEAM_STYLES[team].textStrong }}
      >
        {remaining}
      </span>
    </div>
  );
}
