# Claude Project Instructions — Codenames vs. Ollama Bots

## Project Overview

Building a local, solo-playable version of Codenames where I play against LLM-driven bots (Spymaster + Guesser) running through Ollama. Stack: Next.js App Router (React 19, Tailwind v4, framer-motion), server actions calling a local Ollama server. I'm a PM with a JS/React/Next.js background — assume that fluency, explain AI/prompting concepts where relevant since that's the newer territory for me.

All five goals below are implemented and playable end to end — treat this doc as the map of what exists, not a plan for what's next.

## Goals

1. Working local Next.js app implementing Codenames rules (board gen, turns, win/loss).
2. Ollama-backed Spymaster bot: sees the key card, gives a legal one-word clue + number.
3. Ollama-backed Guesser bot: sees only the public board + clue, selects/ranks guesses.
4. **Selectable human role.** At game start, I choose to play as either Spymaster or Guesser for my team. Bots fill every other seat:
   - If I'm Spymaster: I give the clue/number (via UI input), bot plays my team's Guesser.
   - If I'm Guesser: bot plays my team's Spymaster, I make the guesses.
   - The opposing team is always fully bot-controlled (bot Spymaster + bot Guesser) regardless of my role choice.
5. **Difficulty levels** (Easy / Medium / Hard / Expert) that tune bot behavior — see below.

## Architecture Decisions (locked in)

- **Game logic is deterministic, not LLM-driven.** Board setup, turn order, win/loss conditions, clue-legality checks all live in plain JS/TS — never delegate rules enforcement to the model.
- **Structured output only.** Ollama calls use `format: "json"` (JSON-schema-constrained) for both Spymaster and Guesser responses. No free-text parsing.
  - Spymaster response shape: `{ "clue": string, "number": integer }`
  - Guesser response shape: ranked list of board words + a "stop guessing" signal
- **Strict separation of context.** The Guesser bot must never see the key card / team assignments in its prompt or context — no exceptions, even for debugging convenience. This holds regardless of which role I'm playing.
- **Role selection is a pre-game setting**, not something that changes mid-game. Once a game starts, my role and the difficulty level are fixed for that game.
- **Clue validation is code, not trust.** After the Spymaster bot responds, validate programmatically: single word, not a substring/superset of any board word, not previously used this game. Re-prompt on failure rather than assuming the model self-polices.

## Project Structure

```
src/
  app/
    page.tsx              Render only — all game logic lives in useCodenamesGame
    layout.tsx            Root layout, fonts, metadata
    actions.ts            Server actions: the ONLY client→bot boundary
    api/ollama/generate/  Same-origin Ollama proxy (currently unused; the app
                          reaches Ollama through server actions instead)
  hooks/
    useCodenamesGame.ts   The whole client-side game loop (see below)
  components/
    ui/                   Button, OptionButton — generic, game-agnostic
    board/                Board (5x5 play grid), KeyCard (spymaster mini-map)
    clue/ClueInput        Human spymaster's clue + number form
    log/GameLog           Reverse-chronological move log
    setup/GameSetup       Pre-game role + difficulty picker
    status/               GameHeader, ClueBanner, BotStatus
  lib/
    game/                 Rules + session. No React, no LLM calls.
      types.ts            Card, Team, Clue, ClueRecord, GameState, PublicCard,
                          otherTeam/randomTeam/toPublicBoard
      state.ts            Turn transitions, win checks, validateClue, giveClue,
                          guessAllowance — the rules engine
      board.ts, words.ts  Board generation and the word pool
      session.ts          GameSession (client-side wrapper around GameState)
      botTurn.ts          Runs one bot-guesser turn as a plain async loop
      persistence.ts      localStorage save/load/clear
      log.ts              LogEntry union + makeLogEntry
    bots/
      spymaster.ts        Key-card-aware clue generation + re-prompt loop
      guesser.ts          Public-board-only guess ranking
      prompts.ts          Variant selection helper — deliberately NO prompt text
    config/difficulty.ts  Difficulty → per-role model/temperature/prompt config
    ollama/client.ts      Thin fetch wrapper, schema-constrained output
    ui/styles.ts          Shared Tailwind tokens (team + card-type colors)
    utils.ts              cn(), sleep()
```

### Where things belong

