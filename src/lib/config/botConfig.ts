import { SPYMASTER_PROMPT, GUESSER_PROMPT } from "./system_prompts";


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
  // Optional extra sampling knobs, forwarded as-is to Ollama's generic
  // `options` object (unlike `think`, these aren't gated by a capability
  // probe — llama.cpp accepts them for any model and just uses its own
  // defaults for whichever ones are left unset). Leave unset when a model
  // doesn't publish tuned recommendations rather than guessing values.
  topK?: number;
  topP?: number;
  repeatPenalty?: number;
}

export interface BotConfig {
  spymaster: BotRoleConfig;
  guesser: BotRoleConfig;
}

export const BASE_BOT_CONFIG: BotConfig = {
  spymaster: {
    model: "gpt-oss:20b",
    // gpt-oss was trained/released with temperature 1.0, top_p 1.0 as its
    // reference sampling config (OpenAI's model card) — clamping top_k or
    // pulling temperature down fights the harmony reasoning format rather
    // than helping it. "Low" think buys the associative-leap quality
    // this role needs (see CLAUDE.md); still fast at 20b.
    temperature: 1.0,
    think: "low",
    topP: 1.0,
    systemPrompt: SPYMASTER_PROMPT,
  },
  guesser: {
    model: "gpt-oss:20b",
    // Guessing is a literal matching/ranking task, not a creative one — a
    // lower temperature keeps rankings consistent without gpt-oss's default
    // sampling encouraging speculative picks. "low" think is enough since
    // there's no associative leap to make here, just scoring given words
    // against the clue.
    temperature: 0.3,
    think: "low",
    topP: 1.0,
    systemPrompt: GUESSER_PROMPT,
  },
};

// A user-chosen model swaps out `model` on both roles but leaves temperature
// and the prompt untouched.
export function withModelOverride(
  config: BotConfig,
  model: string | null,
): BotConfig {
  if (!model) return config;
  return {
    spymaster: { ...config.spymaster, model },
    guesser: { ...config.guesser, model },
  };
}
