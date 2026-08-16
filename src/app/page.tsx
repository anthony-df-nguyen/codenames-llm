"use client";

import { useEffect, useState } from "react";
import { GameSetup } from "@/components/setup/GameSetup";
import { GameStatsPanel } from "@/components/stats/GameStatsPanel";
import { SpymasterLayout } from "@/components/layout/SpymasterLayout";
import { GuesserLayout } from "@/components/layout/GuesserLayout";
import { Button } from "@/components/ui/Button";
import { TEAM_STYLES } from "@/lib/ui/styles";
import { useCodenamesGame } from "@/hooks/useCodenamesGame";

const PAGE_SHELL = "flex flex-1 flex-col items-center bg-background p-8";

export default function Home() {
  const game = useCodenamesGame();
  const { state } = game;
  const [dialogDismissed, setDialogDismissed] = useState(false);

  // `dialogDismissed` is local UI state, not part of the game session, so
  // starting a new game (state going back to null for the setup screen)
  // doesn't clear it on its own. Without this, dismissing the dialog once
  // then playing another game to a win leaves the popup permanently
  // suppressed until a full page refresh.
  useEffect(() => {
    if (!state) setDialogDismissed(false);
  }, [state]);

  if (!state) {
    return (
      <div className={`${PAGE_SHELL} justify-center`}>
        <GameSetup onStart={game.startGame} />
        <GameStatsPanel />
      </div>
    );
  }

  const showWinDialog = Boolean(state.winner) && !dialogDismissed;

  return (
    <div className={`${PAGE_SHELL} gap-6`}>
      <div
        className={`flex w-full flex-col items-center ${
          showWinDialog ? "opacity-45 blur-[1px]" : ""
        }`}
      >
        {state.humanRole === "guesser" ? (
          <GuesserLayout game={game} state={state} />
        ) : (
          <SpymasterLayout game={game} state={state} />
        )}
      </div>

      {showWinDialog && state.winner && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/45 p-4">
          <div
            className="flex w-[380px] flex-col items-center gap-1.5 rounded-lg bg-surface p-10 text-center shadow-lg"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <span
              className="mb-2 h-3 w-3 rounded-full"
              style={{ background: TEAM_STYLES[state.winner].dot }}
            />
            <h3
              className="m-0 text-2xl font-medium capitalize"
              style={{ color: TEAM_STYLES[state.winner].textStrong }}
            >
              {state.winner} team wins!
            </h3>
            <p className="mb-3.5 mt-0.5 text-[13px] text-foreground/60">
              All 9 {state.winner} agents contacted.
            </p>
            <Button size="pill" className="w-full" onClick={game.endSession}>
              New game
            </Button>
            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => setDialogDismissed(true)}
            >
              Review game log
            </Button>
            {game.transcriptSaved && (
              <span className="mt-2.5 font-mono text-[11px] text-foreground/40">
                Transcript saved to logs/{game.transcriptSaved}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
