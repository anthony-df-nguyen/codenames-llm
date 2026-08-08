// Spymaster bot: sees the key card, returns a clue + number.
// Must never share state/context with the guesser bot module.

import type { Card, Clue, ClueRecord, Team } from "@/lib/game/types";
import { otherTeam } from "@/lib/game/types";
import type { DifficultyConfig } from "@/lib/config/difficulty";
import { ollamaGenerate } from "@/lib/ollama/client";
import { validateClue, type ClueValidationResult } from "@/lib/game/state";
import { selectSystemPrompt, type PromptVariants } from "./prompts";

const SYSTEM_PROMPT_VARIANTS: PromptVariants = {
  easy: `You are playing Codenames as Spymaster. Give conservative, literal
one-word clues connecting as few words as possible (usually 1-2). Avoid
ambiguous or risky associations, and never let your clue relate to the
assassin word or the other team's words.`,
  medium: `You are playing Codenames as Spymaster. Give clues connecting a
moderate number of your team's words (usually 2-3), using reasonable
associative leaps. Never let your clue relate to the assassin word or the
other team's words.`,
  hard: `You are playing Codenames as Spymaster. Give efficient clues
connecting several of your team's words (3-4+) using clever or abstract
associations when they pay off. Carefully avoid any association with the
assassin word or the other team's words, especially near-misses.`,
  expert: `You are playing Codenames as Spymaster, playing to win. Find the
highest-value clue available, taking calculated risks when the payoff
justifies it. Reason step by step about every unrevealed word on the board,
then commit to the clue that maximizes expected words guessed correctly
this turn while keeping the risk of hitting the assassin or the other
team's words as low as possible.`,
};

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
(at most ${myWords.length}; 0 means your team may guess without limit).`,
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
  difficulty: DifficultyConfig,
  team: Team,
  cluesGiven: ClueRecord[] = []
): Promise<Clue> {
  const config = difficulty.spymaster;
  const system = selectSystemPrompt(
    SYSTEM_PROMPT_VARIANTS,
    config.systemPromptVariant
  );

  let rejectionReason: string | undefined;
  let lastResult: ClueValidationResult | undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const prompt = buildUserPrompt(board, team, cluesGiven, rejectionReason);

    const raw = await ollamaGenerate<Clue>({
      model: config.model,
      system,
      prompt,
      temperature: config.temperature,
      format: RESPONSE_SCHEMA,
    });

    const clue = String(raw.clue ?? "").trim();
    const number = Number(raw.number);

    lastResult = validateClue(clue, number, board, cluesGiven, team);

    if (lastResult.valid) {
      return { clue, number };
    }

    rejectionReason = lastResult.reason;
  }

  throw new Error(
    `Spymaster bot failed to produce a valid clue after ${MAX_ATTEMPTS} attempts: ${lastResult?.reason ?? "unknown reason"}`
  );
}
