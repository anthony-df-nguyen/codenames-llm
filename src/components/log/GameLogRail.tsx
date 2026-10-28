"use client";

import { useState } from "react";
import type { LogEntry } from "@/lib/game/log";
import { Button } from "@/components/ui/Button";
import { LogEntryList, ReasoningToggles } from "./GameLog";

export interface GameLogRailProps {
  entries: LogEntry[];
  onRestart: () => void;
  transcriptSaved: string | null;
  showSpymasterReasoning: boolean;
  showGuesserReasoning: boolean;
  showTimestamps: boolean;
  onShowSpymasterReasoningChange: (value: boolean) => void;
  onShowGuesserReasoningChange: (value: boolean) => void;
  reasoningAvailable: boolean;
  onShowTimestampsChange: (value: boolean) => void;
}

// Right-rail log for the command-dock layout: header with a hide/show
// toggle, scrollable body, and a footer that carries the restart control.
export function GameLogRail({
  entries,
  onRestart,
  transcriptSaved,
  showSpymasterReasoning,
  showGuesserReasoning,
  showTimestamps,
  onShowSpymasterReasoningChange,
  onShowGuesserReasoningChange,
  reasoningAvailable,
  onShowTimestampsChange,
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
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto text-[11.5px] text-foreground/65">
          <div className="p-4">
            <LogEntryList
              entries={entries}
              showSpymasterReasoning={showSpymasterReasoning}
              showGuesserReasoning={showGuesserReasoning}
              showTimestamps={showTimestamps}
            />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2 border-t border-divider px-4 py-3">
        <ReasoningToggles
          showSpymasterReasoning={showSpymasterReasoning}
          showGuesserReasoning={showGuesserReasoning}
          showTimestamps={showTimestamps}
          onShowSpymasterReasoningChange={onShowSpymasterReasoningChange}
          onShowGuesserReasoningChange={onShowGuesserReasoningChange}
          reasoningAvailable={reasoningAvailable}
          onShowTimestampsChange={onShowTimestampsChange}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onRestart}
          className="mt-2 w-full"
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
