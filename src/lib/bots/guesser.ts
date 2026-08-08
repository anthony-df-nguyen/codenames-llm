// Guesser bot: sees only the public board + clue. Never receives the key card
// or team assignments — no exceptions, even for debugging.
// Must never share state/context with the spymaster bot module.

import type { Clue, PublicCard } from "@/lib/game/types";
import type { BotConfig } from "@/lib/config/botConfig";
import { ollamaGenerate } from "@/lib/ollama/client";

export interface GuesserResult {
  rankedGuesses: string[];
  stopGuessing: boolean;
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
  botConfig: BotConfig
): Promise<GuesserResult> {
  const config = botConfig.guesser;
  const system = config.systemPrompt;
  const prompt = buildUserPrompt(publicBoard, clue);

  const raw = await ollamaGenerate<GuesserResult>({
    model: config.model,
    system,
    prompt,
    temperature: config.temperature,
    think: config.think,
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
