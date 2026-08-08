"use client";

import { useState } from "react";
import type { HumanRole } from "@/lib/game/types";
import type { Difficulty } from "@/lib/config/difficulty";
import { DIFFICULTIES } from "@/lib/config/difficulty";
import { MUTED_TEXT } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { OptionButton } from "@/components/ui/OptionButton";

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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm font-medium text-foreground">{children}</span>
  );
}

export function GameSetup({ onStart }: GameSetupProps) {
  const [role, setRole] = useState<HumanRole>("spymaster");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Codenames</h1>
        <p className={cn("mt-1 text-sm", MUTED_TEXT)}>
          Play against Ollama-driven bots.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <FieldLabel>Your role</FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <OptionButton
              key={r.value}
              selected={role === r.value}
              onClick={() => setRole(r.value)}
              className="flex flex-col gap-1 rounded-lg px-4 py-3 text-left"
            >
              <span className="font-medium text-foreground">{r.label}</span>
              <span className={cn("text-xs", MUTED_TEXT)}>
                {r.description}
              </span>
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <FieldLabel>Difficulty</FieldLabel>
        <div className="grid grid-cols-4 gap-2">
          {DIFFICULTIES.map((d) => (
            <OptionButton
              key={d}
              selected={difficulty === d}
              onClick={() => setDifficulty(d)}
              className={cn(
                "rounded-md px-3 py-2 text-sm capitalize",
                difficulty === d && "font-medium",
              )}
            >
              {d}
            </OptionButton>
          ))}
        </div>
      </div>

      <Button size="pill" onClick={() => onStart(role, difficulty)}>
        Start game
      </Button>
    </div>
  );
}
