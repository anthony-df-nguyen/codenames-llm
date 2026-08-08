# Build Progress

Tracks implementation status against `CLAUDE.md`. Update checkboxes as work lands.
Suggested order: tackle one section per session — each is roughly self-contained.

## 1. Game logic (pure TS, no Ollama needed)
- [x] `src/lib/game/board.ts` — `generateBoard(starterTeam)`: word list, 25-card
      assignment (9 starter team / 8 other team / 7 neutral / 1 assassin)
- [x] `src/lib/game/state.ts` — `createInitialState`, `checkWinner`,
      `revealCard`, `resolveGuess` (reveal + turn-switch), `endTurn`, `giveClue`
- [x] Clue legality validation (`validateClue`: single word, not
      substring/superset of a board word, not reused this game)

## 2. Ollama plumbing
- [x] `src/lib/ollama/client.ts` — actual `fetch` to `localhost:11434` with
      `format: "json"` structured output
- [x] API route(s) under `src/app/api/...` to proxy client → Ollama server
      (`src/app/api/ollama/generate/route.ts`)

## 3. Bots
- [x] `src/lib/bots/spymaster.ts` — prompt design + call to Ollama client,
      returns `{ clue, number }`
- [x] `src/lib/bots/guesser.ts` — prompt design + call to Ollama client,
      returns ranked guesses + stop signal (must never see key card/team info)
- [x] Re-prompt loop when spymaster clue fails validation

## 4. UI components
- [x] `src/components/setup/GameSetup.tsx` — role (Spymaster/Guesser) +
      difficulty selection screen
- [x] `src/components/board/Board.tsx` — render board grid, revealed states
- [x] `src/components/clue/ClueInput.tsx` — clue + number input for human
      spymaster

## 5. Wire it together
- [x] `src/app/page.tsx` — drives the actual game loop
- [x] End-to-end bot-vs-bot playtest against live `llama3.1:8b` (see below);
      human-in-the-loop playtest in an actual browser still pending

## Status snapshot (as of 2026-08-08)
Section 5 wired `page.tsx` (client component, `useState`/`useEffect`) into a
full turn loop: `GameSetup` picks role + difficulty and randomizes
`humanTeam`; whichever (team, role) pair isn't the human's is bot-controlled,
including the entire opposing team. Two effects drive bots forward — one
fires the bot spymaster when it's a bot's turn to clue, one fires the bot
guesser (via a self-contained `runBotGuessTurn` async loop that walks its
ranked guesses one at a time, applying `resolveGuess` and stopping on a
wrong guess/win/exhausted cap) — each guarded by a ref keyed on
`cluesGiven.length` so React StrictMode's double-invoke and normal
re-renders can't double-fire a bot call. Human spymaster clues go through
`giveClue` directly (pure game logic, no network round trip); human guesses
go through `resolveGuess` on click, with a "Stop guessing" button for
voluntarily ending the turn early. Bot calls run through new **server
actions** (`src/app/actions.ts`, `"use server"`) rather than being called
directly from the client component — `requestSpymasterClue` takes the full
`Card[]` server-side, `requestGuesserGuesses` only ever receives
`PublicCard[]` built by stripping `type`/keeping `word`+`revealed` in
`page.tsx` before the call, so the guesser bot's context boundary is
enforced at the network-payload level, not just by convention in the prompt
code.

**Bug found and fixed during first live smoke test:** `format: "json"` on
Ollama only guarantees syntactically-valid JSON somewhere in the output — it
does not stop a smaller model like `llama3.1:8b` from wrapping that JSON in
commentary (`{"RITUAL":", 3} -> This clue connects...`), which broke
`ollamaGenerate`'s `JSON.parse`. Fixed by widening
`OllamaGenerateOptions.format` to `"json" | Record<string, unknown>` and
having both bots pass an actual JSON Schema object (`RESPONSE_SCHEMA` in
each of `spymaster.ts`/`guesser.ts`) so Ollama's schema-constrained
structured output is used instead of the loose string mode — this is what
`CLAUDE.md` meant by "JSON-schema-constrained" and should have been used
from the start. Confirmed fixed via a throwaway `tsx` script (not committed)
that ran `getSpymasterClue`/`getGuesserGuesses` back-to-back against the
live Ollama server on `medium` difficulty for a few turns: clues came back
well-formed (`{ clue: 'HELICOPTER', number: 2 }`), guesses were correctly
filtered to real unrevealed board words, a wrong-team guess correctly ended
the turn, and `checkWinner` correctly detected the assassin loss.

