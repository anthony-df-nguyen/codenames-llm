import { motion } from "framer-motion";
import type { Team } from "@/lib/game/types";
import { MUTED_TEXT, TEAM_STYLES } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";

export interface BotStatusProps {
  phase: string | null;
  team: Team;
}

const DOT_DELAYS = [0, 0.15, 0.3];

const DOT_TRANSITION = (delay: number) => ({
  duration: 0.9,
  repeat: Infinity,
  ease: "easeInOut" as const,
  delay,
});

export function BotStatus({ phase, team }: BotStatusProps) {
  if (!phase) {
    return <p className={cn("text-sm", MUTED_TEXT)}>Waiting…</p>;
  }

  return (
    <div className={cn("flex items-center gap-2 text-sm", MUTED_TEXT)}>
      <span className="flex items-center gap-1">
        {DOT_DELAYS.map((delay) => (
          <motion.span
            key={delay}
            className={cn("h-1.5 w-1.5 rounded-full", TEAM_STYLES[team].dot)}
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
            transition={DOT_TRANSITION(delay)}
          />
        ))}
      </span>
      <span>{phase}</span>
    </div>
  );
}
