"use client";

import { useState, type FormEvent } from "react";

export interface ClueInputProps {
  onSubmit: (clue: string, number: number) => void;
  /** Surface a rejection reason from server-side `validateClue` (the source
   * of truth — this component only does a cheap client-side pre-check). */
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

    if (!trimmed || /\s/.test(trimmed)) {
      setLocalError("Clue must be a single word.");
      return;
    }
    if (!Number.isInteger(number) || number < 0) {
      setLocalError("Number must be a non-negative integer.");
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
          className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-foreground dark:border-zinc-700"
        />
        <input
          type="number"
          min={0}
          max={9}
          value={number}
          onChange={(e) => setNumber(Number(e.target.value))}
          disabled={disabled}
          className="w-16 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-foreground dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={disabled}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          Give clue
        </button>
      </div>
      {(localError || error) && (
        <p className="text-xs text-red-500">{localError ?? error}</p>
      )}
    </form>
  );
}
