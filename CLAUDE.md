# Claude Project Instructions — Codenames vs. Ollama Bots

## Project Overview

Building a local, solo-playable version of Codenames where I play against LLM-driven bots (Spymaster + Guesser) running through Ollama. Stack: Next.js (React), API routes calling a local Ollama server. I'm a PM with a JS/React/Next.js background — assume that fluency, explain AI/prompting concepts where relevant since that's the newer territory for me.

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

## Difficulty Levels

Difficulty tunes bot behavior, not the rules of the game. Applies to whichever bot role(s) are active given my chosen human role. Starting point for tuning — expect to adjust based on actual play testing:

| Level | Spymaster bot behavior | Guesser bot behavior |
|---|---|---|
| **Easy** | Conservative clues, low numbers (mostly 1-2), avoids risky/ambiguous associations, smaller/simpler model | Takes obvious/literal matches only, stops guessing early, doesn't reason about assassin risk deeply |
| **Medium** | Moderate numbers (2-3), reasonable associative leaps, occasional creative clue | Reasonable inference on ambiguous clues, sensible stop-guessing logic |
| **Hard** | Aggressive numbers (3-4+), clever/abstract associations, actively avoids near-assassin words, bigger model | Strong inference across the whole board, weighs assassin risk before guessing, better stop-guessing judgment |
| **Expert** | Maximally efficient clues, willing to take calculated risks for high-value turns, best available model, possibly higher token budget for reasoning before answering | Near-optimal guessing, reasons about probability across remaining board, minimal wasted guesses |

Implementation approach: difficulty should map to a config object (model name, temperature, system-prompt variant, and possibly a "reasoning budget" like extra chain-of-thought before the structured JSON call) rather than being hardcoded per-level in the calling code — keep it swappable so we can tune each level independently as we playtest.

## Model Notes

- Default to testing with Llama 3.1 8B or Qwen2.5 first.
- Spymaster role is the harder prompting problem (needs broader associative reasoning) — if clue quality is weak, try a bigger model (14B+) before over-engineering the prompt.
- Guesser role is easier and should work fine on smaller models.
- Model choice can itself be one of the difficulty knobs (e.g., Easy/Medium on a smaller model, Hard/Expert on a bigger one) rather than only changing prompts/temperature.

## How I Want Help in This Project

- Default to concise, direct answers — I'll ask for deep dives when I want them.
- When suggesting code, favor idiomatic modern Next.js/React (App Router assumed unless I say otherwise).
- When discussing prompt design for the bots, give concrete example prompts/schemas, not just abstract advice.
- Flag it clearly if a suggestion would blur the "game logic is code, not LLM" boundary — that's a deliberate design constraint, not an oversight.
- I'll paste in code, error messages, or Ollama output as we go — treat those as ground truth for current state, not the plan above.
