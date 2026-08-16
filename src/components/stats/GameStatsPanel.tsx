"use client";

import { useEffect, useState } from "react";
import { getStats, resetStats } from "@/app/actions";
import { EMPTY_STATS, totalGames, totalLosses, totalWins } from "@/lib/game/stats";
import type { GameStats, RoleRecord } from "@/lib/game/stats";
import { MUTED_TEXT } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

function RoleRow({ label, record }: { label: string; record: RoleRecord }) {
  const played = record.wins + record.losses;
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className={cn(MUTED_TEXT)}>{label}</span>
      <span className="font-mono text-foreground/85">
        {record.wins}–{record.losses}
        <span className={cn("ml-1.5 text-[11px]", MUTED_TEXT)}>
          ({played} played)
        </span>
      </span>
    </div>
  );
}

export function GameStatsPanel() {
  const [stats, setStats] = useState<GameStats>(EMPTY_STATS);
  const [loaded, setLoaded] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    getStats()
      .then(setStats)
      .finally(() => setLoaded(true));
  }, []);

  async function handleReset() {
    if (!window.confirm("Reset all win/loss stats? This can't be undone.")) {
      return;
    }
    setResetting(true);
    try {
      setStats(await resetStats());
    } finally {
      setResetting(false);
    }
  }

  if (!loaded || totalGames(stats) === 0) return null;

  return (
    <div className="mt-6 flex w-full max-w-3xl flex-col gap-3 rounded-lg border border-divider bg-surface p-5">
      <div className="flex items-center justify-between">
        <h6 className="text-xs font-medium uppercase tracking-wide text-foreground/60">
          Your record vs. the bots
        </h6>
        <Button variant="outline" size="sm" onClick={handleReset} disabled={resetting}>
          Reset stats
        </Button>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-medium text-foreground">
          {totalWins(stats)}–{totalLosses(stats)}
        </span>
        <span className={cn("text-xs", MUTED_TEXT)}>
          {totalGames(stats)} game{totalGames(stats) === 1 ? "" : "s"} played
        </span>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-divider pt-3">
        <RoleRow label="As Spymaster" record={stats.spymaster} />
        <RoleRow label="As Guesser" record={stats.guesser} />
      </div>
    </div>
  );
}
