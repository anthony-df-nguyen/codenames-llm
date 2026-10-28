"use client";

import { useState } from "react";
import type { CardType, HumanRole } from "@/lib/game/types";
import {
  loadPreferredDifficulty,
  loadPreferredLogging,
  loadPreferredModel,
  savePreferredDifficulty,
  savePreferredLogging,
  savePreferredModel,
} from "@/lib/game/persistence";
import { CARD_TYPE_STYLES, MUTED_TEXT } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";
import { CLAUDE_MODELS, DEFAULT_MODEL } from "@/lib/claude/models";
import {
  DIFFICULTIES,
  DIFFICULTY_CONFIG,
  type Difficulty,
} from "@/lib/config/difficulty";
import { Button } from "@/components/ui/Button";

export interface GameSetupProps {
  onStart: (
    role: HumanRole,
    model: string | null,
    difficulty: Difficulty,
    enableLogging: boolean,
  ) => void;
}

const ROLES: { value: HumanRole; label: string; description: string }[] = [
  {
    value: "spymaster",
    label: "Spymaster",
    description: "You see the key card and give the clue + number.",
  },
  {
    value: "guesser",
    label: "Guesser",
    description: "A bot gives clues; you pick the words.",
  },
];

// Static 5x5 pattern echoing a key card (9/8/7/1 split) — purely decorative,
// unrelated to any actual game board.
const MOTIF: CardType[] = [
  "red", "blue", "neutral", "red", "blue",
  "blue", "red", "neutral", "red", "blue",
  "red", "neutral", "assassin", "blue", "red",
  "blue", "neutral", "red", "blue", "neutral",
  "red", "neutral", "blue", "red", "neutral",
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
      {children}
    </span>
  );
}

export function GameSetup({ onStart }: GameSetupProps) {
  const [role, setRole] = useState<HumanRole>("spymaster");
  const [model, setModel] = useState<string>(() => loadPreferredModel() ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(() => loadPreferredDifficulty());
  const [enableLogging, setEnableLogging] = useState(() => loadPreferredLogging());

  function selectModel(value: string) {
    setModel(value);
    savePreferredModel(value || null);
  }

  function selectDifficulty(value: Difficulty) {
    setDifficulty(value);
    savePreferredDifficulty(value);
  }

  function toggleLogging(value: boolean) {
    setEnableLogging(value);
    savePreferredLogging(value);
  }

  return (
    <div className="grid w-full max-w-3xl grid-cols-1 overflow-hidden rounded-lg border border-divider shadow-lg md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div
        className="relative flex flex-col justify-between overflow-hidden p-10"
        style={{
          background:
            "linear-gradient(160deg, var(--section) 0%, #1a1c33 70%)",
        }}
      >
        <div>
          <h6 className="mb-3.5 text-[13px] font-medium uppercase tracking-wide text-[var(--section-ghost)]">
            Solo · vs. LLM
          </h6>
          <h2 className="mb-2.5 text-[32px] font-medium text-[#f3f5fe]">
            Codenames
          </h2>
          <p className="max-w-[260px] text-[13px] leading-relaxed text-foreground/60">
            A local game of Codenames where the other seats at the table are
            LLM-driven bots, powered by Claude.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-5 max-w-62 gap-4 my-4">
            {MOTIF.map((type, i) => {
              const palette = CARD_TYPE_STYLES[type];
              return (
                <div
                  key={i}
                  className="w-8 h-8 rounded"
                  style={{
                    background:
                      type === "neutral"
                        ? "color-mix(in srgb, var(--foreground) 10%, transparent)"
                        : palette.fill,
                    opacity: 0.85,
                  }}
                />
              );
            })}
          </div>
          <span className="font-mono text-[11px] text-foreground/45">
            claude · local CLI
          </span>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-6 p-10">
        <div className="flex flex-col gap-2.5">
          <FieldLabel>Your role</FieldLabel>
          <div className="flex flex-col gap-2">
            {ROLES.map((r) => {
              const selected = role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setRole(r.value)}
                  className="flex cursor-pointer items-center justify-between rounded-md border px-4 py-3.5 text-left transition-colors"
                  style={
                    selected
                      ? {
                          borderColor: "var(--accent)",
                          background:
                            "color-mix(in srgb, var(--accent) 10%, transparent)",
                        }
                      : { borderColor: "var(--divider)" }
                  }
                >
                  <span>
                    <span
                      className="block text-sm font-medium"
                      style={{
                        color: selected ? "var(--accent-300)" : undefined,
                      }}
                    >
                      {r.label}
                    </span>
                    <span className={cn("block text-[11.5px]", MUTED_TEXT)}>
                      {r.description}
                    </span>
                  </span>
                  <span
                    className="h-4 w-4 flex-none rounded-full border-[1.5px]"
                    style={
                      selected
                        ? {
                            borderColor: "var(--accent)",
                            background: "var(--accent)",
                            boxShadow: "inset 0 0 0 4px var(--background)",
                          }
                        : { borderColor: "var(--divider)" }
                    }
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <FieldLabel>Opponent difficulty</FieldLabel>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => {
              const selected = difficulty === d;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectDifficulty(d)}
                  className="flex-1 cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors"
                  style={
                    selected
                      ? {
                          borderColor: "var(--accent)",
                          background:
                            "color-mix(in srgb, var(--accent) 10%, transparent)",
                          color: "var(--accent-300)",
                        }
                      : { borderColor: "var(--divider)" }
                  }
                >
                  {DIFFICULTY_CONFIG[d].label}
                </button>
              );
            })}
          </div>
          <span className={cn("text-[11.5px]", MUTED_TEXT)}>
            {DIFFICULTY_CONFIG[difficulty].description} Your own teammate bot
            always plays at full strength.
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-foreground/60">
              Model
            </label>
            <span className="group relative flex">
              <span
                tabIndex={0}
                className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-foreground/40 text-[10px] leading-none text-foreground/50"
                aria-label="Claude models run through your logged-in claude CLI."
              >
                i
              </span>
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 rounded-md border border-divider bg-surface px-3 py-2 text-xs text-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                Bots run through your logged-in <code>claude</code> CLI. Haiku
                is fastest, Opus is the strongest (and slowest) player.
              </span>
            </span>
          </div>
          <select
            value={model}
            onChange={(e) => selectModel(e.target.value)}
            className="input"
          >
            <option value="">Default ({DEFAULT_MODEL})</option>
            {CLAUDE_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2.5 text-sm">
          <span
            className="flex h-4 w-4 flex-none items-center justify-center rounded"
            style={{
              border: enableLogging
                ? "1.5px solid var(--accent)"
                : "1.5px solid var(--divider)",
              background: enableLogging ? "var(--accent)" : "transparent",
            }}
          >
            {enableLogging && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path
                  d="M1 4L3.5 6.5L9 1"
                  stroke="#161826"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <input
            type="checkbox"
            checked={enableLogging}
            onChange={(e) => toggleLogging(e.target.checked)}
            className="sr-only"
          />
          <span>
            <span className="font-medium text-foreground">
              Save logs
            </span>{" "}
            <span className={cn("text-xs", MUTED_TEXT)}>
              — writes a full move-by-move transcript (clues, guesses, bot
              reasoning, system prompts) to the logs/ folder
            </span>
          </span>
        </label>

        <Button
          size="pill"
          className="self-start px-8"
          onClick={() => onStart(role, model || null, difficulty, enableLogging)}
        >
          Start game
        </Button>
      </div>
    </div>
  );
}
