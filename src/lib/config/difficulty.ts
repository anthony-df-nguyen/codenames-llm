// Opponent difficulty. Applies only to the team the human is NOT on — the
// human's own teammate bot always plays at "hard" (full strength). Handicaps
// are applied in code around the model's output rather than by prompting
// Claude to play badly, which it does inconsistently.

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export const DEFAULT_DIFFICULTY: Difficulty = "medium";

export interface DifficultyConfig {
  label: string;
  description: string;
  /** Highest clue number the spymaster may give; null = no cap. */
  maxClueNumber: number | null;
  /**
   * The spymaster proposes this many ranked candidate clues and code picks
   * one at random from the first `cluePool` valid ones. 1 = always the best.
   */
  cluePool: number;
  /** Chance the guesser's top two picks get swapped (0 = never). */
  guesserSwapChance: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: "Easy",
    description: "Clues are small and often not the best; guesser slips up.",
    maxClueNumber: 2,
    cluePool: 3,
    guesserSwapChance: 0.35,
  },
  medium: {
    label: "Medium",
    description: "Modest clues and the occasional wrong guess.",
    maxClueNumber: 3,
    cluePool: 2,
    guesserSwapChance: 0.15,
  },
  hard: {
    label: "Hard",
    description: "Full-strength spymaster and guesser.",
    maxClueNumber: null,
    cluePool: 1,
    guesserSwapChance: 0,
  },
};

/** Narrows a stored/unknown value to a Difficulty, else null. */
export function parseDifficulty(value: unknown): Difficulty | null {
  return DIFFICULTIES.find((d) => d === value) ?? null;
}
