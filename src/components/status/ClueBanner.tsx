import { motion } from "framer-motion";
import type { Clue, Team } from "@/lib/game/types";
import { MUTED_TEXT, TEAM_STYLES } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { BotStatus } from "./BotStatus";

export interface ClueBannerProps {
  clue: Clue;
  team: Team;
  /** null = unlimited guesses (clue number was 0). */
  guessesLeft: number | null;
  interactive: boolean;
  /** Teams must guess at least once per clue before they may stop. */
  canStop: boolean;
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
  canStop,
  onStop,
  phase,
}: ClueBannerProps) {
  return (
    <motion.div
      key={`${clue.clue}-${clue.number}`}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex w-full flex-col items-center gap-3 rounded-lg border-2 px-6 py-4 text-center"
      style={{
        borderColor: TEAM_STYLES[team].textStrong,
        background: `color-mix(in srgb, ${TEAM_STYLES[team].textStrong} 10%, transparent)`,
      }}
    >
      <div className="flex items-baseline gap-3">
        <span
          className="text-3xl font-semibold uppercase tracking-wide"
          style={{ color: TEAM_STYLES[team].textStrong }}
        >
          {clue.clue}
        </span>
        <span className="text-3xl font-semibold text-foreground">
          {clue.number}
        </span>
      </div>

      {interactive ? (
        <>
          <span className={cn("text-sm", MUTED_TEXT)}>
            guesses left: {guessesLeft ?? "unlimited"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onStop}
            disabled={!canStop}
            title={
              canStop ? undefined : "You must make at least one guess first"
            }
          >
            Stop guessing
          </Button>
        </>
      ) : (
        <BotStatus phase={phase} team={team} />
      )}
    </motion.div>
  );
}
