import { remainingCardsByTeam, type GameState } from "@/lib/game/types";
import { MUTED_TEXT, TEAM_STYLES } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";

export interface GameHeaderProps {
  state: GameState;
}

export function GameHeader({ state }: GameHeaderProps) {
  const remaining = remainingCardsByTeam(state.board);

  return (
    <div className="flex w-full items-end justify-between">
      <div>
        <h4 className="m-0 text-xl font-medium text-foreground">Codenames</h4>
        <div className={cn("text-sm", MUTED_TEXT)}>
          You are{" "}
          <span
            className="font-semibold"
            style={{ color: TEAM_STYLES[state.humanTeam].textStrong }}
          >
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
        <div className="text-[15px] font-medium text-foreground">
          {state.winner ? (
            <span
              className="capitalize"
              style={{ color: TEAM_STYLES[state.winner].textStrong }}
            >
              {state.winner} team wins!
            </span>
          ) : (
            <>
              Turn:{" "}
              <span
                className="capitalize font-semibold"
                style={{ color: TEAM_STYLES[state.currentTurn].textStrong }}
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
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: TEAM_STYLES[team].dot }}
      />
      <span
        className="text-lg font-semibold tabular-nums"
        style={{ color: TEAM_STYLES[team].textStrong }}
      >
        {remaining}
      </span>
      <span className={cn("text-xs capitalize", MUTED_TEXT)}>left</span>
    </div>
  );
}
