// Shared color tokens for the UI layer.
//
// Every place that colors something by team or by card type reads from here,
// so a palette change is a one-file edit instead of a hunt through six
// components. Purely presentational — no game rules live in this file.
//
// Team/card colors are OKLCH values applied via inline style rather than
// Tailwind classes: they're computed per-team/per-type at render time, so a
// static utility class can't represent them.

import type { CardType, Team } from "@/lib/game/types";

export interface TeamPalette {
  /** Revealed-card fill / key-card swatch fill. */
  fill: string;
  /** Revealed-card border / key-card swatch border. */
  edge: string;
  /** Text color on a filled team surface. */
  fg: string;
  /** Headline treatment — clue banner, "Turn: X", team name in log. */
  textStrong: string;
  /** Solid dot — remaining-count indicator, bot "thinking" dots. */
  dot: string;
}

export const TEAM_STYLES: Record<Team, TeamPalette> = {
  red: {
    fill: "oklch(0.42 0.12 22)",
    edge: "oklch(0.56 0.13 22)",
    fg: "oklch(0.94 0.03 22)",
    textStrong: "oklch(0.76 0.14 22)",
    dot: "oklch(0.68 0.16 22)",
  },
  blue: {
    fill: "oklch(0.42 0.10 245)",
    edge: "oklch(0.56 0.11 245)",
    fg: "oklch(0.95 0.02 245)",
    textStrong: "oklch(0.76 0.11 245)",
    dot: "oklch(0.70 0.12 245)",
  },
};

export interface CardPalette {
  fill: string;
  edge: string;
  fg: string;
}

export const CARD_TYPE_STYLES: Record<CardType, CardPalette> = {
  red: TEAM_STYLES.red,
  blue: TEAM_STYLES.blue,
  neutral: { fill: "#3f424d", edge: "#595d6c", fg: "#cfd3e5" },
  assassin: { fill: "#0b0c12", edge: "#595d6c", fg: "#9397ab" },
};

/** Correct/incorrect guess result colors in the game log. */
export const RESULT_COLORS = {
  correct: "oklch(0.75 0.13 155)",
  incorrect: "oklch(0.7 0.15 25)",
};

export const MUTED_TEXT = "text-foreground/55";

/** Selected/unselected state for the pre-game option buttons. */
export function selectableStyle(selected: boolean): string {
  return selected
    ? "border-accent bg-accent/10"
    : "border-divider hover:border-foreground/40";
}
