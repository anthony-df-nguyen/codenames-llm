// The client-side session around a GameState: which difficulty is in play,
// the clue currently being guessed against, and the narrative log. Kept out
// of GameState itself because none of it is rules state — the game would
// play out identically without it.

import type { Difficulty } from "@/lib/config/difficulty";
import type { Clue, GameState } from "./types";
import type { LogEntry } from "./log";

export interface GameSession {
  /** null between games — the setup screen is showing. */
  state: GameState | null;
  difficulty: Difficulty;
  /** The clue the current team is guessing against, if any. */
  pendingClue: Clue | null;
  /** null = unlimited (clue number was 0). */
  guessesLeft: number | null;
  // Guesses made against the current clue — a team must guess at least once
  // before it may voluntarily stop.
  guessesMade: number;
  log: LogEntry[];
}

/** A session mid-game, which is the only thing worth persisting. */
export type PersistedSession = GameSession & { state: GameState };

export const INITIAL_SESSION: GameSession = {
  state: null,
  difficulty: "medium",
  pendingClue: null,
  guessesLeft: 0,
  guessesMade: 0,
  log: [],
};

/** Patch that retires the current clue — applied wherever a turn ends. */
export const CLUE_CLEARED = {
  pendingClue: null,
  guessesLeft: 0,
  guessesMade: 0,
} satisfies Partial<GameSession>;

/** The most recent guess, for the board's flash highlight. */
export interface LastGuess {
  word: string;
  correct: boolean;
}
