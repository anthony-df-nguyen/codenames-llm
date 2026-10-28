# Codenames vs. Claude Bots

A local, solo-playable Codenames game where you play against LLM-driven bots
(Spymaster and/or Guesser) powered by Claude through the `claude` CLI.
Game rules and turn logic are plain TypeScript; only clue-giving and
guessing are delegated to an LLM.

## Prerequisites

- Node.js 18+
- [Yarn](https://classic.yarnpkg.com/) (this project uses Yarn, not npm)
- [Claude Code](https://claude.com/claude-code) installed and logged in
  (`claude login`) — the bots run through the CLI, no API key needed

## Setup

```bash
yarn install
```

## Development

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/              Next.js App Router pages
  components/
    board/          Board rendering
    clue/           Clue input (human spymaster)
    setup/          Role + model selection screen
  lib/
    game/           Deterministic game logic (board gen, turns, win/loss) — no LLM involvement
    claude/         Claude CLI wrapper (structured JSON output) + model list
    bots/           Spymaster and Guesser bot modules (separate context, never shared)
    config/         Bot config + system prompts (model/prompt per bot role)
```

See [CLAUDE.md](./CLAUDE.md) for full project context, architecture
decisions, and the difficulty tuning matrix.

## Scripts

```bash
yarn dev      # start dev server
yarn build    # production build
yarn start    # run production build
yarn lint     # lint
```
