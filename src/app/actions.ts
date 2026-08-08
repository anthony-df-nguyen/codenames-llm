"use server";

// Server actions: the client drives the game loop, but bot calls must happen
// server-side so the guesser bot's request payload structurally can't carry
// key-card info (only `PublicCard[]` crosses this boundary) and so Ollama
// config stays server-side.

import { getSpymasterClue } from "@/lib/bots/spymaster";
import { getGuesserGuesses, type GuesserResult } from "@/lib/bots/guesser";
import { DIFFICULTY_CONFIGS, type Difficulty } from "@/lib/config/difficulty";
import type { Card, Clue, ClueRecord, PublicCard, Team } from "@/lib/game/types";

export async function requestSpymasterClue(
  board: Card[],
  difficulty: Difficulty,
  team: Team,
  cluesGiven: ClueRecord[]
): Promise<Clue> {
  return getSpymasterClue(board, DIFFICULTY_CONFIGS[difficulty], team, cluesGiven);
}

export async function requestGuesserGuesses(
  publicBoard: PublicCard[],
  clue: Clue,
  difficulty: Difficulty
): Promise<GuesserResult> {
  return getGuesserGuesses(publicBoard, clue, DIFFICULTY_CONFIGS[difficulty]);
}
