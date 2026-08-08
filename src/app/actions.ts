"use server";

// Server actions: the client drives the game loop, but bot calls must happen
// server-side so the guesser bot's request payload structurally can't carry
// key-card info (only `PublicCard[]` crosses this boundary) and so Ollama
// config stays server-side.

import { getSpymasterClue } from "@/lib/bots/spymaster";
import { getGuesserGuesses, type GuesserResult } from "@/lib/bots/guesser";
import { BASE_BOT_CONFIG, withModelOverride } from "@/lib/config/botConfig";
import { listOllamaModels } from "@/lib/ollama/client";
import type { Card, Clue, ClueRecord, PublicCard, Team } from "@/lib/game/types";

export async function requestSpymasterClue(
  board: Card[],
  team: Team,
  cluesGiven: ClueRecord[],
  modelOverride: string | null = null
): Promise<Clue> {
  const config = withModelOverride(BASE_BOT_CONFIG, modelOverride);
  console.log(
    `[ollama] spymaster clue request → model=${config.spymaster.model} team=${team}`
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
    `[ollama] guesser request → model=${config.guesser.model} clue="${clue.clue}" number=${clue.number}`
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
