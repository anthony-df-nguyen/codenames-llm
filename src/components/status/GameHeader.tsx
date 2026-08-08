import type { GameState } from "@/lib/game/types";
import { MUTED_TEXT, TEAM_STYLES } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";

export interface GameHeaderProps {
  state: GameState;
}

export function GameHeader({ state }: GameHeaderProps) {
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
  );
}
