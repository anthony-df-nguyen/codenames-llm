// Drives a bot guesser through one turn. Lives outside the React component
// so the sequence of guesses stays a plain async loop against a local
// `current` state variable rather than nested setState updaters.

import { requestGuesserGuesses } from "@/app/actions";
import type { Difficulty } from "@/lib/config/difficulty";
import { sleep } from "@/lib/utils";
import type { LogEntryInput, TurnEndReason } from "./log";
import type { Clue, GameState } from "./types";
import { toPublicBoard } from "./types";
import type { LastGuess } from "./session";
import { endTurn, resolveGuess } from "./state";

/** Pause between a bot's guesses so the board reads as a sequence of moves. */
const GUESS_PACING_MS = 600;

// Figures out why a guessing turn ended, for the log — the game-state layer
// only tracks the resulting board/turn, not the narrative reason.
export function describeTurnEnd(
  prevState: GameState,
  nextState: GameState,
  guessedWord: string,
): TurnEndReason {
  const card = prevState.board.find((c) => c.word === guessedWord);
  if (nextState.winner) {
    return card?.type === "assassin" ? "assassin" : "win";
  }
  return "wrong-guess";
}

export interface BotGuessTurnHandlers {
  setState: (s: GameState) => void;
  appendLog: (entry: LogEntryInput) => void;
  setPhase: (phase: string | null) => void;
  setLastGuess: (info: LastGuess | null) => void;
}

export async function runBotGuessTurn(
  initialState: GameState,
  clue: Clue,
  cap: number | null,
  { setState, appendLog, setPhase, setLastGuess }: BotGuessTurnHandlers,
  modelOverride: string | null = null,
  difficulty: Difficulty = "hard",
) {
  let current = initialState;
  const team = current.currentTurn;

  let guesses: string[];
  try {
    setPhase(`${team} guesser is studying the board…`);
    const result = await requestGuesserGuesses(
      toPublicBoard(current.board),
      clue,
      modelOverride,
      difficulty,
    );
    // `cap` already includes the official +1 bonus guess for a nonzero clue
    // number. If the bot voluntarily wants to stop, honor that by forgoing
    // the bonus guess rather than always guessing out to the full cap.
    const effectiveCap =
      result.stopGuessing && clue.number > 0 ? clue.number : cap;
    guesses =
      effectiveCap === null
        ? result.rankedGuesses
        : result.rankedGuesses.slice(0, effectiveCap);

    // Official rules: a team must make at least one guess per clue (mirrors
    // the human-side check in `stopGuessing`). The model can otherwise stop
    // before guessing at all by returning an empty ranked list.
    if (guesses.length === 0) {
      const fallback = current.board.find((c) => !c.revealed);
      if (fallback) guesses = [fallback.word];
    }
  } catch (e) {
    appendLog({
      type: "error",
      team,
      message: `guesser error: ${e instanceof Error ? e.message : String(e)}`,
    });
    setState(endTurn(current));
    setPhase(null);
    return;
  }

  for (const word of guesses) {
    setPhase(`${team} guesser is considering "${word}"…`);
    await sleep(GUESS_PACING_MS);
    const card = current.board.find((c) => c.word === word);
    if (!card || card.revealed) continue;

    const prevTeam = current.currentTurn;
    const prevState = current;
    current = resolveGuess(current, word);
    const correct = card.type === team;
    setState(current);
    setLastGuess({ word, correct });
    appendLog({
      type: "guess",
      team,
      source: "bot",
      word,
      cardType: card.type,
      correct,
    });

    if (current.currentTurn !== prevTeam || current.winner) {
      appendLog({
        type: "turn-end",
        team,
        reason: describeTurnEnd(prevState, current, word),
      });
      setPhase(null);
      return;
    }
  }

  if (!current.winner) {
    const reason =
      cap !== null && guesses.length >= cap ? "guesses-exhausted" : "stopped";
    appendLog({ type: "turn-end", team, reason });
    setState(endTurn(current));
  }
  setPhase(null);
}
