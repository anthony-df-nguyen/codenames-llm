import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LogEntry, LogSource } from "@/lib/game/log";
import { TURN_END_LABEL } from "@/lib/game/log";
import { CARD_TYPE_STYLES, TEAM_STYLES } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";

export interface GameLogProps {
  entries: LogEntry[];
}

function sourceLabel(source: LogSource) {
  return source === "human" ? "(you)" : "(bot)";
}

function TeamName({
  team,
  bold,
}: {
  team: LogEntry["team"];
  bold?: boolean;
}) {
  return (
    <span
      className={cn(
        "capitalize",
        bold && "font-semibold",
        TEAM_STYLES[team].textStrong,
      )}
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
}: {
  entry: Extract<LogEntry, { type: "reasoning" }>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-1 rounded-md border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2 py-1 text-left"
      >
        <span className={cn("text-[10px]", open ? "rotate-90" : "", "transition-transform")}>
          ▶
        </span>
        <TeamName team={entry.team} /> {ROLE_LABEL[entry.role]} reasoning
      </button>
      {open && (
        <p className="whitespace-pre-wrap border-t border-zinc-200 px-2 py-1.5 font-mono text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {entry.text}
        </p>
      )}
    </div>
  );
}

function EntryRow({ entry }: { entry: LogEntry }) {
  switch (entry.type) {
    case "reasoning":
      return <ReasoningEntry entry={entry} />;
    case "clue":
      return (
        <p>
          <TeamName team={entry.team} bold /> spymaster gives clue: &nbsp;
          <span className="font-semibold text-foreground">
            &quot;{entry.clue} - {entry.number}&quot;
          </span>
        </p>
      );
    case "guess":
      return (
        <p className="flex items-center gap-1.5">
          <span>
            <TeamName team={entry.team} /> team {" "}
            guesses &quot;{entry.word}&quot; —{" "}
            <span
              className={cn(
                "font-medium",
                entry.correct
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-500 dark:text-red-400",
              )}
            >
              {entry.correct ? "correct" : "incorrect"}
            </span>
          </span>
        </p>
      );
    case "turn-end":
      return (
        <p className="my-6 italic text-zinc-400 dark:text-zinc-500">
          — <span className="capitalize">{entry.team}</span>{" "}
          {TURN_END_LABEL[entry.reason]} —
        </p>
      );
    case "error":
      return (
        <p className="text-amber-600 dark:text-amber-400">
          ⚠ <span className="capitalize">{entry.team}</span> {entry.message}
        </p>
      );
  }
}

export function GameLog({ entries }: GameLogProps) {
  const ordered = entries.slice().reverse();
  return (
    <div className="flex flex-col gap-1 overflow-y-auto rounded-md border border-zinc-200 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 xl:flex-1">
      <p className="my-1 text-sm font-semibold text-foreground">Game log</p>
      {ordered.length === 0 ? (
        <p className="text-zinc-400 dark:text-zinc-600">No moves yet.</p>
      ) : (
        <AnimatePresence initial={false}>
          {ordered.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EntryRow entry={entry} />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
