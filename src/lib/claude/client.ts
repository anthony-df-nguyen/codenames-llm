// Claude via the locally-installed `claude` CLI (Claude Code) in headless mode.
// Authenticates with whatever the CLI is logged into (e.g. a Claude Pro/Max
// subscription via `claude login`) — no API key involved. Schema-constrained
// JSON in, parsed JSON out.

import { spawn } from "child_process";
import { mkdir } from "fs/promises";
import os from "os";
import path from "path";


export interface ClaudeGenerateOptions {
  /** CLI model alias, e.g. "sonnet". */
  model: string;
  system: string;
  prompt: string;
  format: Record<string, unknown>;
}

export interface ClaudeGenerateResult<T> {
  data: T;
  durationMs: number;
}

interface ClaudeCliResult {
  is_error?: boolean;
  result?: string;
  structured_output?: unknown;
  duration_ms?: number;
}

// Run from an empty directory so the CLI doesn't auto-discover this project's
// CLAUDE.md (or any other project context) — the bots must only see the
// prompt we hand them.
const CLAUDE_CWD = path.join(os.tmpdir(), "codenames-claude");
const TIMEOUT_MS = 120_000;

export async function claudeGenerate<T>(
  options: ClaudeGenerateOptions
): Promise<ClaudeGenerateResult<T>> {
  await mkdir(CLAUDE_CWD, { recursive: true });

  const args = [
    "-p",
    "--model", options.model,
    "--system-prompt", options.system,
    "--json-schema", JSON.stringify(options.format),
    "--output-format", "json",
    // Pure text-in/JSON-out: no tools, no MCP servers, no skills, no saved
    // sessions, no user/project settings. Cuts a one-line request from ~75k
    // input tokens of Claude Code scaffolding to ~1k, which matters on a
    // subscription's usage limits.
    "--tools", "",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--setting-sources", "",
    "--no-session-persistence",
  ];

  // An ANTHROPIC_API_KEY in the environment would make the CLI bill the API
  // instead of using the logged-in subscription.
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;

  const startedAt = Date.now();
  const stdout = await new Promise<string>((resolve, reject) => {
    const child = spawn("claude", args, { cwd: CLAUDE_CWD, env });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Claude CLI timed out after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);

    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(
        new Error(
          `Couldn't run the \`claude\` CLI (${e.message}). Is Claude Code installed and logged in?`
        )
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(`Claude CLI exited ${code}: ${(err || out).trim()}`));
    });

    // Prompt goes over stdin rather than argv to sidestep argument-length limits.
    child.stdin.end(options.prompt);
  });

  let parsed: ClaudeCliResult;
  try {
    parsed = JSON.parse(stdout) as ClaudeCliResult;
  } catch {
    throw new Error(`Claude CLI returned non-JSON output: ${stdout.slice(0, 500)}`);
  }
  if (parsed.is_error) {
    throw new Error(`Claude CLI error: ${parsed.result ?? "unknown"}`);
  }

  // --json-schema puts the validated object in `structured_output`; `result`
  // is the text fallback.
  let data = parsed.structured_output;
  if (data === undefined && parsed.result) {
    try {
      data = JSON.parse(parsed.result);
    } catch {
      throw new Error(`Claude returned no structured output: ${parsed.result}`);
    }
  }
  if (data === undefined) throw new Error("Claude returned no structured output");

  return {
    data: data as T,
    durationMs: parsed.duration_ms ?? Date.now() - startedAt,
  };
}
