import { AnimatePresence, motion } from "framer-motion";
import type { LogEntry } from "@/lib/game/log";
import { TURN_END_LABEL } from "@/lib/game/log";
import type { Team } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export interface GameLogProps {
  entries: LogEntry[];
}

const TEAM_TEXT: Record<Team, string> = {
  red: "text-red-600 dark:text-red-400",
  blue: "text-blue-600 dark:text-blue-400",
};

const CARD_TYPE_DOT: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  neutral: "bg-zinc-400",
  assassin: "bg-black dark:bg-zinc-200",
};

function sourceLabel(source: "bot" | "human") {
  return source === "human" ? "(you)" : "(bot)";
}

function EntryRow({ entry }: { entry: LogEntry }) {
  switch (entry.type) {
    case "clue":
      return (
        <p>
          <span
            className={cn("font-semibold capitalize", TEAM_TEXT[entry.team])}
          >
            {entry.team}
          </span>{" "}
          spymaster {sourceLabel(entry.source)}:{" "}
          <span className="font-semibold text-foreground">
            &quot;{entry.clue}&quot;
          </span>{" "}
          for {entry.number}
        </p>
      );
    case "guess":
      return (
        <p className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block h-2 w-2 shrink-0 rounded-full",
              CARD_TYPE_DOT[entry.cardType],
            )}
          />
          <span>
            <span className={cn("capitalize", TEAM_TEXT[entry.team])}>
              {entry.team}
            </span>{" "}
            guesser {sourceLabel(entry.source)} guessed &quot;{entry.word}
            &quot; —{" "}
            <span
              className={
                entry.correct
                  ? "font-medium text-emerald-600 dark:text-emerald-400"
                  : "font-medium text-zinc-500 dark:text-zinc-400"
              }
            >
              {entry.correct ? "correct" : entry.cardType}
            </span>
          </span>
        </p>
      );
    case "turn-end":
      return (
        <p className="italic text-zinc-400 dark:text-zinc-500">
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
      <p className="mb-1 text-sm font-semibold text-foreground">Game log</p>
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
