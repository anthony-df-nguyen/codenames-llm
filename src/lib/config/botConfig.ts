import { DEFAULT_MODEL, parseModel, type ClaudeModel } from "@/lib/claude/models";
import { SPYMASTER_PROMPT, GUESSER_PROMPT } from "./system_prompts";

// Base bot behavior — model and system prompt, one fixed config per role. The
// Claude CLI exposes no temperature/sampling knobs, so those aren't modeled.

export interface BotRoleConfig {
  model: ClaudeModel;
  systemPrompt: string;
}

export interface BotConfig {
  spymaster: BotRoleConfig;
  guesser: BotRoleConfig;
}

export const BASE_BOT_CONFIG: BotConfig = {
  spymaster: { model: DEFAULT_MODEL, systemPrompt: SPYMASTER_PROMPT },
  guesser: { model: DEFAULT_MODEL, systemPrompt: GUESSER_PROMPT },
};

// A user-chosen model swaps out `model` on both roles but leaves the prompt
// untouched. Unrecognized values (e.g. an old saved session) keep the default.
export function withModelOverride(
  config: BotConfig,
  model: string | null,
): BotConfig {
  const parsed = parseModel(model);
  if (!parsed) return config;
  return {
    spymaster: { ...config.spymaster, model: parsed },
    guesser: { ...config.guesser, model: parsed },
  };
}
