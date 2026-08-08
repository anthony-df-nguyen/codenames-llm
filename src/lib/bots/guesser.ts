// Guesser bot: sees only the public board + clue. Never receives the key card
// or team assignments — no exceptions, even for debugging.
// Must never share state/context with the spymaster bot module.

import type { DifficultyConfig } from "@/lib/config/difficulty";
import { ollamaGenerate } from "@/lib/ollama/client";

export interface PublicCard {
  word: string;
  revealed: boolean;
}

export interface GuesserResult {
  rankedGuesses: string[];
  stopGuessing: boolean;
}

const SYSTEM_PROMPT_VARIANTS: Record<string, string> = {
  easy: `You are playing Codenames as Guesser. You see only the public board
(unrevealed words) and your Spymaster's clue — never any hidden team
information. Pick only the most obvious, literal word matches for the clue.
Stop guessing as soon as a match isn't clearly obvious; don't reason deeply
about risk.`,
  medium: `You are playing Codenames as Guesser. You see only the public
board (unrevealed words) and your Spymaster's clue — never any hidden team
information. Rank board words by how well they fit the clue, using
reasonable inference for less literal associations. Stop guessing once
your confidence in further matches drops off.`,
  hard: `You are playing Codenames as Guesser. You see only the public board
(unrevealed words) and your Spymaster's clue — never any hidden team
information. Reason across the whole board for words that fit the clue,
including non-obvious associations. Weigh the risk of guessing wrong
against the clue's stated number, and stop guessing when that risk
outweighs the expected gain.`,
  expert: `You are playing Codenames as Guesser, playing to win. You see
only the public board (unrevealed words) and your Spymaster's clue — never
any hidden team information. Reason step by step about every unrevealed
word's fit to the clue and rank them by probability. Guess only while
expected value stays positive given the clue's number, minimizing wasted
guesses.`,
};

function buildSystemPrompt(variant: string): string {
  return SYSTEM_PROMPT_VARIANTS[variant] ?? SYSTEM_PROMPT_VARIANTS.medium;
}

function buildUserPrompt(
  publicBoard: PublicCard[],
  clue: { clue: string; number: number }
): string {
  const unrevealed = publicBoard.filter((c) => !c.revealed).map((c) => c.word);

  return [
    `Unrevealed board words: ${unrevealed.join(", ")}`,
    `Clue: "${clue.clue}" for ${clue.number}`,
    ``,
    `Respond with a ranked list of board words (most likely match first,
choosing only from the unrevealed board words above) and whether to stop
guessing after them.`,
  ].join("\n");
}

interface RawGuesserResponse {
  rankedGuesses: string[];
  stopGuessing: boolean;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    rankedGuesses: { type: "array", items: { type: "string" } },
    stopGuessing: { type: "boolean" },
  },
  required: ["rankedGuesses", "stopGuessing"],
};

export async function getGuesserGuesses(
  publicBoard: PublicCard[],
  clue: { clue: string; number: number },
  difficulty: DifficultyConfig
): Promise<GuesserResult> {
  const config = difficulty.guesser;
  const system = buildSystemPrompt(config.systemPromptVariant);
  const prompt = buildUserPrompt(publicBoard, clue);

  const raw = await ollamaGenerate<RawGuesserResponse>({
    model: config.model,
    system,
    prompt,
    temperature: config.temperature,
    format: RESPONSE_SCHEMA,
  });

  const validWords = new Set(
    publicBoard.filter((c) => !c.revealed).map((c) => c.word)
  );
  const rankedGuesses = (raw.rankedGuesses ?? []).filter((w) =>
    validWords.has(w)
  );

  return {
    rankedGuesses,
    stopGuessing: Boolean(raw.stopGuessing),
  };
}
