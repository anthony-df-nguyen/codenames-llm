import type { Card, CardType } from "@/lib/game/types";

export interface KeyCardProps {
  cards: Card[];
}

const DOT_STYLES: Record<CardType, string> = {
  red: "bg-red-500 border-red-600",
  blue: "bg-blue-500 border-blue-600",
  neutral: "bg-zinc-300 border-zinc-400 dark:bg-zinc-500 dark:border-zinc-400",
  assassin: "bg-zinc-900 border-black dark:bg-black dark:border-zinc-700",
};

// Mini replica of the physical spymaster key card: same 5x5 layout as the
// board, but shrunk to just colored squares so it reads at a glance without
// re-reading every word. Revealed cards fade out since their color is no
// longer secret info once it's shown on the live board.
export function KeyCard({ cards }: KeyCardProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Key card
      </p>
      <div className="grid grid-cols-5 gap-1 rounded-md border border-zinc-300 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
        {cards.map((card) => (
          <div
            key={card.word}
            title={card.word}
            className={`h-6 w-6 rounded-sm border sm:h-8 sm:w-8 ${DOT_STYLES[card.type]} ${
              card.revealed ? "opacity-30" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}
