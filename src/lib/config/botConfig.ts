// Base bot behavior — model, temperature, system prompt, and a reasoning
// "think" effort hint — one fixed config per role for now. Difficulty levels
// (tuning these per-level) are a later layer; this is what makes the game
// playable end to end today.

export interface BotRoleConfig {
  model: string;
  temperature: number;
  systemPrompt: string;
  // Passed to Ollama's `think` field for models that support extended
  // reasoning (gpt-oss, qwen3, deepseek-r1, ...). Ollama's default for those
  // models is effectively "high", which can take many seconds of silent
  // deliberation per turn — "low" keeps the game watchable. Ignored for
  // models that don't support thinking; see ollama/client.ts.
  think?: "low" | "medium" | "high";
}

export interface BotConfig {
  spymaster: BotRoleConfig;
  guesser: BotRoleConfig;
}

export const BASE_BOT_CONFIG: BotConfig = {
  spymaster: {
    model: "llama3.1:8b",
    temperature: 0.6,
    think: "low",
    systemPrompt: `You are playing Codenames as Spymaster. Give clues connecting a
moderate number of your team's words (usually 2-3), using reasonable
associative leaps. Never let your clue relate to the assassin word or the
other team's words.`,
  },
  guesser: {
    model: "llama3.1:8b",
    temperature: 0.6,
    think: "low",
    systemPrompt: `You are playing Codenames as Guesser. You see only the public
board (unrevealed words) and your Spymaster's clue — never any hidden team
information. Rank board words by how well they fit the clue, using
reasonable inference for less literal associations. Stop guessing once your
confidence in further matches drops off.`,
  },
};

// A user-chosen model swaps out `model` on both roles but leaves temperature
// and the prompt untouched.
export function withModelOverride(
  config: BotConfig,
  model: string | null
): BotConfig {
  if (!model) return config;
  return {
    spymaster: { ...config.spymaster, model },
    guesser: { ...config.guesser, model },
  };
}
