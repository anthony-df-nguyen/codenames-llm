// Spymaster bot: sees the key card, returns a clue + number.
// Must never share state/context with the guesser bot module.

import type { Card, Clue, ClueRecord, Team } from "@/lib/game/types";
import { otherTeam } from "@/lib/game/types";
import type { BotConfig } from "@/lib/config/botConfig";
import { claudeGenerate } from "@/lib/claude/client";
import { validateClue, type ClueValidationResult } from "@/lib/game/state";
import { DIFFICULTY_CONFIG, type Difficulty } from "@/lib/config/difficulty";

function buildUserPrompt(
  board: Card[],
  team: Team,
  cluesGiven: ClueRecord[],
  candidateCount: number,
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
    candidateCount > 1
      ? `Respond with ${candidateCount} candidate clues ranked best first. Each is a single-word clue that is not any board word (or a
substring/superset of one) with its own number of your team's words it connects
(1 to ${myWords.length}; 0 is legal but is a rare, high-risk exception meaning
unlimited guessing — see NUMBER rules). Run the full process for each one.`
      : `Respond with a single-word clue that is not any board word (or a
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

const CLUE_SCHEMA = {
  type: "object",
  properties: {
    clue: { type: "string" },
    number: { type: "integer" },
  },
  required: ["clue", "number"],
};

// Single-clue shape for full strength (unchanged from before difficulty
// existed); a ranked list when the difficulty picks among candidates.
const SINGLE_SCHEMA = CLUE_SCHEMA;
const CANDIDATES_SCHEMA = {
  type: "object",
  properties: {
    candidates: { type: "array", items: CLUE_SCHEMA },
  },
  required: ["candidates"],
};

const MAX_ATTEMPTS = 4;

export async function getSpymasterClue(
  board: Card[],
  botConfig: BotConfig,
  team: Team,
  cluesGiven: ClueRecord[] = [],
  difficulty: Difficulty = "hard"
): Promise<Clue> {
  const config = botConfig.spymaster;
  const system = config.systemPrompt;
  const { maxClueNumber, cluePool } = DIFFICULTY_CONFIG[difficulty];

  let rejectionReason: string | undefined;
  let lastResult: ClueValidationResult | undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const prompt = buildUserPrompt(board, team, cluesGiven, cluePool, rejectionReason);

    const { data: raw, durationMs } = await claudeGenerate<
      Clue & { candidates?: Clue[] }
    >({
      model: config.model,
      system,
      prompt,
      format: cluePool > 1 ? CANDIDATES_SCHEMA : SINGLE_SCHEMA,
    });

    const proposed: Clue[] = cluePool > 1 ? (raw.candidates ?? []) : [raw];

    // Cap the number first, then run the usual code-side validation. Only the
    // first `cluePool` valid candidates are eligible, so a weaker setting
    // still can't pick something illegal.
    const valid: Clue[] = [];
    for (const candidate of proposed) {
      const clue = String(candidate.clue ?? "").trim();
      let number = Number(candidate.number);
      if (maxClueNumber !== null && number > maxClueNumber) number = maxClueNumber;

      lastResult = validateClue(clue, number, board, cluesGiven, team);
      if (lastResult.valid) valid.push({ clue, number });
    }

    if (valid.length > 0) {
      const pick = valid.slice(0, cluePool)[
        Math.floor(Math.random() * Math.min(cluePool, valid.length))
      ];
      return { ...pick, reasoningDurationMs: durationMs };
    }

    rejectionReason = lastResult?.valid === false ? lastResult.reason : "No candidates returned.";
  }

  throw new Error(
    `Spymaster bot failed to produce a valid clue after ${MAX_ATTEMPTS} attempts: ${lastResult?.valid === false ? lastResult.reason : "unknown reason"}`
  );
}
