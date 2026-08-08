// Difficulty maps to a config object (model, temperature, system-prompt variant,
// optional reasoning budget) per bot role — kept swappable so each level can be
// tuned independently during playtesting.

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export interface BotRoleConfig {
  model: string;
  temperature: number;
  systemPromptVariant: string;
  reasoningBudget?: number;
}

export interface DifficultyConfig {
  spymaster: BotRoleConfig;
  guesser: BotRoleConfig;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    spymaster: { model: "llama3.1:8b", temperature: 0.3, systemPromptVariant: "easy" },
    guesser: { model: "llama3.1:8b", temperature: 0.3, systemPromptVariant: "easy" },
  },
  medium: {
    spymaster: { model: "llama3.1:8b", temperature: 0.6, systemPromptVariant: "medium" },
    guesser: { model: "llama3.1:8b", temperature: 0.6, systemPromptVariant: "medium" },
  },
  hard: {
    spymaster: { model: "llama3.1:8b", temperature: 0.8, systemPromptVariant: "hard" },
    guesser: { model: "llama3.1:8b", temperature: 0.7, systemPromptVariant: "hard" },
  },
  expert: {
    spymaster: {
      model: "llama3.1:8b",
      temperature: 0.9,
      systemPromptVariant: "expert",
      reasoningBudget: 512,
    },
    guesser: { model: "llama3.1:8b", temperature: 0.8, systemPromptVariant: "expert" },
  },
};
