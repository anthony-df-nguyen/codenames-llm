# Claude Project Instructions — Codenames vs. Ollama Bots

## Project Overview

Building a local, solo-playable version of Codenames where I play against LLM-driven bots (Spymaster + Guesser) running through Ollama. Stack: Next.js App Router (React 19, Tailwind v4, framer-motion), server actions calling a local Ollama server. I'm a PM with a JS/React/Next.js background — assume that fluency, explain AI/prompting concepts where relevant since that's the newer territory for me.

The four goals below are implemented and playable end to end — treat this doc as the map of what exists, not a plan for what's next.

## Goals

1. Working local Next.js app implementing Codenames rules (board gen, turns, win/loss).
2. Ollama-backed Spymaster bot: sees the key card, gives a legal one-word clue + number.
3. Ollama-backed Guesser bot: sees only the public board + clue, selects/ranks guesses.
4. **Selectable human role.** At game start, I choose to play as either Spymaster or Guesser for my team. Bots fill every other seat:
   - If I'm Spymaster: I give the clue/number (via UI input), bot plays my team's Guesser.
   - If I'm Guesser: bot plays my team's Spymaster, I make the guesses.
   - The opposing team is always fully bot-controlled (bot Spymaster + bot Guesser) regardless of my role choice.

Difficulty levels (Easy/Medium/Hard/Expert) were dropped as a goal — see "Not currently implemented" below. In their place, the setup screen exposes a **model picker** (any locally-pulled Ollama model that supports `completion`) and an **"enable detailed logging"** toggle that records both bots' system prompts and reasoning for post-game transcript export.

## Architecture Decisions (locked in)

- **Game logic is deterministic, not LLM-driven.** Board setup, turn order, win/loss conditions, clue-legality checks all live in plain JS/TS — never delegate rules enforcement to the model.
- **Structured output only.** Ollama calls use a JSON-schema `format` for both Spymaster and Guesser responses via `/api/chat`. No free-text parsing (beyond a best-effort strip of stray `<think>` blocks / code fences some reasoning models still emit around the JSON).
  - Spymaster response shape: `{ "clue": string, "number": integer }`
  - Guesser response shape: `{ "rankedGuesses": string[], "stopGuessing": boolean }`
- **Strict separation of context.** The Guesser bot must never see the key card / team assignments in its prompt or context — no exceptions, even for debugging convenience. This holds regardless of which role I'm playing. Enforced structurally: `actions.ts`'s guesser entry point only accepts `PublicCard[]`.
- **Role selection is a pre-game setting**, not something that changes mid-game. Once a game starts, my role is fixed for that game.
- **Clue validation is code, not trust.** After the Spymaster bot responds, validate programmatically: single word, not a substring/superset of any board word, not previously used this game. Re-prompt (up to `MAX_ATTEMPTS`) on failure rather than assuming the model self-polices.

## Project Structure

```
src/
  app/
    page.tsx              Render only — all game logic lives in useCodenamesGame
    layout.tsx             Root layout, fonts, metadata
    actions.ts              Server actions: the ONLY client→bot boundary
    api/ollama/generate/   Same-origin Ollama proxy (currently unused; the app
                            reaches Ollama through server actions instead)
  hooks/
    useCodenamesGame.ts    The whole client-side game loop (see below)
  components/
    ui/                    Button, OptionButton — generic, game-agnostic
    board/                 Board (5x5 play grid), KeyCard (spymaster mini-map)
    clue/ClueInput          Human spymaster's clue + number form
    log/GameLog             Reverse-chronological move log
    setup/GameSetup         Pre-game role picker + model picker + logging toggle
    status/                 GameHeader, ClueBanner, BotStatus
  lib/
    game/                  Rules + session. No React, no LLM calls.
      types.ts             Card, Team, Clue, ClueRecord, GameState, PublicCard,
                            otherTeam/randomTeam/toPublicBoard
      state.ts             Turn transitions, win checks, validateClue, giveClue,
                            guessAllowance — the rules engine
      board.ts, words.ts   Board generation and the word pool
      session.ts           GameSession (client-side wrapper around GameState)
      botTurn.ts           Runs one bot-guesser turn as a plain async loop
      persistence.ts       localStorage save/load/clear for the session, plus
                            standalone model/logging preferences
      log.ts               LogEntry union + makeLogEntry (UI-facing move log)
      exportLog.ts          Formats state + log + system prompts into a plain-text
                            transcript for pasting into Claude for prompt tuning
    bots/
      spymaster.ts          Key-card-aware clue generation + re-prompt loop
      guesser.ts             Public-board-only guess ranking
    config/
      botConfig.ts           One fixed model/temperature/think/sampling config per
                              role (BASE_BOT_CONFIG) + withModelOverride() for the
                              setup screen's model picker
      system_prompts.ts      SPYMASTER_PROMPT / GUESSER_PROMPT — the actual system
                              prompt text (single source, both live here)
    ollama/client.ts         Thin /api/chat wrapper: schema-constrained output,
                              thinking-capability probe, model listing
    ui/styles.ts              Shared Tailwind tokens (team + card-type colors)
    utils.ts                   cn(), sleep()
logs/                          Manual scratch space for exported game transcripts
                                (untracked; not a source directory)
```

