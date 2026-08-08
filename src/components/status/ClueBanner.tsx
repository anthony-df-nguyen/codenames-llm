import { motion } from "framer-motion";
import type { Team } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { BotStatus } from "./BotStatus";

export interface ClueBannerProps {
  clue: { clue: string; number: number };
  team: Team;
  guessesLeft: number;
  interactive: boolean;
  onStop: () => void;
  // Non-null while a bot is guessing against this clue — shown instead of
  // the human "Stop guessing" control.
  phase: string | null;
}

export function ClueBanner({
  clue,
  team,
  guessesLeft,
  interactive,
  onStop,
  phase,
}: ClueBannerProps) {
  return (
    <motion.div
      key={`${clue.clue}-${clue.number}`}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "flex w-full flex-col items-center gap-3 rounded-xl border-2 px-6 py-4 text-center",
        team === "red"
          ? "border-red-500 bg-red-50 dark:bg-red-950/30"
          : "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
      )}
    >
      <div className="flex items-baseline gap-3">
        <span
          className={cn(
            "text-3xl font-extrabold uppercase tracking-wide",
            team === "red"
              ? "text-red-600 dark:text-red-400"
              : "text-blue-600 dark:text-blue-400",
          )}
        >
          {clue.clue}
        </span>
        <span className="text-3xl font-extrabold text-foreground">
          {clue.number}
        </span>
      </div>

      {interactive ? (
        <>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            guesses left: {guessesLeft}
          </span>
          <button
            type="button"
            onClick={onStop}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
          >
            Stop guessing
          </button>
        </>
      ) : (
        <BotStatus phase={phase} team={team} />
      )}
    </motion.div>
  );
}
