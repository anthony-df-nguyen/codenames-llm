// Shared prompt plumbing for the bot roles. Deliberately holds no prompt
// *content* — each role's variants stay in its own module so spymaster and
// guesser context can never leak into one another.

export type PromptVariants = Record<string, string>;

/** Resolves a difficulty's `systemPromptVariant`, falling back to medium. */
export function selectSystemPrompt(
  variants: PromptVariants,
  variant: string,
): string {
  return variants[variant] ?? variants.medium;
}