### Where things belong

- **`lib/game/` is the rules engine.** Anything that decides a legal move, a turn change, or a winner goes here — never in a component or hook. It imports no React and makes no LLM calls.
- **`useCodenamesGame` owns the loop**: session reducer, localStorage effects, the two bot-turn effects (each guarded by a `clue-N` / `guess-N` ref key so it fires once per clue), and the human move handlers. Components stay presentational; `page.tsx` should stay render-only.
- **`actions.ts` is the enforcement point for context separation.** The guesser action accepts `PublicCard[]`, so key-card data structurally cannot cross it. Use `toPublicBoard()` rather than hand-building that array.
- **`lib/config/system_prompts.ts` is the only place prompt text lives.** `botConfig.ts` wires prompts to model/sampling settings but never inlines prompt copy itself.
- **`lib/ui/styles.ts` owns color.** Team and card-type colors are defined once as `TEAM_STYLES` / `CARD_TYPE_STYLES`, keyed exhaustively by `Team` / `CardType`. Don't hardcode `text-red-500` etc. in a component — add a token.
- **One definition per concept.** `Clue`, `ClueRecord`, and `PublicCard` are single-sourced in `lib/game/types.ts`; bot response types reuse them rather than declaring parallel `Raw*` shapes. If a shape appears twice, hoist it.

## Not currently implemented

- **No difficulty levels.** There's a single fixed `BASE_BOT_CONFIG` (one model/temperature/prompt per role, currently `gpt-oss:20b` for both), overridable only by model via the setup screen's picker — not a tiered Easy/Medium/Hard/Expert system. If this comes back, it replaces `withModelOverride` with a difficulty→config table analogous to the old `config/difficulty.ts` plan.
- **`api/ollama/generate/route.ts` is unused** — same-origin proxy scaffolding kept in case client-side calls are ever needed, but the app currently reaches Ollama exclusively through server actions in `actions.ts`.

## Commands

- `yarn dev` — dev server (I usually already have one running on :3000)
- `yarn build` — production build, also the real typecheck
- `yarn lint` — eslint
- No test suite yet. Verify changes with `yarn build` plus a manual play-through.
- Bots need a local Ollama on `:11434` (override with `OLLAMA_HOST`); the UI works without it, but bot turns will log an error entry.

## Model Notes

- Currently on `gpt-oss:20b` for both roles by default, selectable per-game from any locally-pulled model that reports Ollama's `completion` capability.
- Calls go through `/api/chat` (not `/api/generate`) — needed for gpt-oss's Harmony chat template and to get chain-of-thought back separately via `message.thinking` instead of mixed into content.
- `think: "low"` is set for both roles on thinking-capable models (gpt-oss, qwen3, deepseek-r1, ...) — Ollama's default is effectively "high," which is too slow for a watchable game. Silently dropped for models that don't support it (probed once per model via `/api/show`, then cached).
- Spymaster: temperature 1.0, top_p 1.0 — gpt-oss's reference sampling config; pulling these down fights the Harmony reasoning format more than it helps.
- Guesser: temperature 0.3 — a literal matching/ranking task, not a creative one.
- Spymaster role is the harder prompting problem (needs broader associative reasoning) — if clue quality is weak, try a bigger model before over-engineering the prompt.
- "Enable detailed logging" on the setup screen is the intended feedback loop for tuning `system_prompts.ts`: when a logged game ends, `useCodenamesGame` builds the transcript (`exportLog.ts`) and writes it to `logs/` automatically via the `saveGameTranscript` server action in `actions.ts` — no manual copy/paste. Point me at the saved file when asking for prompt changes.

## How I Want Help in This Project

- Default to concise, direct answers — I'll ask for deep dives when I want them.
- When suggesting code, favor idiomatic modern Next.js/React (App Router assumed unless I say otherwise).
- When discussing prompt design for the bots, give concrete example prompts/schemas, not just abstract advice.
- Flag it clearly if a suggestion would blur the "game logic is code, not LLM" boundary — that's a deliberate design constraint, not an oversight.
- I'll paste in code, error messages, or Ollama output as we go — treat those as ground truth for current state, not the plan above.
