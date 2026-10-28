"use server";

// Server actions: the client drives the game loop, but bot calls must happen
// server-side so the guesser bot's request payload structurally can't carry
// key-card info (only `PublicCard[]` crosses this boundary) and so the
// Claude CLI invocation stays server-side.

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getSpymasterClue } from "@/lib/bots/spymaster";
import { getGuesserGuesses, type GuesserResult } from "@/lib/bots/guesser";
import type { Difficulty } from "@/lib/config/difficulty";
import { BASE_BOT_CONFIG, withModelOverride } from "@/lib/config/botConfig";
import type { Card, Clue, ClueRecord, HumanRole, PublicCard, Team } from "@/lib/game/types";
import { EMPTY_STATS, recordResult, type GameStats } from "@/lib/game/stats";

export async function requestSpymasterClue(
  board: Card[],
  team: Team,
  cluesGiven: ClueRecord[],
  modelOverride: string | null = null,
  difficulty: Difficulty = "hard"
): Promise<Clue> {
  const config = withModelOverride(BASE_BOT_CONFIG, modelOverride);
  console.log(
    `[bot] Spymaster Clue Request → model=${config.spymaster.model}  team=${team} difficulty=${difficulty}`
  );
  return getSpymasterClue(board, config, team, cluesGiven, difficulty);
}

export async function requestGuesserGuesses(
  publicBoard: PublicCard[],
  clue: Clue,
  modelOverride: string | null = null,
  difficulty: Difficulty = "hard"
): Promise<GuesserResult> {
  const config = withModelOverride(BASE_BOT_CONFIG, modelOverride);
  console.log(
    `[bot] Guesser request → model=${config.guesser.model} clue="${clue.clue}" number=${clue.number} difficulty=${difficulty}`
  );
  return getGuesserGuesses(publicBoard, clue, config, difficulty);
}

/**
 * Writes a completed game's transcript to the untracked `logs/` directory.
 * Runs server-side because the transcript export is a fs write, not
 * something the client can do directly.
 */
export async function saveGameTranscript(
  transcript: string,
): Promise<{ filename: string }> {
  const dir = path.join(process.cwd(), "logs");
  await mkdir(dir, { recursive: true });
  const filename = `game-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
  await writeFile(path.join(dir, filename), transcript, "utf-8");
  return { filename };
}

// Win/loss record lives in the untracked `data/` directory rather than
// localStorage, so it's a real file the player can also inspect/back up —
// same treatment as the transcript logs.
const STATS_FILE = path.join(process.cwd(), "data", "stats.json");

export async function getStats(): Promise<GameStats> {
  try {
    const raw = await readFile(STATS_FILE, "utf-8");
    return JSON.parse(raw) as GameStats;
  } catch {
    return EMPTY_STATS;
  }
}

export async function recordGameResult(
  role: HumanRole,
  won: boolean
): Promise<GameStats> {
  const next = recordResult(await getStats(), role, won);
  await mkdir(path.dirname(STATS_FILE), { recursive: true });
  await writeFile(STATS_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export async function resetStats(): Promise<GameStats> {
  await mkdir(path.dirname(STATS_FILE), { recursive: true });
  await writeFile(STATS_FILE, JSON.stringify(EMPTY_STATS, null, 2), "utf-8");
  return EMPTY_STATS;
}
