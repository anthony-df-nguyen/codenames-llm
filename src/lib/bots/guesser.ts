// Guesser bot: sees only the public board + clue. Never receives the key card
// or team assignments — no exceptions, even for debugging.
// Must never share state/context with the spymaster bot module.

import type { Clue, PublicCard } from "@/lib/game/types";
import type { BotConfig } from "@/lib/config/botConfig";
import { claudeGenerate } from "@/lib/claude/client";
import { DIFFICULTY_CONFIG, type Difficulty } from "@/lib/config/difficulty";

export interface GuesserResult {
  rankedGuesses: string[];
  stopGuessing: boolean;
  /** Wall-clock time the bot spent generating this ranking, in milliseconds. */
  reasoningDurationMs?: number;
}

function buildUserPrompt(
  publicBoard: PublicCard[],
  clue: Clue
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
  clue: Clue,
  botConfig: BotConfig,
  difficulty: Difficulty = "hard"
): Promise<GuesserResult> {
  const config = botConfig.guesser;
  const system = config.systemPrompt;
  const prompt = buildUserPrompt(publicBoard, clue);

  const { data: raw, durationMs } = await claudeGenerate<GuesserResult>({
    model: config.model,
    system,
    prompt,
    format: RESPONSE_SCHEMA,
  });

  const validWords = new Set(
    publicBoard.filter((c) => !c.revealed).map((c) => c.word)
  );
  const rankedGuesses = (raw.rankedGuesses ?? []).filter((w) =>
    validWords.has(w)
  );

  // Handicap for weaker difficulties: sometimes put the runner-up first, so
  // the best match isn't always the first word tried.
  if (
    rankedGuesses.length > 1 &&
    Math.random() < DIFFICULTY_CONFIG[difficulty].guesserSwapChance
  ) {
    [rankedGuesses[0], rankedGuesses[1]] = [rankedGuesses[1], rankedGuesses[0]];
  }

  return {
    rankedGuesses,
    stopGuessing: Boolean(raw.stopGuessing),
    reasoningDurationMs: durationMs,
  };
}
