import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LogEntry } from "@/lib/game/log";
import { TURN_END_LABEL } from "@/lib/game/log";
import { RESULT_COLORS, TEAM_STYLES } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";

function formatTimestamp(ms: number) {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDurationSeconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function Timestamp({ ms }: { ms: number }) {
  return (
    <span className="mr-1.5 font-mono text-[10px] text-foreground/35">
      {formatTimestamp(ms)}
    </span>
  );
}

function TeamName({ team, bold }: { team: LogEntry["team"]; bold?: boolean }) {
  return (
    <span
      className={cn("capitalize", bold && "font-semibold")}
      style={{ color: TEAM_STYLES[team].textStrong }}
    >
      {team}
    </span>
  );
}

const ROLE_LABEL: Record<"spymaster" | "guesser", string> = {
  spymaster: "spymaster",
  guesser: "guesser",
};

function ReasoningEntry({
  entry,
  showTimestamps,
}: {
  entry: Extract<LogEntry, { type: "reasoning" }>;
  showTimestamps: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 rounded-md border border-divider">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2 py-1 text-left"
      >
        <span
          className={cn(
            "text-[10px]",
            open ? "rotate-90" : "",
            "transition-transform",
          )}
        >
          ▶
        </span>
        {showTimestamps && <Timestamp ms={entry.timestamp} />}
        <TeamName team={entry.team} /> {ROLE_LABEL[entry.role]} reasoning
        <br />
        <div>
          {entry.durationMs !== undefined && (
            <span className="text-foreground/35">
              {formatDurationSeconds(entry.durationMs)}
            </span>
          )}
        </div>
      </button>
      {open && (
        <p className="whitespace-pre-wrap border-t border-divider px-2 py-1.5 font-mono text-[11px] text-foreground/45">
          {entry.text}
        </p>
      )}
    </div>
  );
}

function ErrorEntry({
  entry,
  showTimestamps,
}: {
  entry: Extract<LogEntry, { type: "error" }>;
  showTimestamps: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [summary, ...rest] = entry.message.split(": ");
  const detail = rest.join(": ") || entry.message;
  return (
    <div className="my-2 rounded-md border border-amber-400/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-amber-400"
      >
        <span
          className={cn(
            "text-[10px]",
            open ? "rotate-90" : "",
            "transition-transform",
          )}
        >
          ▶
        </span>
        {showTimestamps && <Timestamp ms={entry.timestamp} />}⚠{" "}
        <span className="capitalize">{entry.team}</span> {summary}
      </button>
      {open && (
        <p className="whitespace-pre-wrap border-t border-amber-400/30 px-2 py-1.5 font-mono text-[11px] text-amber-400/70">
          {detail}
        </p>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  showTimestamps,
}: {
  entry: LogEntry;
  showTimestamps: boolean;
}) {
  switch (entry.type) {
    case "reasoning":
      return <ReasoningEntry entry={entry} showTimestamps={showTimestamps} />;
    case "clue":
      return (
        <p>
          {showTimestamps && <Timestamp ms={entry.timestamp} />}
          <TeamName team={entry.team} bold /> spymaster gives clue: &nbsp;
          <span className="font-semibold text-foreground">
            &quot;{entry.clue} - {entry.number}&quot;
          </span>
        </p>
      );
    case "guess":
      return (
        <p className="my-2">
          {showTimestamps && <Timestamp ms={entry.timestamp} />}
          <span>
            <TeamName team={entry.team} /> team guesses &quot;{entry.word}&quot;
            —{" "}
            <span
              className="font-medium"
              style={{
                color: entry.correct
                  ? RESULT_COLORS.correct
                  : RESULT_COLORS.incorrect,
              }}
            >
              {entry.correct ? "correct" : "incorrect"}
            </span>
          </span>
        </p>
      );
    case "turn-end":
      return (
        <p className="my-4 italic text-center text-foreground/35">
          {showTimestamps && <Timestamp ms={entry.timestamp} />}—{" "}
          <span className="capitalize">{entry.team}</span>{" "}
          {TURN_END_LABEL[entry.reason]} —
        </p>
      );
    case "error":
      return <ErrorEntry entry={entry} showTimestamps={showTimestamps} />;
  }
}

export interface LogEntryListProps {
  entries: LogEntry[];
  /** Reasoning is always captured; these just filter what's displayed. */
  showSpymasterReasoning?: boolean;
  showGuesserReasoning?: boolean;
  showTimestamps?: boolean;
}

export function LogEntryList({
  entries,
  showSpymasterReasoning = true,
  showGuesserReasoning = true,
  showTimestamps = false,
}: LogEntryListProps) {
  const visible = entries.filter((entry) => {
    if (entry.type !== "reasoning") return true;
    return entry.role === "spymaster"
      ? showSpymasterReasoning
      : showGuesserReasoning;
  });
  const ordered = visible.slice().reverse();
  return ordered.length === 0 ? (
    <p className="text-foreground/35">No moves yet.</p>
  ) : (
    <AnimatePresence initial={false}>
      {ordered.map((entry) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <EntryRow entry={entry} showTimestamps={showTimestamps} />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

export interface ReasoningTogglesProps {
  showSpymasterReasoning: boolean;
  showGuesserReasoning: boolean;
  showTimestamps: boolean;
  onShowSpymasterReasoningChange: (value: boolean) => void;
  onShowGuesserReasoningChange: (value: boolean) => void;
  onShowTimestampsChange: (value: boolean) => void;
  /** False for models that don't expose reasoning (Claude) — hides those two toggles. */
  reasoningAvailable?: boolean;
  className?: string;
}

// Mid-game display filters for the two bot roles' reasoning, plus whether to
// show per-entry timestamps / bot thinking duration. Independent of whether
// the transcript gets written to disk — see the setup screen's "Save
// transcript" toggle for that.
export function ReasoningToggles({
  showSpymasterReasoning,
  showGuesserReasoning,
  showTimestamps,
  onShowSpymasterReasoningChange,
  onShowGuesserReasoningChange,
  onShowTimestampsChange,
  reasoningAvailable = true,
  className,
}: ReasoningTogglesProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]",
        className,
      )}
    >
      {reasoningAvailable && (
        <>
          <label className="flex cursor-pointer items-center gap-1.5 text-foreground/60">
            <input
              type="checkbox"
              checked={showGuesserReasoning}
              onChange={(e) => onShowGuesserReasoningChange(e.target.checked)}
              className="h-3 w-3"
            />
            Show Guesser Reasoning
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-foreground/60">
            <input
              type="checkbox"
              checked={showSpymasterReasoning}
              onChange={(e) => onShowSpymasterReasoningChange(e.target.checked)}
              className="h-3 w-3"
            />
            Show Spymaster Reasoning
          </label>
        </>
      )}
      <label className="flex cursor-pointer items-center gap-1.5 text-foreground/60">
        <input
          type="checkbox"
          checked={showTimestamps}
          onChange={(e) => onShowTimestampsChange(e.target.checked)}
          className="h-3 w-3"
        />
        Show Timestamps
      </label>
    </div>
  );
}
