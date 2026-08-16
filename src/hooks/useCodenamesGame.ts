"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { recordGameResult, requestSpymasterClue, saveGameTranscript } from "@/app/actions";
import { runBotGuessTurn, describeTurnEnd } from "@/lib/game/botTurn";
import { buildGameTranscript } from "@/lib/game/exportLog";
import type { LogEntryInput, TurnEndReason } from "@/lib/game/log";
import { makeLogEntry } from "@/lib/game/log";
import {
  clearPersistedGame,
  loadPersistedGame,
  loadShowGuesserReasoning,
  loadShowSpymasterReasoning,
  loadShowTimestamps,
  saveShowGuesserReasoning,
  saveShowSpymasterReasoning,
  saveShowTimestamps,
  savePersistedGame,
} from "@/lib/game/persistence";
import type { GameSession, LastGuess } from "@/lib/game/session";
import { CLUE_CLEARED, INITIAL_SESSION } from "@/lib/game/session";
import {
  createInitialState,
  endTurn,
  giveClue,
  guessAllowance,
  resolveGuess,
} from "@/lib/game/state";
import type { GameState, HumanRole, Team } from "@/lib/game/types";
import { randomTeam } from "@/lib/game/types";

type Patch = Partial<GameSession> | ((s: GameSession) => Partial<GameSession>);

type Action =
  | { type: "patch"; patch: Patch }
  | { type: "appendLog"; entry: LogEntryInput };

