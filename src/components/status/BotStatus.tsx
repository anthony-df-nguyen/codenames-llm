import { motion } from "framer-motion";
import type { Team } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export interface BotStatusProps {
  phase: string | null;
  team: Team;
}

const DOT_TRANSITION = (delay: number) => ({
  duration: 0.9,
  repeat: Infinity,
  ease: "easeInOut" as const,
  delay,
});

export function BotStatus({ phase, team }: BotStatusProps) {
  if (!phase) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Waiting…</p>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span className="flex items-center gap-1">
        {[0, 0.15, 0.3].map((delay, i) => (
          <motion.span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              team === "red" ? "bg-red-500" : "bg-blue-500",
            )}
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
            transition={DOT_TRANSITION(delay)}
          />
        ))}
      </span>
      <span>{phase}</span>
    </div>
  );
}
