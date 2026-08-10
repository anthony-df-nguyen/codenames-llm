import { remainingCardsByTeam, type GameState } from "@/lib/game/types";
import { MUTED_TEXT, TEAM_STYLES } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";

export interface GameHeaderProps {
  state: GameState;
}

export function GameHeader({ state }: GameHeaderProps) {
  const remaining = remainingCardsByTeam(state.board);

  return (
    <div className="flex w-full items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Codenames</h1>
        <div className={cn("text-lg", MUTED_TEXT)}>
          You are{" "}
          <span className={cn("font-bold", TEAM_STYLES[state.humanTeam].text)}>
            {state.humanTeam}
          </span>{" "}
          team&apos;s {state.humanRole}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <TeamCount team="red" remaining={remaining.red} />
          <TeamCount team="blue" remaining={remaining.blue} />
        </div>
        <div className="text-lg font-semibold text-foreground">
          {state.winner ? (
            <span className="capitalize">{state.winner} team wins!</span>
          ) : (
            <>
              Turn:{" "}
              <span
                className={cn(
                  "capitalize",
                  TEAM_STYLES[state.currentTurn].text,
                )}
              >
                {state.currentTurn}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamCount({
  team,
  remaining,
}: {
  team: GameState["currentTurn"];
  remaining: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", TEAM_STYLES[team].dot)} />
      <span className={cn("text-lg font-bold tabular-nums", TEAM_STYLES[team].text)}>
        {remaining}
      </span>
      <span className={cn("text-xs capitalize", MUTED_TEXT)}>left</span>
    </div>
  );
}
