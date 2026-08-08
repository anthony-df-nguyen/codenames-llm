# Codenames vs. Ollama Bots

A local, solo-playable Codenames game where you play against LLM-driven bots
(Spymaster and/or Guesser) running through [Ollama](https://ollama.com).
Game rules and turn logic are plain TypeScript; only clue-giving and
guessing are delegated to an LLM.

## Prerequisites

- Node.js 18+
- [Yarn](https://classic.yarnpkg.com/) (this project uses Yarn, not npm)
- [Ollama](https://ollama.com) installed and running locally

Start Ollama and pull the default model before running the app:

```bash
ollama serve
```

```bash
ollama pull llama3.1:8b
```

The app expects Ollama's API at `http://localhost:11434` (Ollama's default).
Difficulty levels may use other models (see `src/lib/config/difficulty.ts`) —
pull those as needed, e.g.:

```bash
ollama pull qwen2.5:14b
```

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
    setup/          Role + difficulty selection screen
  lib/
    game/           Deterministic game logic (board gen, turns, win/loss) — no LLM involvement
    ollama/         Ollama HTTP client wrapper (structured JSON output)
    bots/           Spymaster and Guesser bot modules (separate context, never shared)
    config/         Difficulty configs (model/temperature/prompt per bot role)
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
