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

function EntryRow({ entry }: { entry: LogEntry }) {
  switch (entry.type) {
    case "clue":
      return (
        <p>
          <TeamName team={entry.team} bold /> spymaster{" "}
          {sourceLabel(entry.source)}:{" "}
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
              CARD_TYPE_STYLES[entry.cardType].swatch,
            )}
          />
          <span>
            <TeamName team={entry.team} /> guesser {sourceLabel(entry.source)}{" "}
            guessed &quot;{entry.word}&quot; —{" "}
            <span
              className={cn(
                "font-medium",
                entry.correct
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-500 dark:text-zinc-400",
              )}
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
