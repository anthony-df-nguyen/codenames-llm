// Headless bot-vs-bot self-play — generates game transcripts without a human
// player or the Next.js UI, so prompt-tuning data isn't bottlenecked on
// someone playing full games by hand. Every function this script calls is
// the same plain game-logic / bot-call code the real app uses (state.ts,
// bots/spymaster.ts, bots/guesser.ts) — this file only replaces the UI loop
// in useCodenamesGame.ts + botTurn.ts with a plain async loop, and skips the
// "@/app/actions" server-action boundary since there's no client/server
// split to enforce outside Next.js (the guesser still only ever receives
// `toPublicBoard(...)`, same structural guarantee as production).
//
// Usage:
//   yarn simulate                     5 games, default model/prompt
//   yarn simulate -- --n 20
//   yarn simulate -- --n 20 --model qwen3:30b
//   yarn simulate -- --n 5 --verbose
//
// Output: logs/selfplay/selfplay-<timestamp>-g<n>.txt (kept separate from
// logs/game-*.txt so these don't get folded into the "human-assisted vs
// fully-bot" win-rate stat in findings.md — self-play games have no human
// on either team, so that stat doesn't apply to them. They're for
// high-volume evidence on spymaster/guesser *reasoning* quality instead.

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSpymasterClue } from "@/lib/bots/spymaster";
import { getGuesserGuesses } from "@/lib/bots/guesser";
import { BASE_BOT_CONFIG, withModelOverride, type BotConfig } from "@/lib/config/botConfig";
import { buildGameTranscript } from "@/lib/game/exportLog";
import { makeLogEntry, type LogEntry, type TurnEndReason } from "@/lib/game/log";
import {
  createInitialState,
  endTurn,
  giveClue,
  guessAllowance,
  resolveGuess,
} from "@/lib/game/state";
import { toPublicBoard, type GameState, type Team } from "@/lib/game/types";

// Safety valve against a pathological loop; a real game can't take anywhere
// near this many turns (25 cards total, at least one revealed per turn).
const MAX_TURNS = 100;

interface CliArgs {
  games: number;
  model: string | null;
  outDir: string;
  verbose: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { games: 5, model: null, outDir: "logs/selfplay", verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--n":
      case "--games":
        args.games = Number(argv[++i]);
        break;
      case "--model":
        args.model = argv[++i];
        break;
      case "--out":
        args.outDir = argv[++i];
        break;
      case "--verbose":
        args.verbose = true;
        break;
      default:
        console.warn(`Unknown argument, ignoring: ${arg}`);
    }
  }
  if (!Number.isInteger(args.games) || args.games < 1) {
    throw new Error(`--n must be a positive integer`);
  }
  return args;
}

interface GameResult {
  state: GameState;
  log: LogEntry[];
  aborted: boolean;
}

