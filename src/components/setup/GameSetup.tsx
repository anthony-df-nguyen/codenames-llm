"use client";

import { useEffect, useState } from "react";
import type { HumanRole } from "@/lib/game/types";
import { getAvailableModels } from "@/app/actions";
import {
  loadPreferredLogging,
  loadPreferredModel,
  savePreferredLogging,
  savePreferredModel,
} from "@/lib/game/persistence";
import { MUTED_TEXT } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { OptionButton } from "@/components/ui/OptionButton";

export interface GameSetupProps {
  onStart: (
    role: HumanRole,
    model: string | null,
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm font-medium text-foreground">{children}</span>
  );
}

export function GameSetup({ onStart }: GameSetupProps) {
  const [role, setRole] = useState<HumanRole>("spymaster");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [model, setModel] = useState<string>(() => loadPreferredModel() ?? "");
  const [modelsError, setModelsError] = useState(false);
  const [enableLogging, setEnableLogging] = useState(() => loadPreferredLogging());

  function selectModel(value: string) {
    setModel(value);
    savePreferredModel(value || null);
  }

  function toggleLogging(value: boolean) {
    setEnableLogging(value);
    savePreferredLogging(value);
  }

  useEffect(() => {
    getAvailableModels()
      .then(setAvailableModels)
      .catch(() => setModelsError(true));
  }, []);

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
        <div className="flex items-center gap-1.5">
          <FieldLabel>Model</FieldLabel>
          <span className="group relative flex">
            <span
              tabIndex={0}
              className={cn(
                "flex h-4 w-4 cursor-help items-center justify-center rounded-full border text-[10px] leading-none",
                "border-zinc-400 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400",
              )}
              aria-label="Only models that support text completion are listed."
            >
              i
            </span>
            <span
              role="tooltip"
              className={cn(
                "pointer-events-none absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 rounded-md border px-3 py-2 text-xs opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
                "border-zinc-300 bg-background text-foreground dark:border-zinc-700",
              )}
            >
              Only models that support text completion (Ollama&apos;s{" "}
              <code>completion</code> capability) are listed —
              embedding-only models can&apos;t drive a chat turn and won&apos;t
              appear here.
            </span>
          </span>
        </div>
        {modelsError ? (
          <p className={cn("text-xs", MUTED_TEXT)}>
            Couldn&apos;t reach Ollama — using the default model.
          </p>
        ) : availableModels.length === 0 ? (
          <p className={cn("text-xs", MUTED_TEXT)}>
            Loading installed models…
          </p>
        ) : (
          <select
            value={model}
            onChange={(e) => selectModel(e.target.value)}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-foreground dark:border-zinc-700"
          >
            <option value="">Default model</option>
            {availableModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>

      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={enableLogging}
          onChange={(e) => toggleLogging(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
        />
        <span>
          <span className="font-medium text-foreground">
            Enable detailed logging
          </span>
          <span className={cn("block text-xs", MUTED_TEXT)}>
            Records both bots&apos; system prompts and full reasoning so you
            can export the game as a transcript afterward, e.g. to review
            with Claude.
          </span>
        </span>
      </label>

      <Button
        size="pill"
        onClick={() => onStart(role, model || null, enableLogging)}
      >
        Start game
      </Button>
    </div>
  );
}