- **`lib/game/` is the rules engine.** Anything that decides a legal move, a turn change, or a winner goes here — never in a component or hook. It imports no React and makes no LLM calls.
- **`useCodenamesGame` owns the loop**: session reducer, localStorage effects, the two bot-turn effects (each guarded by a `clue-N` / `guess-N` ref key so it fires once per clue), and the human move handlers. Components stay presentational; `page.tsx` should stay render-only.
- **`actions.ts` is the enforcement point for context separation.** The guesser action accepts `PublicCard[]`, so key-card data structurally cannot cross it. Use `toPublicBoard()` rather than hand-building that array.
- **`lib/ui/styles.ts` owns color.** Team and card-type colors are defined once as `TEAM_STYLES` / `CARD_TYPE_STYLES`, keyed exhaustively by `Team` / `CardType`. Don't hardcode `text-red-500` etc. in a component — add a token.
- **One definition per concept.** `Clue`, `ClueRecord`, and `PublicCard` are single-sourced in `lib/game/types.ts`; bot response types reuse them rather than declaring parallel `Raw*` shapes. If a shape appears twice, hoist it.

## Difficulty Levels

Difficulty tunes bot behavior, not the rules of the game. Applies to whichever bot role(s) are active given my chosen human role. Starting point for tuning — expect to adjust based on actual play testing:

| Level | Spymaster bot behavior | Guesser bot behavior |
|---|---|---|
| **Easy** | Conservative clues, low numbers (mostly 1-2), avoids risky/ambiguous associations, smaller/simpler model | Takes obvious/literal matches only, stops guessing early, doesn't reason about assassin risk deeply |
| **Medium** | Moderate numbers (2-3), reasonable associative leaps, occasional creative clue | Reasonable inference on ambiguous clues, sensible stop-guessing logic |
| **Hard** | Aggressive numbers (3-4+), clever/abstract associations, actively avoids near-assassin words, bigger model | Strong inference across the whole board, weighs assassin risk before guessing, better stop-guessing judgment |
| **Expert** | Maximally efficient clues, willing to take calculated risks for high-value turns, best available model, possibly higher token budget for reasoning before answering | Near-optimal guessing, reasons about probability across remaining board, minimal wasted guesses |

Implemented in `lib/config/difficulty.ts` as `DIFFICULTY_CONFIGS: Record<Difficulty, { spymaster, guesser }>`, each role carrying `model`, `temperature`, `systemPromptVariant`, and optional `reasoningBudget`. The UI's difficulty picker derives its options from that map's keys, so a level can't be offered without a config behind it. Tune levels by editing this file — never by branching on difficulty in calling code. Prompt text for each variant lives with its bot (`bots/spymaster.ts`, `bots/guesser.ts`), kept apart so the two roles' prompts can't cross-contaminate.

Current state: all four levels run `llama3.1:8b` and differ only by temperature and prompt variant; `reasoningBudget` is set for expert spymaster but not yet consumed. Model-per-level is the next knob to actually turn.

## Commands

- `yarn dev` — dev server (I usually already have one running on :3000)
- `yarn build` — production build, also the real typecheck
- `yarn lint` — eslint
- No test suite yet. Verify changes with `yarn build` plus a manual play-through.
- Bots need a local Ollama on `:11434` (override with `OLLAMA_HOST`); the UI works without it, but bot turns will log an error entry.

## Model Notes

- Currently on Llama 3.1 8B across the board; Qwen2.5 is the other one worth trying.
- Spymaster role is the harder prompting problem (needs broader associative reasoning) — if clue quality is weak, try a bigger model (14B+) before over-engineering the prompt.
- Guesser role is easier and should work fine on smaller models.
- Model choice can itself be one of the difficulty knobs (e.g., Easy/Medium on a smaller model, Hard/Expert on a bigger one) rather than only changing prompts/temperature.

## How I Want Help in This Project

- Default to concise, direct answers — I'll ask for deep dives when I want them.
- When suggesting code, favor idiomatic modern Next.js/React (App Router assumed unless I say otherwise).
- When discussing prompt design for the bots, give concrete example prompts/schemas, not just abstract advice.
- Flag it clearly if a suggestion would blur the "game logic is code, not LLM" boundary — that's a deliberate design constraint, not an oversight.
- I'll paste in code, error messages, or Ollama output as we go — treat those as ground truth for current state, not the plan above.
