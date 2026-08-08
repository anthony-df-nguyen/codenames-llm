import { motion } from "framer-motion";
import type { Card } from "@/lib/game/types";
import { CARD_TYPE_STYLES, HIDDEN_CARD_STYLE } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";

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
        const clickable = !card.revealed && !disabled && Boolean(onCardClick);
        const isHighlighted = card.word === highlightWord;

        return (
          <button
            key={card.word}
            type="button"
            disabled={!clickable}
            onClick={() => onCardClick?.(card.word)}
            className={cn(
              "relative flex h-20 items-center justify-center rounded-md border px-2 text-center text-xs font-semibold uppercase tracking-wide transition-colors sm:text-sm",
              card.revealed
                ? `${CARD_TYPE_STYLES[card.type].face} opacity-70`
                : HIDDEN_CARD_STYLE,
              clickable ? "cursor-pointer" : "cursor-default",
            )}
          >
            {isHighlighted && (
              <motion.span
                className={cn(
                  "pointer-events-none absolute inset-0 rounded-md ring-4",
                  highlightCorrect ? "ring-emerald-400" : "ring-amber-400",
                )}
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