`next build` and `tsc --noEmit` both pass. `next dev` was started and the
setup screen (`GameSetup`) was confirmed to render server-side via `curl`
("Codenames", "Your role", "Difficulty", "Start game" all present in the
HTML). **Not yet done:** an actual in-browser click-through of a full game
(human as Spymaster, human as Guesser, each difficulty level) — Playwright
isn't installed in this project, so the bot-loop logic was verified
end-to-end but the human-input paths (`ClueInput` submission,
board-click guessing, "Stop guessing") have only been read-reviewed, not
exercised in a live browser. Also note: the `hard`/`expert` difficulty
configs in `difficulty.ts` reference `qwen2.5:14b`, which is not currently
pulled on this machine (only `llama3.1:8b`, `qwen3.6:27b`,
`qwen2.5-coder:7b`, `gpt-oss:20b`, `qwen3-coder:30b`, `qwen3.6:27b-coding-nvfp4`
are available) — `hard`/`expert` will 404/error against Ollama until either
that model is pulled or the config is pointed at an installed one.

Section 3 (`spymaster.ts`/`guesser.ts`) calls
`ollamaGenerate` directly (not through the `/api/ollama/generate` proxy,
which is for client components) with per-difficulty system prompts keyed off
`systemPromptVariant`. Spymaster prompt hands the bot only its own team's
key-card knowledge (team words, opponent words, neutrals, assassin) built
from the full `Card[]`; guesser prompt is built from `PublicCard[]` (word +
revealed only) so it structurally cannot see team/assassin info — enforced
by type shape, not just prompt wording. Spymaster re-prompts up to 4 times
on `validateClue` failure or a non-integer/negative number, feeding the
rejection reason back into the next prompt; throws if still invalid after 4
attempts (no silent fallback — caller must handle the bot being unable to
produce a legal clue). Guesser response is filtered against the actual
unrevealed word list so hallucinated/already-revealed words returned by the
model can't leak through. Not yet tested against a live Ollama instance —
smoke-test both bots end-to-end before relying on them for real games.

Section 4 built the three UI components as plain, presentational components
(no game-state/Ollama calls inside them — that's Section 5's job):
`GameSetup` is self-contained with local `useState` for role/difficulty and
calls `onStart` on submit; `Board` takes `cards: Card[]` plus an optional
`revealTypes` prop (spymaster's own board should pass `true`, guesser view
should not) and an optional `onCardClick` for guess interactions — kept
additive to the original prop signature; `ClueInput` does a cheap
client-side single-word/non-negative-integer check before calling
`onSubmit`, with an optional `error` prop so Section 5 can surface a
`validateClue` rejection from the server side (the actual source of truth).
Verified by temporarily mounting all three in a throwaway `/dev-preview`
route with a generated board and `next dev`; confirmed the route
compiled/rendered with no console/server errors and the expected text
("Codenames", "Start game", "Give clue") appeared in the output, then
deleted the route — no automated visual/interaction test yet since
Playwright isn't installed in this project. `tsc --noEmit` passes. Next up:
Section 5 (wire `page.tsx` to drive the actual game loop and call the bots).

Note: `src/lib/game/board.ts`'s `generateBoard` now takes a `starterTeam: Team`
argument (the original stub had no params) so it can size the 9/8 split
correctly; `state.ts` picks a random starter team via `createInitialState`.
