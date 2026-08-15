// Spymaster bot: sees the key card, returns a clue + number.
// Must never share state/context with the guesser bot module.

import type { Card, Clue, ClueRecord, Team } from "@/lib/game/types";
import { otherTeam } from "@/lib/game/types";
import type { BotConfig } from "@/lib/config/botConfig";
import { ollamaGenerate } from "@/lib/ollama/client";
import { validateClue, type ClueValidationResult } from "@/lib/game/state";

function buildUserPrompt(
  board: Card[],
  team: Team,
  cluesGiven: ClueRecord[],
  rejectionReason?: string
): string {
  const unrevealed = board.filter((c) => !c.revealed);
  const myWords = unrevealed.filter((c) => c.type === team).map((c) => c.word);
  const opponentTeam = otherTeam(team);
  const opponentWords = unrevealed
    .filter((c) => c.type === opponentTeam)
    .map((c) => c.word);
  const neutralWords = unrevealed
    .filter((c) => c.type === "neutral")
    .map((c) => c.word);
  const assassinWord = unrevealed.find((c) => c.type === "assassin")?.word;

  const usedClues = cluesGiven.map((c) => c.clue);

  const lines = [
    `Your team's remaining words: ${myWords.join(", ")}`,
    `Opponent's remaining words: ${opponentWords.join(", ")}`,
    `Neutral words: ${neutralWords.join(", ")}`,
    `Assassin word: ${assassinWord}`,
    usedClues.length
      ? `Clues already used this game (do not repeat): ${usedClues.join(", ")}`
      : `No clues have been given yet this game.`,
    ``,
    `Respond with a single-word clue that is not any board word (or a
substring/superset of one) and a number of your team's words it connects
(1 to ${myWords.length}; 0 is legal but is a rare, high-risk exception meaning
unlimited guessing — see NUMBER rules).`,
  ];

  if (rejectionReason) {
    lines.unshift(
      `Your previous clue was rejected for this reason: "${rejectionReason}". Give a different, valid clue.`
    );
  }

  return lines.join("\n");
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    clue: { type: "string" },
    number: { type: "integer" },
  },
  required: ["clue", "number"],
};

const MAX_ATTEMPTS = 4;

export async function getSpymasterClue(
  board: Card[],
  botConfig: BotConfig,
  team: Team,
  cluesGiven: ClueRecord[] = []
): Promise<Clue> {
  const config = botConfig.spymaster;
  const system = config.systemPrompt;

  let rejectionReason: string | undefined;
  let lastResult: ClueValidationResult | undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const prompt = buildUserPrompt(board, team, cluesGiven, rejectionReason);

    const { data: raw, thinking } = await ollamaGenerate<Clue>({
      model: config.model,
      system,
      prompt,
      temperature: config.temperature,
      think: config.think,
      topK: config.topK,
      topP: config.topP,
      repeatPenalty: config.repeatPenalty,
      format: RESPONSE_SCHEMA,
    });

    const clue = String(raw.clue ?? "").trim();
    const number = Number(raw.number);

    lastResult = validateClue(clue, number, board, cluesGiven, team);

    if (lastResult.valid) {
      return { clue, number, reasoning: thinking };
    }

    rejectionReason = lastResult.reason;
  }

  throw new Error(
    `Spymaster bot failed to produce a valid clue after ${MAX_ATTEMPTS} attempts: ${lastResult?.reason ?? "unknown reason"}`
  );
}
