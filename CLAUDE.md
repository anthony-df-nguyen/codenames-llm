# Claude Project Instructions — Codenames vs. Claude Bots

## Project Overview

Building a local, solo-playable version of Codenames where I play against LLM-driven bots (Spymaster + Guesser) powered by Claude via the local `claude` CLI. Stack: Next.js App Router (React 19, Tailwind v4, framer-motion), server actions spawning `claude -p`. I'm a PM with a JS/React/Next.js background — assume that fluency, explain AI/prompting concepts where relevant since that's the newer territory for me.

The four goals below are implemented and playable end to end — treat this doc as the map of what exists, not a plan for what's next.

## Goals

1. Working local Next.js app implementing Codenames rules (board gen, turns, win/loss).
2. Claude-backed Spymaster bot: sees the key card, gives a legal one-word clue + number.
3. Claude-backed Guesser bot: sees only the public board + clue, selects/ranks guesses.
4. **Selectable human role.** At game start, I choose to play as either Spymaster or Guesser for my team. Bots fill every other seat:
   - If I'm Spymaster: I give the clue/number (via UI input), bot plays my team's Guesser.
   - If I'm Guesser: bot plays my team's Spymaster, I make the guesses.
   - The opposing team is always fully bot-controlled (bot Spymaster + bot Guesser) regardless of my role choice.

Difficulty (Easy/Medium/Hard) applies to the opposing team only — see "Not currently implemented" below. The setup screen also exposes a **model picker** (Claude `haiku` / `sonnet` / `opus` aliases) and an **"enable detailed logging"** toggle that records both bots' system prompts for post-game transcript export (the CLI returns no reasoning text).

## Architecture Decisions (locked in)

- **Game logic is deterministic, not LLM-driven.** Board setup, turn order, win/loss conditions, clue-legality checks all live in plain JS/TS — never delegate rules enforcement to the model.
- **Structured output only.** Claude calls use the CLI's `--json-schema` for both Spymaster and Guesser responses; the validated object comes back in `structured_output`. No free-text parsing.
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
    api/                   (none — the app reaches Claude only through server actions)
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
      botConfig.ts           One fixed model + system prompt per role (BASE_BOT_CONFIG)
                              + withModelOverride() for the setup screen's model picker
      difficulty.ts          Opponent difficulty levels + their handicap knobs
      system_prompts.ts      SPYMASTER_PROMPT / GUESSER_PROMPT — the actual system
                              prompt text (single source, both live here)
    claude/client.ts         Spawns the `claude` CLI headless: schema-constrained JSON in/out
    claude/models.ts         CLAUDE_MODELS aliases, DEFAULT_MODEL, parseModel()
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

- **Difficulty is opponent-only.** Easy/Medium/Hard (`lib/config/difficulty.ts`) applies only to the team the human is NOT on; the human's teammate bot always plays at full strength. Handicaps are code-side, not prompt-side: a clue-number cap, a random pick among N ranked candidate clues (still run through `validateClue`), and a chance to swap the guesser's top two picks. Both teams use the model chosen in the setup picker.

## Commands

- `yarn dev` — dev server (I usually already have one running on :3000)
- `yarn build` — production build, also the real typecheck
- `yarn lint` — eslint
- No test suite yet. Verify changes with `yarn build` plus a manual play-through.
- Bots need the `claude` CLI installed and logged in (`claude login`); the UI works without it, but bot turns will log an error entry.

## Model Notes

- Default is `sonnet` for both roles, selectable per-game: `haiku` (fastest), `sonnet`, `opus` (strongest).
- Calls spawn `claude -p` from an empty temp dir with tools, MCP, skills, sessions and settings all disabled (see `claude/client.ts`) — the bot sees only our system prompt + user prompt, and each call costs ~1k input tokens instead of ~75k of Claude Code scaffolding.
- The CLI exposes no temperature/sampling/thinking knobs and withholds thinking text, so there's no per-role tuning besides model and prompt, and no bot reasoning in the log.
- Spymaster role is the harder prompting problem (needs broader associative reasoning) — if clue quality is weak, try a bigger model before over-engineering the prompt.
- "Enable detailed logging" on the setup screen is the intended feedback loop for tuning `system_prompts.ts`: when a logged game ends, `useCodenamesGame` builds the transcript (`exportLog.ts`) and writes it to `logs/` automatically via the `saveGameTranscript` server action in `actions.ts` — no manual copy/paste. Point me at the saved file when asking for prompt changes.

## How I Want Help in This Project

- Default to concise, direct answers — I'll ask for deep dives when I want them.
- When suggesting code, favor idiomatic modern Next.js/React (App Router assumed unless I say otherwise).
- When discussing prompt design for the bots, give concrete example prompts/schemas, not just abstract advice.
- Flag it clearly if a suggestion would blur the "game logic is code, not LLM" boundary — that's a deliberate design constraint, not an oversight.
- I'll paste in code, error messages, or CLI output as we go — treat those as ground truth for current state, not the plan above.
