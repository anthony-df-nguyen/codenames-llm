"use server";

// Server actions: the client drives the game loop, but bot calls must happen
// server-side so the guesser bot's request payload structurally can't carry
// key-card info (only `PublicCard[]` crosses this boundary) and so Ollama
// config stays server-side.

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getSpymasterClue } from "@/lib/bots/spymaster";
import { getGuesserGuesses, type GuesserResult } from "@/lib/bots/guesser";
import { BASE_BOT_CONFIG, withModelOverride } from "@/lib/config/botConfig";
import { listOllamaModels } from "@/lib/ollama/client";
import type { Card, Clue, ClueRecord, HumanRole, PublicCard, Team } from "@/lib/game/types";
import { EMPTY_STATS, recordResult, type GameStats } from "@/lib/game/stats";

export async function requestSpymasterClue(
  board: Card[],
  team: Team,
  cluesGiven: ClueRecord[],
  modelOverride: string | null = null
): Promise<Clue> {
  const config = withModelOverride(BASE_BOT_CONFIG, modelOverride);
  console.log(
    `[ollama] Spymaster Clue Request → model=${config.spymaster.model} effort=${config.spymaster.think}  team=${team}`
  );
  return getSpymasterClue(board, config, team, cluesGiven);
}

export async function requestGuesserGuesses(
  publicBoard: PublicCard[],
  clue: Clue,
  modelOverride: string | null = null
): Promise<GuesserResult> {
  const config = withModelOverride(BASE_BOT_CONFIG, modelOverride);
  console.log(
    `[ollama] Guesser request → model=${config.guesser.model} effort=${config.spymaster.think} clue="${clue.clue}" number=${clue.number}`
  );
  return getGuesserGuesses(publicBoard, clue, config);
}

/** Models currently pulled in the local Ollama install, for the setup picker. */
export async function getAvailableModels(): Promise<string[]> {
  try {
    return await listOllamaModels();
  } catch {
    return [];
  }
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
