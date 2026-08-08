"use client";

import { useState, type FormEvent } from "react";
import { validateClueFormat } from "@/lib/game/state";
import { INPUT_STYLE } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export interface ClueInputProps {
  onSubmit: (clue: string, number: number) => void;
  /** Surface a rejection reason from `validateClue` (the source of truth —
   * this component only pre-checks the board-independent rules). */
  error?: string;
  disabled?: boolean;
}

export function ClueInput({ onSubmit, error, disabled }: ClueInputProps) {
  const [clue, setClue] = useState("");
  const [number, setNumber] = useState(1);
  const [localError, setLocalError] = useState<string | undefined>();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = clue.trim();

    const result = validateClueFormat(trimmed, number);
    if (!result.valid) {
      setLocalError(result.reason);
      return;
    }

    setLocalError(undefined);
    onSubmit(trimmed, number);
    setClue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={clue}
          onChange={(e) => setClue(e.target.value)}
          placeholder="Clue"
          disabled={disabled}
          className={cn("flex-1", INPUT_STYLE)}
        />
        <input
          type="number"
          min={0}
          max={9}
          value={number}
          onChange={(e) => setNumber(Number(e.target.value))}
          disabled={disabled}
          className={cn("w-16", INPUT_STYLE)}
        />
        <Button type="submit" disabled={disabled}>
          Give clue
        </Button>
      </div>
      {(localError || error) && (
        <p className="text-xs text-red-500">{localError ?? error}</p>
      )}
    </form>
  );
}
