"use client";

import { useState } from "react";
import type { HumanRole } from "@/lib/game/types";
import type { Difficulty } from "@/lib/config/difficulty";

export interface GameSetupProps {
  onStart: (role: HumanRole, difficulty: Difficulty) => void;
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

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert"];

export function GameSetup({ onStart }: GameSetupProps) {
  const [role, setRole] = useState<HumanRole>("spymaster");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Codenames</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Play against Ollama-driven bots.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-foreground">
          Your role
        </span>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              aria-pressed={role === r.value}
              className={`flex flex-col gap-1 rounded-lg border px-4 py-3 text-left transition-colors ${
                role === r.value
                  ? "border-foreground bg-foreground/5"
                  : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
              }`}
            >
              <span className="font-medium text-foreground">{r.label}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {r.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-foreground">
          Difficulty
        </span>
        <div className="grid grid-cols-4 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              aria-pressed={difficulty === d}
              className={`rounded-md border px-3 py-2 text-sm capitalize transition-colors ${
                difficulty === d
                  ? "border-foreground bg-foreground/5 font-medium"
                  : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onStart(role, difficulty)}
        className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Start game
      </button>
    </div>
  );
}
