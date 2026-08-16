"use client";

import { useState } from "react";
import type { LogEntry } from "@/lib/game/log";
import { Button } from "@/components/ui/Button";
import { LogEntryList } from "./GameLog";

export interface GameLogRailProps {
  entries: LogEntry[];
  onRestart: () => void;
  transcriptSaved: string | null;
}

// Right-rail log for the guesser command-dock layout (1d): header with a
// hide/show toggle, scrollable body, and a footer that carries the restart
// control the sidebar layout puts above the log instead.
export function GameLogRail({
  entries,
  onRestart,
  transcriptSaved,
}: GameLogRailProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex w-[300px] shrink-0 flex-col overflow-hidden border-l border-divider bg-surface">
      <div className="flex items-center justify-between border-b border-divider px-4 py-3">
        <span className="text-[12.5px] font-medium text-foreground">
          Game log
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="text-[11px] text-foreground/45 hover:text-foreground/70"
        >
          {collapsed ? "Show ▾" : "Hide ▸"}
        </button>
      </div>
      {!collapsed && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3.5 text-[11.5px] text-foreground/65">
          <LogEntryList entries={entries} />
        </div>
      )}
      <div className="flex flex-col gap-2 border-t border-divider px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onRestart}
          className="w-full"
        >
          Restart game
        </Button>
        {transcriptSaved && (
          <p className="text-center text-[11px] text-foreground/40">
            Transcript saved to logs/{transcriptSaved}
          </p>
        )}
      </div>
    </div>
  );
}
