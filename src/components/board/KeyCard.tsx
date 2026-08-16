import type { Card } from "@/lib/game/types";
import { CARD_TYPE_STYLES, MUTED_TEXT } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";

export interface KeyCardProps {
  cards: Card[];
}

// Mini replica of the physical spymaster key card: same 5x5 layout as the
// board, but shrunk to just colored squares so it reads at a glance without
// re-reading every word. Revealed cards fade out since their color is no
// longer secret info once it's shown on the live board.
export function KeyCard({ cards }: KeyCardProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p
        className={cn(
          "text-xs font-medium uppercase tracking-wide",
          MUTED_TEXT,
        )}
      >
        Key card
      </p>
      <div className="grid grid-cols-5 gap-1 rounded-md border border-divider bg-surface p-2">
        {cards.map((card) => {
          const palette = CARD_TYPE_STYLES[card.type];
          return (
            <div
              key={card.word}
              title={card.word}
              className="h-6 w-6 rounded-sm border sm:h-8 sm:w-8"
              style={{
                background: palette.fill,
                borderColor: palette.edge,
                opacity: card.revealed ? 0.3 : 1,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
