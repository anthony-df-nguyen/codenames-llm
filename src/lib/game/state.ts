// Turn state transitions and win/loss condition checks.

import type {
  ClueRecord,
  GameState,
  HumanRole,
  Team,
} from "./types";
import { otherTeam, randomTeam } from "./types";
import { generateBoard } from "./board";

// Official rules: a clue's number caps guesses at number + 1, except a clue
// of 0, which allows unlimited guesses (represented as null).
export function guessAllowance(clueNumber: number): number | null {
  return clueNumber === 0 ? null : clueNumber + 1;
}

export function createInitialState(
  humanTeam: Team,
  humanRole: HumanRole,
  starterTeam: Team = randomTeam()
): GameState {
  return {
    board: generateBoard(starterTeam),
    currentTurn: starterTeam,
    starterTeam,
    humanTeam,
    humanRole,
    cluesGiven: [],
    winner: null,
  };
}

// Call after mutating `revealed` on the board but before switching turns —
// relies on `currentTurn` still being the team that made the guess, since
// that's what determines who loses on an assassin reveal.
export function checkWinner(state: GameState): GameState["winner"] {
  const assassinRevealed = state.board.some(
    (c) => c.type === "assassin" && c.revealed
  );
  if (assassinRevealed) {
    return otherTeam(state.currentTurn);
  }

  for (const team of ["red", "blue"] as const) {
    const teamCards = state.board.filter((c) => c.type === team);
    if (teamCards.every((c) => c.revealed)) {
      return team;
    }
  }

  return null;
}

export function endTurn(state: GameState): GameState {
  return {
    ...state,
    currentTurn: otherTeam(state.currentTurn),
  };
}

// Reveals a card and checks for a winner. Does not change whose turn it is —
// see `resolveGuess` for the full guess flow including turn-switching.
export function revealCard(state: GameState, word: string): GameState {
  if (state.winner) return state;

  const board = state.board.map((c) =>
    c.word === word ? { ...c, revealed: true } : c
  );
  const next = { ...state, board };
  const winner = checkWinner(next);
  return winner ? { ...next, winner } : next;
}

// Full guess resolution: reveal the card, check for a winner, and end the
// turn if the guess wasn't the guessing team's own color.
export function resolveGuess(state: GameState, word: string): GameState {
  if (state.winner) return state;

  const card = state.board.find((c) => c.word === word);
  if (!card || card.revealed) return state;

  const guessingTeam = state.currentTurn;
  let next = revealCard(state, word);
  if (next.winner) return next;

  if (card.type !== guessingTeam) {
    next = endTurn(next);
  }
  return next;
}

export interface ClueValidationResult {
  valid: boolean;
  reason?: string;
}

// Board-independent half of clue legality: shape of the clue and the number.
// Split out so the clue input can pre-check a submission client-side without
// duplicating the rules or their wording — `validateClue` remains the source
// of truth and re-runs this.
export function validateClueFormat(
  clue: string,
  number: number
): ClueValidationResult {
  const trimmed = clue.trim();

  if (!Number.isInteger(number) || number < 0) {
    return { valid: false, reason: "Number must be a non-negative integer." };
  }
  if (!trimmed || /\s/.test(trimmed)) {
    return { valid: false, reason: "Clue must be a single word." };
  }
  return { valid: true };
}

export function validateClue(
  clue: string,
  number: number,
  board: GameState["board"],
  cluesGiven: ClueRecord[],
  team: Team
): ClueValidationResult {
  const format = validateClueFormat(clue, number);
  if (!format.valid) return format;

  const trimmed = clue.trim();

  const remainingTeamWords = board.filter(
    (c) => c.type === team && !c.revealed
  ).length;
  if (number > remainingTeamWords) {
    return {
      valid: false,
      reason: `Number cannot exceed your team's remaining words (${remainingTeamWords}).`,
    };
  }

  const normalizedClue = trimmed.toUpperCase();

  const clashesWithBoardWord = board.some((c) => {
    const word = c.word.toUpperCase();
    return word.includes(normalizedClue) || normalizedClue.includes(word);
  });
  if (clashesWithBoardWord) {
    return {
      valid: false,
      reason: "Clue cannot be a substring or superset of a board word.",
    };
  }

  const alreadyUsed = cluesGiven.some(
    (c) => c.clue.toUpperCase() === normalizedClue
  );
  if (alreadyUsed) {
    return { valid: false, reason: "Clue has already been used this game." };
  }

  return { valid: true };
}

// Assumes the clue has already passed `validateClue` — throws defensively
// otherwise, since clue legality must never be trusted to the model.
export function giveClue(
  state: GameState,
  clue: string,
  number: number
): GameState {
  const result = validateClue(
    clue,
    number,
    state.board,
    state.cluesGiven,
    state.currentTurn
  );
  if (!result.valid) {
    throw new Error(result.reason);
  }

  return {
    ...state,
    cluesGiven: [...state.cluesGiven, { team: state.currentTurn, clue, number }],
  };
}
