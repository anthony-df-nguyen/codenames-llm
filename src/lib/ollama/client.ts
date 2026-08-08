// Thin wrapper around the local Ollama HTTP API (default http://localhost:11434).
// Structured JSON output only — no free-text parsing.

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";

export interface OllamaGenerateOptions {
  model: string;
  system: string;
  prompt: string;
  temperature: number;
  // "json" only guarantees syntactically valid JSON — smaller models (e.g.
  // llama3.1:8b) still wrap it in commentary. Pass a JSON Schema object to
  // get Ollama's actual schema-constrained structured output instead.
  format: "json" | Record<string, unknown>;
}

interface OllamaApiResponse {
  response: string;
}

export async function ollamaGenerate<T>(
  options: OllamaGenerateOptions
): Promise<T> {
  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options.model,
      system: options.system,
      prompt: options.prompt,
      format: options.format,
      stream: false,
      options: { temperature: options.temperature },
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Ollama request failed (${res.status}): ${await res.text()}`
    );
  }

  const data = (await res.json()) as OllamaApiResponse;

  try {
    return JSON.parse(data.response) as T;
  } catch {
    throw new Error(
      `Ollama returned non-JSON response despite format: "json": ${data.response}`
    );
  }
}
