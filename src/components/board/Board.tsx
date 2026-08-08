import { motion } from "framer-motion";
import type { Card, CardType } from "@/lib/game/types";

export interface BoardProps {
  cards: Card[];
  onCardClick?: (word: string) => void;
  disabled?: boolean;
  // The word most recently guessed (by bot or human) and whether it matched
  // the guessing team's color — drives a brief flash so a player can tell at
  // a glance which card a decision just landed on.
  highlightWord?: string | null;
  highlightCorrect?: boolean | null;
}

const TYPE_STYLES: Record<CardType, string> = {
  red: "bg-red-500 text-white border-red-600",
  blue: "bg-blue-500 text-white border-blue-600",
  neutral: "bg-zinc-300 text-zinc-900 border-zinc-400 dark:bg-zinc-500 dark:text-zinc-50 dark:border-zinc-400",
  assassin: "bg-zinc-900 text-white border-black dark:bg-black dark:border-zinc-700",
};

const HIDDEN_STYLE =
  "bg-zinc-100 text-zinc-900 border-zinc-300 hover:border-zinc-400 dark:bg-zinc-800 dark:text-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600";

export function Board({
  cards,
  onCardClick,
  disabled,
  highlightWord,
  highlightCorrect,
}: BoardProps) {
  return (
    <div className="grid w-full max-w-5xl grid-cols-5 gap-2">
      {cards.map((card) => {
        const showType = card.revealed;
        const clickable = !card.revealed && !disabled && Boolean(onCardClick);
        const isHighlighted = card.word === highlightWord;

        return (
          <button
            key={card.word}
            type="button"
            disabled={!clickable}
            onClick={() => onCardClick?.(card.word)}
            className={`relative flex h-20 items-center justify-center rounded-md border px-2 text-center text-xs font-semibold uppercase tracking-wide transition-colors sm:text-sm ${
              showType ? TYPE_STYLES[card.type] : HIDDEN_STYLE
            } ${card.revealed ? "opacity-70" : ""} ${
              clickable ? "cursor-pointer" : "cursor-default"
            }`}
          >
            {isHighlighted && (
              <motion.span
                className={`pointer-events-none absolute inset-0 rounded-md ring-4 ${
                  highlightCorrect ? "ring-emerald-400" : "ring-amber-400"
                }`}
                initial={{ opacity: 0.9, scale: 1.06 }}
                animate={{ opacity: 0, scale: 1 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
            )}
            {card.revealed ? (
              <motion.span
                key="revealed"
                initial={{ scale: 0.6, opacity: 0, rotateX: 90 }}
                animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                {card.word}
              </motion.span>
            ) : (
              <span>{card.word}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
