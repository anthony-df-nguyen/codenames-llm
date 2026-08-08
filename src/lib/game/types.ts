// Core game types. Pure TypeScript — no LLM involvement here.

export type Team = "red" | "blue";

export type CardType = Team | "neutral" | "assassin";

export interface Card {
  word: string;
  type: CardType;
  revealed: boolean;
}

export type HumanRole = "spymaster" | "guesser";

export interface GameState {
  board: Card[];
  currentTurn: Team;
  starterTeam: Team;
  humanTeam: Team;
  humanRole: HumanRole;
  cluesGiven: { team: Team; clue: string; number: number }[];
  winner: Team | null;
}
