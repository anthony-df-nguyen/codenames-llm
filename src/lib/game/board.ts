// Board generation (word selection, key card assignment).

import type { Card, CardType, Team } from "./types";
import { WORD_LIST } from "./words";

const BOARD_SIZE = 25;
const STARTER_COUNT = 9;
const OTHER_COUNT = 8;
const NEUTRAL_COUNT = 7;
const ASSASSIN_COUNT = 1;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateBoard(starterTeam: Team): Card[] {
  const otherTeam: Team = starterTeam === "red" ? "blue" : "red";
  const words = shuffle(WORD_LIST).slice(0, BOARD_SIZE);

  const types: CardType[] = [
    ...Array(STARTER_COUNT).fill(starterTeam),
    ...Array(OTHER_COUNT).fill(otherTeam),
    ...Array(NEUTRAL_COUNT).fill("neutral"),
    ...Array(ASSASSIN_COUNT).fill("assassin"),
  ];
  const shuffledTypes = shuffle(types);

  return words.map((word, i) => ({
    word,
    type: shuffledTypes[i],
    revealed: false,
  }));
}
