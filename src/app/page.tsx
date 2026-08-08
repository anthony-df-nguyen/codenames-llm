"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { GameSetup } from "@/components/setup/GameSetup";
import { Board } from "@/components/board/Board";
import { KeyCard } from "@/components/board/KeyCard";
import { ClueInput } from "@/components/clue/ClueInput";
import { GameLog } from "@/components/log/GameLog";
import { ClueBanner } from "@/components/status/ClueBanner";
import { BotStatus } from "@/components/status/BotStatus";
import type { GameState, HumanRole, Team } from "@/lib/game/types";
import type { Difficulty } from "@/lib/config/difficulty";
import {
  createInitialState,
  endTurn,
  giveClue,
  resolveGuess,
} from "@/lib/game/state";
import type { PublicCard } from "@/lib/bots/guesser";
import type { LogEntry, LogEntryInput, TurnEndReason } from "@/lib/game/log";
import { makeLogEntry } from "@/lib/game/log";
import { requestGuesserGuesses, requestSpymasterClue } from "./actions";
import { cn } from "@/lib/utils";

type Clue = { clue: string; number: number };

const STORAGE_KEY = "codenames-game";

type PersistedGame = {
  state: GameState;
  difficulty: Difficulty;
  pendingClue: Clue | null;
  guessesLeft: number;
  log: LogEntry[];
};

function loadPersistedGame(): PersistedGame | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedGame;
  } catch {
    return null;
  }
}

function savePersistedGame(game: PersistedGame) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

