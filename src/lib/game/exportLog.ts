// Assembles a game's log into a plain-text transcript suitable for pasting
// into Claude for prompt/model tuning: the exact system prompts both bots
// played with, plus the full chronological move-by-move record including
// reasoning. Kept separate from log.ts (UI-facing entry shapes) since this
// is a one-shot text formatter, not app state.

import { BASE_BOT_CONFIG, withModelOverride } from "@/lib/config/botConfig";
import type { LogEntry } from "./log";
import { TURN_END_LABEL } from "./log";
import type { GameState } from "./types";

function formatEntry(entry: LogEntry): string {
  const ts = `[${new Date(entry.timestamp).toISOString()}] `;
  switch (entry.type) {
    case "clue":
      return `${ts}[${entry.team} spymaster, ${entry.source}] clue: "${entry.clue}" for ${entry.number}`;
    case "reasoning": {
      const duration =
        entry.durationMs !== undefined
          ? ` (${(entry.durationMs / 1000).toFixed(1)}s)`
          : "";
      return `${ts}[${entry.team} ${entry.role} reasoning]${duration}\n${entry.text}`;
    }
    case "guess":
      return `${ts}[${entry.team}, ${entry.source}] guessed "${entry.word}" (${entry.cardType}) — ${entry.correct ? "correct" : "incorrect"}`;
    case "turn-end":
      return `${ts}-- ${entry.team} turn ended: ${TURN_END_LABEL[entry.reason]} --`;
    case "error":
      return `${ts}[${entry.team} ERROR] ${entry.message}`;
  }
}

export interface TranscriptOptions {
  /**
   * Set when both seats on both teams are bot-controlled (headless
   * self-play — see scripts/simulate.ts) so the header doesn't print a
   * meaningless humanTeam/humanRole pairing left over from GameState's
   * required fields.
   */
  selfPlay?: boolean;
}

export function buildGameTranscript(
  state: GameState,
  log: LogEntry[],
  modelOverride: string | null,
  opts: TranscriptOptions = {},
): string {
  const config = withModelOverride(BASE_BOT_CONFIG, modelOverride);

  const lines: string[] = [];
  lines.push("# Codenames bot transcript");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(
    opts.selfPlay
      ? `Human role: none — fully self-play (bot vs bot, both seats)`
      : `Human role: ${state.humanTeam} team's ${state.humanRole}`,
  );
  lines.push(`Spymaster model: ${config.spymaster.model}`);
  lines.push(`Guesser model: ${config.guesser.model}`);
  lines.push(
    `Result: ${state.winner ? `${state.winner} team won` : "in progress"}`,
  );
  lines.push("");

  lines.push("## Spymaster system prompt");
  lines.push(config.spymaster.systemPrompt);
  lines.push("");

  lines.push("## Guesser system prompt");
  lines.push(config.guesser.systemPrompt);
  lines.push("");

  lines.push("## Move log");
  for (const entry of log) {
    lines.push(formatEntry(entry));
    lines.push("");
  }

  return lines.join("\n");
}
