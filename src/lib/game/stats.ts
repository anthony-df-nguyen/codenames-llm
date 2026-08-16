// Human-vs-bot win/loss record, broken down by which role the human played.
// Pure data shape + transitions — no fs, no React. Persisted to disk via the
// `getStats` / `recordGameResult` / `resetStats` server actions in
// actions.ts, which are the only things that touch the stats file.

import type { HumanRole } from "./types";

export interface RoleRecord {
  wins: number;
  losses: number;
}

export interface GameStats {
  spymaster: RoleRecord;
  guesser: RoleRecord;
}

export const EMPTY_STATS: GameStats = {
  spymaster: { wins: 0, losses: 0 },
  guesser: { wins: 0, losses: 0 },
};

export function recordResult(
  stats: GameStats,
  role: HumanRole,
  won: boolean
): GameStats {
  const record = stats[role];
  return {
    ...stats,
    [role]: won
      ? { ...record, wins: record.wins + 1 }
      : { ...record, losses: record.losses + 1 },
  };
}

export function totalWins(stats: GameStats): number {
  return stats.spymaster.wins + stats.guesser.wins;
}

export function totalLosses(stats: GameStats): number {
  return stats.spymaster.losses + stats.guesser.losses;
}

export function totalGames(stats: GameStats): number {
  return totalWins(stats) + totalLosses(stats);
}