function clearPersistedGame() {
  window.localStorage.removeItem(STORAGE_KEY);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// The five pieces of state that get restored/updated together (on hydrate,
// game start, clue/guess resolution, etc). Grouped into one reducer so each
// of those moments is a single dispatch/render instead of several setStates.
type CombinedState = {
  state: GameState | null;
  difficulty: Difficulty;
  pendingClue: Clue | null;
  guessesLeft: number;
  log: LogEntry[];
};

type Patch =
  | Partial<CombinedState>
  | ((current: CombinedState) => Partial<CombinedState>);

type Action =
  | { type: "patch"; patch: Patch }
  | { type: "appendLog"; entry: LogEntryInput };

const initialCombinedState: CombinedState = {
  state: null,
  difficulty: "medium",
  pendingClue: null,
  guessesLeft: 0,
  log: [],
};

function combinedReducer(
  current: CombinedState,
  action: Action,
): CombinedState {
  switch (action.type) {
    case "patch": {
      const patch =
        typeof action.patch === "function"
          ? action.patch(current)
          : action.patch;
      return { ...current, ...patch };
    }
    case "appendLog":
      return { ...current, log: [...current.log, makeLogEntry(action.entry)] };
  }
}

// Figures out why a guessing turn ended, for the log — the game-state layer
// only tracks the resulting board/turn, not the narrative reason.
function describeTurnEnd(
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

// Plays out one team's bot-guesser turn against a snapshot of state, pushing
// each guess to React state as it happens, then ends the turn. Runs entirely
// off a local `current` variable rather than nested `setState` updaters so
// the sequence of guesses stays a plain, readable async loop.
async function runBotGuessTurn(
  initialState: GameState,
  clue: Clue,
  difficulty: Difficulty,
  cap: number,
  setState: (s: GameState) => void,
  appendLog: (entry: LogEntryInput) => void,
  setPhase: (phase: string | null) => void,
  setLastGuess: (info: { word: string; correct: boolean } | null) => void,
) {
  let current = initialState;
  const team = current.currentTurn;
  const publicBoard: PublicCard[] = current.board.map(({ word, revealed }) => ({
    word,
    revealed,
  }));

  let guesses: string[];
  try {
    setPhase(`${team} guesser is studying the board…`);
    const result = await requestGuesserGuesses(publicBoard, clue, difficulty);
    guesses = result.rankedGuesses.slice(0, cap);
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
    await sleep(600);
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
    const reason = guesses.length >= cap ? "guesses-exhausted" : "stopped";
    appendLog({ type: "turn-end", team, reason });
    setState(endTurn(current));
  }
  setPhase(null);
}

export default function Home() {
  const [combined, dispatch] = useReducer(
    combinedReducer,
    initialCombinedState,
  );
  const { state, difficulty, pendingClue, guessesLeft, log } = combined;
  const [clueError, setClueError] = useState<string | undefined>();
  const [botBusy, setBotBusy] = useState(false);
  const [botPhase, setBotPhase] = useState<string | null>(null);
  const [lastGuess, setLastGuess] = useState<{
    word: string;
    correct: boolean;
  } | null>(null);

  function dispatchPatch(patch: Patch) {
    dispatch({ type: "patch", patch });
  }

  const clueKeyRef = useRef<string | null>(null);
  const guessKeyRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);

  // Restore a saved game from localStorage on first mount (client-only, so
  // this runs after the initial render rather than in a lazy initializer).
  useEffect(() => {
    const saved = loadPersistedGame();
    if (saved) {
      dispatchPatch({
        state: saved.state,
        difficulty: saved.difficulty,
        pendingClue: saved.pendingClue,
        guessesLeft: saved.guessesLeft,
        log: saved.log,
      });
      // Leave both key refs null so a bot turn that was in flight when the
      // page was refreshed resumes instead of getting stuck waiting forever.
      clueKeyRef.current = null;
      guessKeyRef.current = null;
    }
    hydratedRef.current = true;
  }, []);

  // Persist game state on every change, once the initial restore has happened.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!state) {
      clearPersistedGame();
      return;
    }
    savePersistedGame({ state, difficulty, pendingClue, guessesLeft, log });
  }, [state, difficulty, pendingClue, guessesLeft, log]);

  function appendLog(entry: LogEntryInput) {
    dispatch({ type: "appendLog", entry });
  }

  function isHumanControlled(s: GameState, team: Team, role: HumanRole) {
    return team === s.humanTeam && role === s.humanRole;
  }

  function handleStart(role: HumanRole, diff: Difficulty) {
    const humanTeam: Team = Math.random() < 0.5 ? "red" : "blue";
    dispatchPatch({
      state: createInitialState(humanTeam, role),
      difficulty: diff,
      pendingClue: null,
      guessesLeft: 0,
      log: [],
    });
    setClueError(undefined);
    clueKeyRef.current = null;
    guessKeyRef.current = null;
  }

  // Bot spymaster's turn to give a clue.
  useEffect(() => {
    if (!state || state.winner || pendingClue) return;
    if (isHumanControlled(state, state.currentTurn, "spymaster")) return;

    const key = `clue-${state.cluesGiven.length}`;
    if (clueKeyRef.current === key) return;
    clueKeyRef.current = key;

    const team = state.currentTurn;
    setBotBusy(true);
    setBotPhase(`${team} spymaster is thinking of a clue…`);
    requestSpymasterClue(state.board, difficulty, team, state.cluesGiven)
      .then((result) => {
        dispatchPatch((current) => ({
          state: current.state
            ? giveClue(current.state, result.clue, result.number)
            : current.state,
          pendingClue: result,
          guessesLeft: result.number + 1,
        }));
        appendLog({
          type: "clue",
          team,
          source: "bot",
          clue: result.clue,
          number: result.number,
        });
      })
      .catch((e) =>
        appendLog({ type: "error", team, message: `spymaster error: ${e.message}` }),
      )
      .finally(() => {
        setBotBusy(false);
        setBotPhase(null);
      });
  }, [state, pendingClue, difficulty]);

  // Bot guesser's turn to guess.
  useEffect(() => {
    if (!state || state.winner || !pendingClue) return;
    if (isHumanControlled(state, state.currentTurn, "guesser")) return;

    const key = `guess-${state.cluesGiven.length}`;
    if (guessKeyRef.current === key) return;
    guessKeyRef.current = key;

    setBotBusy(true);
    runBotGuessTurn(
      state,
      pendingClue,
      difficulty,
      guessesLeft,
      (s) => dispatchPatch({ state: s }),
      appendLog,
      setBotPhase,
      setLastGuess,
    ).finally(() => {
      dispatchPatch({ pendingClue: null, guessesLeft: 0 });
      setBotBusy(false);
    });
  }, [state, pendingClue, difficulty, guessesLeft]);

  function handleClueSubmit(clue: string, number: number) {
    if (!state) return;
    try {
      const next = giveClue(state, clue, number);
      dispatchPatch({
        state: next,
        pendingClue: { clue, number },
        guessesLeft: number + 1,
      });
      setClueError(undefined);
      appendLog({
        type: "clue",
        team: state.currentTurn,
        source: "human",
        clue,
        number,
      });
    } catch (e) {
      setClueError(e instanceof Error ? e.message : "Invalid clue");
    }
  }

  function handleGuess(word: string) {
    if (!state || !pendingClue) return;
    const prevTeam = state.currentTurn;
    const card = state.board.find((c) => c.word === word);
    const next = resolveGuess(state, word);
    const turnEnded = next.currentTurn !== prevTeam || next.winner;
    dispatchPatch({
      state: next,
      ...(turnEnded
        ? { pendingClue: null, guessesLeft: 0 }
        : { guessesLeft: Math.max(0, guessesLeft - 1) }),
    });
    if (card) {
      const correct = card.type === prevTeam;
      setLastGuess({ word, correct });
      appendLog({
        type: "guess",
        team: prevTeam,
        source: "human",
        word,
        cardType: card.type,
        correct,
      });
      if (turnEnded) {
        appendLog({
          type: "turn-end",
          team: prevTeam,
          reason: describeTurnEnd(state, next, word),
        });
      }
    }
  }

  function handleStopGuessing() {
    if (!state || !pendingClue) return;
    appendLog({ type: "turn-end", team: state.currentTurn, reason: "stopped" });
    dispatchPatch({ state: endTurn(state), pendingClue: null, guessesLeft: 0 });
  }

  function handleRestart() {
    if (!window.confirm("Restart the game? Current progress will be lost.")) {
      return;
    }
    dispatchPatch({
      state: null,
      pendingClue: null,
      guessesLeft: 0,
      log: [],
    });
    setClueError(undefined);
    setBotBusy(false);
    setBotPhase(null);
    setLastGuess(null);
    clueKeyRef.current = null;
    guessKeyRef.current = null;
  }

  if (!state) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 p-8 font-sans dark:bg-black">
        <GameSetup onStart={handleStart} />
      </div>
    );
  }

  const humanIsSpymasterNow =
    !state.winner &&
    !pendingClue &&
    isHumanControlled(state, state.currentTurn, "spymaster");
  const humanIsGuesserNow =
    !state.winner &&
    Boolean(pendingClue) &&
    isHumanControlled(state, state.currentTurn, "guesser");

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-8 font-sans dark:bg-black">
      <div className="flex w-full max-w-6xl flex-col gap-6 xl:flex-row xl:items-start xl:justify-center">
        <div className="flex w-full max-w-5xl flex-col items-center gap-6">
          <div className="flex w-full items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Codenames
              </h1>
              <div className="text-lg text-zinc-500 dark:text-zinc-400">
                You are{" "}
                <span
                  className={cn(
                    "font-bold",
                    state.humanTeam === "red"
                      ? "text-red-500"
                      : "text-blue-500",
                  )}
                >
                  {state.humanTeam}
                </span>{" "}
                team&apos;s {state.humanRole}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-lg font-semibold text-foreground">
                {state.winner ? (
                  <span className="font-semibold capitalize">
                    {state.winner} team wins!
                  </span>
                ) : (
                  <>
                    Turn:{" "}
                    <span
                      className={cn(
                        "capitalize",
                        state.currentTurn === "red"
                          ? "text-red-500"
                          : "text-blue-500",
                      )}
                    >
                      {state.currentTurn}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
            <Board
              cards={state.board}
              onCardClick={humanIsGuesserNow ? handleGuess : undefined}
              disabled={botBusy || !humanIsGuesserNow}
              highlightWord={lastGuess?.word ?? null}
              highlightCorrect={lastGuess?.correct ?? null}
            />
          </div>

          <div>
            {" "}
            {state.humanRole === "spymaster" && (
              <KeyCard cards={state.board} />
            )}
          </div>

          <div className="flex w-full max-w-md flex-col items-center gap-3">
            {state.winner ? (
              <button
                type="button"
                onClick={() => dispatchPatch({ state: null })}
                className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                New game
              </button>
            ) : humanIsSpymasterNow ? (
              <ClueInput
                onSubmit={handleClueSubmit}
                error={clueError}
                disabled={botBusy}
              />
            ) : pendingClue ? (
              <ClueBanner
                clue={pendingClue}
                team={state.currentTurn}
                guessesLeft={guessesLeft}
                interactive={humanIsGuesserNow}
                onStop={handleStopGuessing}
                phase={!humanIsGuesserNow ? botPhase : null}
              />
            ) : (
              <BotStatus phase={botPhase} team={state.currentTurn} />
            )}
          </div>
        </div>

        <div className="flex w-full max-w-md shrink-0 flex-col gap-4 xl:sticky xl:top-8 xl:h-[calc(100vh-4rem)] xl:w-72">
          <button
            type="button"
            onClick={handleRestart}
            className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
          >
            Restart game
          </button>

          <GameLog entries={log} />
        </div>
      </div>
    </div>
  );
}
