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
  | { id: string; timestamp: number; type: "clue"; team: Team; source: LogSource; clue: string; number: number }
  | {
      id: string;
      timestamp: number;
      type: "reasoning";
      team: Team;
      role: "spymaster" | "guesser";
      text: string;
      /** Wall-clock time the bot spent on this request, when known. */
      durationMs?: number;
    }
  | {
      id: string;
      timestamp: number;
      type: "guess";
      team: Team;
      source: LogSource;
      word: string;
      cardType: CardType;
      correct: boolean;
    }
  | { id: string; timestamp: number; type: "turn-end"; team: Team; reason: TurnEndReason }
  | { id: string; timestamp: number; type: "error"; team: Team; message: string };

// Plain `Omit<LogEntry, "id" | "timestamp">` collapses the union to its
// shared fields — this distributes the omission over each member instead, so
// callers keep per-variant field checking (e.g. "clue" entries still require
// `clue`).
type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never;

export type LogEntryInput = DistributiveOmit<LogEntry, "id" | "timestamp">;

let counter = 0;
function nextId(): string {
  counter += 1;
  return `log-${Date.now()}-${counter}`;
}

export function makeLogEntry(entry: LogEntryInput): LogEntry {
  return { ...entry, id: nextId(), timestamp: Date.now() } as LogEntry;
}

export const TURN_END_LABEL: Record<TurnEndReason, string> = {
  "wrong-guess": "guessed a wrong-color card",
  assassin: "hit the assassin!",
  "guesses-exhausted": "ran out of guesses",
  stopped: "chose to stop guessing",
  win: "won the game!",
};
