// Core game types. Pure TypeScript — no LLM involvement here.

export type Team = "red" | "blue";

export type CardType = Team | "neutral" | "assassin";

export interface Card {
  word: string;
  type: CardType;
  revealed: boolean;
}

// The board as the guesser side is allowed to see it: words and whether
// they're revealed, never the key card. The type exists so that "guesser
// context must not contain team info" is enforced structurally rather than
// by convention — see actions.ts.
export interface PublicCard {
  word: string;
  revealed: boolean;
}

export type HumanRole = "spymaster" | "guesser";

export interface Clue {
  clue: string;
  number: number;
}

/** A clue plus who gave it — the shape stored in `GameState.cluesGiven`. */
export interface ClueRecord extends Clue {
  team: Team;
}

export interface GameState {
  board: Card[];
  currentTurn: Team;
  starterTeam: Team;
  humanTeam: Team;
  humanRole: HumanRole;
  cluesGiven: ClueRecord[];
  winner: Team | null;
}

export function otherTeam(team: Team): Team {
  return team === "red" ? "blue" : "red";
}

export function randomTeam(): Team {
  return Math.random() < 0.5 ? "red" : "blue";
}

/** Strips the key card off a board, leaving only guesser-safe fields. */
export function toPublicBoard(board: Card[]): PublicCard[] {
  return board.map(({ word, revealed }) => ({ word, revealed }));
}