async function playOneGame(config: BotConfig, verbose: boolean): Promise<GameResult> {
  // humanTeam/humanRole are unused game-logic-wise in self-play — GameState
  // just requires them to be present. The transcript header hides them via
  // buildGameTranscript's selfPlay option below.
  let state = createInitialState("red", "guesser");
  const log: LogEntry[] = [];
  let turns = 0;

  while (!state.winner) {
    turns++;
    if (turns > MAX_TURNS) {
      log.push(
        makeLogEntry({
          type: "error",
          team: state.currentTurn,
          message: `Aborted: exceeded ${MAX_TURNS} turns without a winner`,
        }),
      );
      return { state, log, aborted: true };
    }

    const team = state.currentTurn;

    let clue;
    try {
      clue = await getSpymasterClue(state.board, config, team, state.cluesGiven);
    } catch (e) {
      log.push(
        makeLogEntry({
          type: "error",
          team,
          message: `spymaster error: ${e instanceof Error ? e.message : String(e)}`,
        }),
      );
      return { state, log, aborted: true };
    }

    if (clue.reasoning) {
      log.push(makeLogEntry({ type: "reasoning", team, role: "spymaster", text: clue.reasoning }));
    }
    if (verbose) console.log(`  [${team} spymaster] "${clue.clue}" for ${clue.number}`);

    try {
      // getSpymasterClue already validated internally (with re-prompt
      // retries) before returning, so this should never actually reject —
      // kept as a defensive check rather than trusting the model's own
      // self-report, same principle as the rest of the codebase.
      state = giveClue(state, clue.clue, clue.number);
    } catch (e) {
      log.push(
        makeLogEntry({
          type: "error",
          team,
          message: `giveClue rejected the bot's own validated clue: ${e instanceof Error ? e.message : String(e)}`,
        }),
      );
      return { state, log, aborted: true };
    }
    log.push(makeLogEntry({ type: "clue", team, source: "bot", clue: clue.clue, number: clue.number }));

    const cap = guessAllowance(clue.number);

    let guesserResult;
    try {
      guesserResult = await getGuesserGuesses(toPublicBoard(state.board), clue, config);
    } catch (e) {
      log.push(
        makeLogEntry({
          type: "error",
          team,
          message: `guesser error: ${e instanceof Error ? e.message : String(e)}`,
        }),
      );
      return { state, log, aborted: true };
    }
    if (guesserResult.reasoning) {
      log.push(makeLogEntry({ type: "reasoning", team, role: "guesser", text: guesserResult.reasoning }));
    }

    // Mirrors lib/game/botTurn.ts's runBotGuessTurn exactly (minus UI pacing).
    const effectiveCap = guesserResult.stopGuessing && clue.number > 0 ? clue.number : cap;
    let guesses =
      effectiveCap === null ? guesserResult.rankedGuesses : guesserResult.rankedGuesses.slice(0, effectiveCap);
    if (guesses.length === 0) {
      const fallback = state.board.find((c) => !c.revealed);
      if (fallback) guesses = [fallback.word];
    }

    let turnEnded = false;
    for (const word of guesses) {
      const card = state.board.find((c) => c.word === word);
      if (!card || card.revealed) continue;

      const prevTeam = state.currentTurn;
      state = resolveGuess(state, word);
      const correct = card.type === team;
      log.push(makeLogEntry({ type: "guess", team, source: "bot", word, cardType: card.type, correct }));
      if (verbose) {
        console.log(`  [${team}] guessed "${word}" (${card.type}) — ${correct ? "correct" : "incorrect"}`);
      }

      if (state.currentTurn !== prevTeam || state.winner) {
        const reason: TurnEndReason = state.winner
          ? card.type === "assassin"
            ? "assassin"
            : "win"
          : "wrong-guess";
        log.push(makeLogEntry({ type: "turn-end", team, reason }));
        turnEnded = true;
        break;
      }
    }

    if (!turnEnded && !state.winner) {
      const reason: TurnEndReason = cap !== null && guesses.length >= cap ? "guesses-exhausted" : "stopped";
      log.push(makeLogEntry({ type: "turn-end", team, reason }));
      state = endTurn(state);
    }
  }

  return { state, log, aborted: false };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = withModelOverride(BASE_BOT_CONFIG, args.model);
  await mkdir(args.outDir, { recursive: true });

  console.log(
    `Running ${args.games} self-play game(s) — spymaster/guesser model: ${config.spymaster.model}${args.model ? " (override)" : ""}`,
  );

  const results: { winner: Team | null; clueCount: number; aborted: boolean; file: string }[] = [];

  for (let i = 1; i <= args.games; i++) {
    console.log(`\n=== Game ${i}/${args.games} ===`);
    const { state, log, aborted } = await playOneGame(config, args.verbose);

    const transcript = buildGameTranscript(state, log, args.model, { selfPlay: true });
    const filename = `selfplay-${new Date().toISOString().replace(/[:.]/g, "-")}-g${i}.txt`;
    const filePath = path.join(args.outDir, filename);
    await writeFile(filePath, transcript, "utf-8");

    const clueCount = state.cluesGiven.length;
    results.push({ winner: state.winner, clueCount, aborted, file: filePath });
    console.log(
      `  → ${aborted ? "ABORTED" : `${state.winner} won`} after ${clueCount} clues — saved ${filePath}`,
    );
  }

  const completed = results.filter((r) => !r.aborted);
  const redWins = completed.filter((r) => r.winner === "red").length;
  const blueWins = completed.filter((r) => r.winner === "blue").length;
  const abortedCount = results.length - completed.length;

  console.log(`\n=== Summary ===`);
  console.log(
    `${args.games} game(s) · red won ${redWins} · blue won ${blueWins}` +
      (abortedCount ? ` · ${abortedCount} aborted (see error entries in those transcripts)` : ""),
  );
  console.log(`Transcripts written to ${args.outDir}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
