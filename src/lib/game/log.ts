// Structured game-log entries. Kept separate from GameState (game/types.ts)
// since this is UI narrative, not rules state — the game would play out
// identically without it.

import type { CardType, Team } from "./types";

export type LogSource = "bot" | "human";

export type TurnEndReason =
  | "wrong-guess"
  | "assassin"
  | "guesses-exhausted"
  | "stopped"
  | "win";

export type LogEntry =
  | { id: string; type: "clue"; team: Team; source: LogSource; clue: string; number: number }
  | {
      id: string;
      type: "guess";
      team: Team;
      source: LogSource;
      word: string;
      cardType: CardType;
      correct: boolean;
    }
  | { id: string; type: "turn-end"; team: Team; reason: TurnEndReason }
  | { id: string; type: "error"; team: Team; message: string };

// Plain `Omit<LogEntry, "id">` collapses the union to its shared fields —
// this distributes the omission over each member instead, so callers keep
// per-variant field checking (e.g. "clue" entries still require `clue`).
type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never;

export type LogEntryInput = DistributiveOmit<LogEntry, "id">;

let counter = 0;
function nextId(): string {
  counter += 1;
  return `log-${Date.now()}-${counter}`;
}

export function makeLogEntry(entry: LogEntryInput): LogEntry {
  return { ...entry, id: nextId() } as LogEntry;
}

export const TURN_END_LABEL: Record<TurnEndReason, string> = {
  "wrong-guess": "guessed a wrong-color card — turn over",
  assassin: "hit the assassin!",
  "guesses-exhausted": "ran out of guesses",
  stopped: "chose to stop guessing",
  win: "won the game!",
};
