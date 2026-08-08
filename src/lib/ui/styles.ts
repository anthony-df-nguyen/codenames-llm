// Shared Tailwind class tokens for the UI layer.
//
// Every place that colors something by team or by card type reads from here,
// so a palette change is a one-file edit instead of a hunt through six
// components. Purely presentational — no game rules live in this file.

import type { CardType, Team } from "@/lib/game/types";

export interface TeamStyle {
  /** Body-copy team name (game log, headers). */
  text: string;
  /** Louder team name for headline treatments (clue banner). */
  textStrong: string;
  /** Solid fill, e.g. the bot "thinking" dots. */
  dot: string;
  /** Border + tinted background pair for team-owned panels. */
  panel: string;
}

export const TEAM_STYLES: Record<Team, TeamStyle> = {
  red: {
    text: "text-red-500",
    textStrong: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    panel: "border-red-500 bg-red-50 dark:bg-red-950/30",
  },
  blue: {
    text: "text-blue-500",
    textStrong: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    panel: "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
  },
};

export interface CardTypeStyle {
  /** Full revealed-card face on the board. */
  face: string;
  /** Key-card square / game-log bullet. */
  swatch: string;
}

export const CARD_TYPE_STYLES: Record<CardType, CardTypeStyle> = {
  red: {
    face: "bg-red-500 text-white border-red-600",
    swatch: "bg-red-500 border-red-600",
  },
  blue: {
    face: "bg-blue-500 text-white border-blue-600",
    swatch: "bg-blue-500 border-blue-600",
  },
  neutral: {
    face: "bg-zinc-300 text-zinc-900 border-zinc-400 dark:bg-zinc-500 dark:text-zinc-50 dark:border-zinc-400",
    swatch: "bg-zinc-300 border-zinc-400 dark:bg-zinc-500 dark:border-zinc-400",
  },
  assassin: {
    face: "bg-zinc-900 text-white border-black dark:bg-black dark:border-zinc-700",
    swatch: "bg-zinc-900 border-black dark:bg-black dark:border-zinc-700",
  },
};

/** Face-down board card. */
export const HIDDEN_CARD_STYLE =
  "bg-zinc-100 text-zinc-900 border-zinc-300 hover:border-zinc-400 dark:bg-zinc-800 dark:text-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600";

/** Neutral bordered surface: log panel, key card. */
export const SURFACE = "rounded-md border border-zinc-300 dark:border-zinc-700";

export const MUTED_TEXT = "text-zinc-500 dark:text-zinc-400";

/** Interactive border that brightens on hover — shared by outline controls. */
export const OUTLINE_BORDER =
  "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600";

export const INPUT_STYLE =
  "rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-foreground dark:border-zinc-700";

/**
 * Selected/unselected state for the pre-game option buttons. Shared so the
 * role and difficulty pickers can't drift apart visually.
 */
export function selectableStyle(selected: boolean): string {
  return selected
    ? "border-foreground bg-foreground/5"
    : OUTLINE_BORDER;
}
