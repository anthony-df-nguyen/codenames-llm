// Model-id helpers shared by server and client code. Kept free of Node imports
// so client components (e.g. the setup screen) can use them.

/** CLI model aliases offered in the setup picker (always the latest of each). */
export const CLAUDE_MODELS = ["haiku", "sonnet", "opus"] as const;

export type ClaudeModel = (typeof CLAUDE_MODELS)[number];

export const DEFAULT_MODEL: ClaudeModel = "sonnet";

/** Narrows a stored/unknown value to a current model alias, else null. */
export function parseModel(value: string | null | undefined): ClaudeModel | null {
  return CLAUDE_MODELS.find((m) => m === value) ?? null;
}
