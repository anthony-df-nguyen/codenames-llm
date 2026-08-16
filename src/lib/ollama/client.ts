// Thin wrapper around the local Ollama HTTP API (default http://localhost:11434).
// Structured JSON output only — no free-text parsing.

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";

// Logs bot chain-of-thought to the console for prompt tuning when running
// locally; suppressed in deployed environments. APP_ENV (from .env) is an
// explicit override for local testing; otherwise falls back to NODE_ENV,
// which Vercel sets to "production" on every deploy with no config needed.
const IS_LOCAL = process.env.APP_ENV
  ? process.env.APP_ENV !== "production"
  : process.env.NODE_ENV !== "production";

export interface OllamaGenerateOptions {
  model: string;
  system: string;
  prompt: string;
  temperature: number;
  format: "json" | Record<string, unknown>;
  // Reasoning effort hint for thinking models (gpt-oss, qwen3, deepseek-r1,
  // ...) — keeps them from spending several seconds deliberating before
  // every clue/guess. Only sent to models that report the "thinking"
  // capability (see supportsThinking below); silently dropped for models
  // that don't, since the user can pick any model they've pulled and most
  // don't support this field at all.
  think?: "low" | "medium" | "high";
  // Optional extra sampling params. Unlike `think`, these are generic
  // llama.cpp options that every model accepts — no capability probe needed.
  // Omitted fields simply fall back to Ollama's own defaults.
  topK?: number;
  topP?: number;
  repeatPenalty?: number;
}

interface OllamaChatResponse {
  message: { content: string; thinking?: string };
  /** Total server-side time for the request, in nanoseconds. */
  total_duration?: number;
}

interface OllamaTagsResponse {
  models: { name: string; capabilities?: string[] }[];
}

interface OllamaShowResponse {
  capabilities?: string[];
}

// Model capabilities don't change mid-session, so a model's thinking support
// is worth caching rather than re-querying /api/show on every bot call.
const thinkingCapabilityCache = new Map<string, boolean>();

async function supportsThinking(model: string): Promise<boolean> {
  const cached = thinkingCapabilityCache.get(model);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as OllamaShowResponse;
    const supported = Boolean(data.capabilities?.includes("thinking"));
    thinkingCapabilityCache.set(model, supported);
    return supported;
  } catch {
    // Unknown model or unreachable Ollama — let the main request surface the
    // real error rather than failing here on a capability probe.
    return false;
  }
}

/**
 * Names of models currently pulled in the local Ollama install, filtered to
 * ones that support "completion" (i.e. usable via /api/chat). This is a
 * text-only game, so no other capability (vision, tools, thinking) matters —
 * but embedding-only models report no "completion" and would fail every
 * request, so they're excluded here rather than left to fail at call time.
 */
export async function listOllamaModels(): Promise<string[]> {
  const res = await fetch(`${OLLAMA_HOST}/api/tags`);

  if (!res.ok) {
    throw new Error(
      `Ollama request failed (${res.status}): ${await res.text()}`
    );
  }

  const data = (await res.json()) as OllamaTagsResponse;
  return data.models
    .filter((m) => m.capabilities?.includes("completion"))
    .map((m) => m.name);
}

/**
 * Strip a leading <think>...</think> block (and any stray whitespace/code
 * fences around it) that reasoning models — e.g. gpt-oss, qwen3 — can still
 * emit inline even with format: <schema>, then isolate the outermost {...}.
 */
function extractJson(raw: string): string {
  const withoutThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const start = withoutThink.indexOf("{");
  const end = withoutThink.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return withoutThink;
  return withoutThink.slice(start, end + 1);
}

export interface OllamaGenerateResult<T> {
  data: T;
  /** Chain-of-thought from thinking-capable models (see `think` above); absent otherwise. */
  thinking?: string;
  /** Wall-clock time the request took, in milliseconds. */
  durationMs: number;
}

export async function ollamaGenerate<T>(
  options: OllamaGenerateOptions
): Promise<OllamaGenerateResult<T>> {
  // /api/chat (not /api/generate) — /api/generate's separate system/prompt
  // fields don't reliably drive chat-templated models (e.g. gpt-oss's
  // Harmony format), which can come back with an empty response. /api/chat
  // applies the model's chat template correctly and, for reasoning models,
  // returns chain-of-thought separately in message.thinking rather than
  // mixed into message.content.
  const think =
    options.think && (await supportsThinking(options.model))
      ? options.think
      : undefined;

  const startedAt = Date.now();
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options.model,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.prompt },
      ],
      format: options.format,
      stream: false,
      options: {
        temperature: options.temperature,
        ...(options.topK !== undefined ? { top_k: options.topK } : {}),
        ...(options.topP !== undefined ? { top_p: options.topP } : {}),
        ...(options.repeatPenalty !== undefined
          ? { repeat_penalty: options.repeatPenalty }
          : {}),
      },
      ...(think ? { think } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Ollama request failed (${res.status}): ${await res.text()}`
    );
  }

  const data = (await res.json()) as OllamaChatResponse;
  const content = data.message.content;
  const thinking = data.message.thinking || undefined;
  // Prefer Ollama's own server-side timing (total_duration, in nanoseconds)
  // when available — it excludes HTTP round-trip overhead; fall back to wall
  // clock for older Ollama versions that omit it.
  const durationMs =
    data.total_duration !== undefined
      ? data.total_duration / 1e6
      : Date.now() - startedAt;

  // Local-only: also surface chain-of-thought for reasoning models (qwen3,
  // gpt-oss, deepseek-r1, ...) to the console for prompt tuning. Non-reasoning
  // models (e.g. llama3.1:8b) simply won't populate message.thinking. Gated by
  // APP_ENV so production deployments don't leak reasoning traces to logs.
  // The UI surfaces the same value via the returned `thinking` field.
  // if (IS_LOCAL && thinking) {
  //   console.log(
  //     `\n--- [ollama thinking] ${options.model} ---\n${thinking}\n--- [end thinking] ---\n`
  //   );
  // }

  try {
    return { data: JSON.parse(content) as T, thinking, durationMs };
  } catch {
    try {
      return { data: JSON.parse(extractJson(content)) as T, thinking, durationMs };
    } catch {
      throw new Error(
        `Ollama returned non-JSON response despite format: "json": ${content}`
      );
    }
  }
}