// The session fields move together (on hydrate, game start, clue/guess
// resolution), so one reducer keeps each of those moments a single dispatch
// and a single render instead of several setStates.
function sessionReducer(current: GameSession, action: Action): GameSession {
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

function isHumanControlled(s: GameState, team: Team, role: HumanRole) {
  return team === s.humanTeam && role === s.humanRole;
}

/**
 * Owns the whole client-side game loop: session state, persistence, the two
 * bot-turn effects, and the human move handlers. `page.tsx` consumes this and
 * does nothing but render.
 */
export function useCodenamesGame() {
  const [session, dispatch] = useReducer(sessionReducer, INITIAL_SESSION);
  const {
    state,
    modelOverride,
    enableLogging,
    pendingClue,
    guessesLeft,
    guessesMade,
    log,
  } = session;

  const [clueError, setClueError] = useState<string | undefined>();
  const [botBusy, setBotBusy] = useState(false);
  const [botPhase, setBotPhase] = useState<string | null>(null);
  const [lastGuess, setLastGuess] = useState<LastGuess | null>(null);
  const [transcriptSaved, setTranscriptSaved] = useState<string | null>(null);

  // Display-only filters for the live game log — reasoning is always
  // captured (for transcript export) regardless of these. Standalone
  // preferences, so they carry over between games; can be flipped mid-game.
  const [showSpymasterReasoning, setShowSpymasterReasoningState] =
    useState(false);
  const [showGuesserReasoning, setShowGuesserReasoningState] = useState(true);
  const [showTimestamps, setShowTimestampsState] = useState(false);

  useEffect(() => {
    setShowSpymasterReasoningState(loadShowSpymasterReasoning());
    setShowGuesserReasoningState(loadShowGuesserReasoning());
    setShowTimestampsState(loadShowTimestamps());
  }, []);

  function setShowSpymasterReasoning(value: boolean) {
    setShowSpymasterReasoningState(value);
    saveShowSpymasterReasoning(value);
  }

  function setShowGuesserReasoning(value: boolean) {
    setShowGuesserReasoningState(value);
    saveShowGuesserReasoning(value);
  }

  function setShowTimestamps(value: boolean) {
    setShowTimestampsState(value);
    saveShowTimestamps(value);
  }

  const patch = useCallback((p: Patch) => dispatch({ type: "patch", patch: p }), []);
  const appendLog = useCallback(
    (entry: LogEntryInput) => dispatch({ type: "appendLog", entry }),
    [],
  );

  // Guards so each bot turn fires once per clue, keyed by clue count.
  const clueKeyRef = useRef<string | null>(null);
  const guessKeyRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);
  const transcriptSavedRef = useRef(false);
  const statsRecordedRef = useRef(false);

  function resetTurnGuards() {
    clueKeyRef.current = null;
    guessKeyRef.current = null;
  }

  // Restore a saved game on first mount (client-only, so this runs after the
  // initial render rather than in a lazy initializer).
  useEffect(() => {
    const saved = loadPersistedGame();
    if (saved) {
      patch({
        ...saved,
        modelOverride: saved.modelOverride ?? null,
        enableLogging: saved.enableLogging ?? false,
        guessesMade: saved.guessesMade ?? 0,
      });
      // Leave both key guards null so a bot turn that was in flight when the
      // page was refreshed resumes instead of getting stuck waiting forever.
      resetTurnGuards();
    }
    hydratedRef.current = true;
  }, [patch]);

  // Persist on every change, once the initial restore has happened.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!state) {
      clearPersistedGame();
      return;
    }
    savePersistedGame({
      state,
      modelOverride,
      enableLogging,
      pendingClue,
      guessesLeft,
      guessesMade,
      log,
    });
  }, [state, modelOverride, enableLogging, pendingClue, guessesLeft, guessesMade, log]);

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
    requestSpymasterClue(
      state.board,
      team,
      state.cluesGiven,
      modelOverride,
    )
      .then((result) => {
        patch((current) => ({
          state: current.state
            ? giveClue(current.state, result.clue, result.number)
            : current.state,
          pendingClue: result,
          guessesLeft: guessAllowance(result.number),
          guessesMade: 0,
        }));
        if (result.reasoning) {
          appendLog({
            type: "reasoning",
            team,
            role: "spymaster",
            text: result.reasoning,
            durationMs: result.reasoningDurationMs,
          });
        }
        appendLog({
          type: "clue",
          team,
          source: "bot",
          clue: result.clue,
          number: result.number,
        });
      })
      .catch((e: unknown) =>
        appendLog({
          type: "error",
          team,
          message: `spymaster error: ${e instanceof Error ? e.message : String(e)}`,
        }),
      )
      .finally(() => {
        setBotBusy(false);
        setBotPhase(null);
      });
  }, [state, pendingClue, modelOverride, patch, appendLog]);

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
      guessesLeft,
      {
        setState: (s) => patch({ state: s }),
        appendLog,
        setPhase: setBotPhase,
        setLastGuess,
      },
      modelOverride,
    ).finally(() => {
      patch(CLUE_CLEARED);
      setBotBusy(false);
    });
  }, [state, pendingClue, modelOverride, guessesLeft, patch, appendLog]);

  // Record the win/loss to the on-disk stats file once per finished game,
  // independent of the logging toggle — this is always-on, unlike the
  // transcript export below.
  useEffect(() => {
    if (!state?.winner) return;
    if (statsRecordedRef.current) return;
    statsRecordedRef.current = true;
    recordGameResult(state.humanRole, state.winner === state.humanTeam).catch(
      (e: unknown) =>
        appendLog({
          type: "error",
          team: state.currentTurn,
          message: `failed to record stats: ${e instanceof Error ? e.message : String(e)}`,
        }),
    );
  }, [state, appendLog]);

  // Once a logged game ends, write its transcript to logs/ automatically —
  // no manual copy/paste step. Guarded so it fires exactly once per game.
  useEffect(() => {
    if (!state?.winner || !enableLogging) return;
    if (transcriptSavedRef.current) return;
    transcriptSavedRef.current = true;

    const transcript = buildGameTranscript(state, log, modelOverride);
    saveGameTranscript(transcript)
      .then(({ filename }) => setTranscriptSaved(filename))
      .catch((e: unknown) =>
        appendLog({
          type: "error",
          team: state.currentTurn,
          message: `failed to save transcript: ${e instanceof Error ? e.message : String(e)}`,
        }),
      );
  }, [state, enableLogging, log, modelOverride, appendLog]);

  function startGame(role: HumanRole, model: string | null, enableLogging: boolean) {
    patch({
      ...INITIAL_SESSION,
      state: createInitialState(randomTeam(), role),
      modelOverride: model,
      enableLogging,
    });
    setClueError(undefined);
    setTranscriptSaved(null);
    transcriptSavedRef.current = false;
    statsRecordedRef.current = false;
    resetTurnGuards();
  }

  function submitClue(clue: string, number: number) {
    if (!state) return;
    try {
      patch({
        state: giveClue(state, clue, number),
        pendingClue: { clue, number },
        guessesLeft: guessAllowance(number),
        guessesMade: 0,
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

  function submitGuess(word: string) {
    if (!state || !pendingClue) return;
    if (guessesLeft !== null && guessesLeft <= 0) return;
    const prevTeam = state.currentTurn;
    const card = state.board.find((c) => c.word === word);
    if (!card || card.revealed) return;

    let next = resolveGuess(state, word);
    let turnEnded = next.currentTurn !== prevTeam || Boolean(next.winner);
    let turnEndReason: TurnEndReason | null = turnEnded
      ? describeTurnEnd(state, next, word)
      : null;

    const remaining = guessesLeft === null ? null : guessesLeft - 1;
    if (!turnEnded && remaining !== null && remaining <= 0) {
      next = endTurn(next);
      turnEnded = true;
      turnEndReason = "guesses-exhausted";
    }

    patch({
      state: next,
      ...(turnEnded
        ? CLUE_CLEARED
        : { guessesLeft: remaining, guessesMade: guessesMade + 1 }),
    });

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
    if (turnEndReason) {
      appendLog({ type: "turn-end", team: prevTeam, reason: turnEndReason });
    }
  }

  function stopGuessing() {
    if (!state || !pendingClue) return;
    // Official rules: a team must make at least one guess per clue.
    if (guessesMade < 1) return;
    appendLog({ type: "turn-end", team: state.currentTurn, reason: "stopped" });
    patch({ state: endTurn(state), ...CLUE_CLEARED });
  }

  function endSession() {
    patch({ ...INITIAL_SESSION, modelOverride });
    setClueError(undefined);
    setBotBusy(false);
    setBotPhase(null);
    setLastGuess(null);
    setTranscriptSaved(null);
    transcriptSavedRef.current = false;
    statsRecordedRef.current = false;
    resetTurnGuards();
  }

  function restart() {
    if (!window.confirm("Restart the game? Current progress will be lost.")) {
      return;
    }
    endSession();
  }

  // Whether the human is the one on the clock right now, per phase of turn.
  const humanIsSpymasterNow = Boolean(
    state &&
      !state.winner &&
      !pendingClue &&
      isHumanControlled(state, state.currentTurn, "spymaster"),
  );
  const humanIsGuesserNow = Boolean(
    state &&
      !state.winner &&
      pendingClue &&
      isHumanControlled(state, state.currentTurn, "guesser"),
  );

  return {
    state,
    pendingClue,
    guessesLeft,
    guessesMade,
    log,
    enableLogging,
    clueError,
    botBusy,
    botPhase,
    lastGuess,
    transcriptSaved,
    humanIsSpymasterNow,
    humanIsGuesserNow,
    showSpymasterReasoning,
    showGuesserReasoning,
    showTimestamps,
    setShowSpymasterReasoning,
    setShowGuesserReasoning,
    setShowTimestamps,
    startGame,
    submitClue,
    submitGuess,
    stopGuessing,
    restart,
    endSession,
  };
}
