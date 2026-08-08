// Proxies structured-generation requests to the local Ollama server.
// Keeps the Ollama host/config server-side and gives client components a
// same-origin endpoint to call instead of hitting localhost:11434 directly.

import { NextResponse } from "next/server";
import { ollamaGenerate, type OllamaGenerateOptions } from "@/lib/ollama/client";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<OllamaGenerateOptions>;

  if (
    typeof body.model !== "string" ||
    typeof body.system !== "string" ||
    typeof body.prompt !== "string" ||
    typeof body.temperature !== "number" ||
    (body.format !== "json" && typeof body.format !== "object")
  ) {
    return NextResponse.json(
      { error: "Missing/invalid fields: model, system, prompt, temperature, format" },
      { status: 400 }
    );
  }

  try {
    const result = await ollamaGenerate(body as OllamaGenerateOptions);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ollama request failed" },
      { status: 502 }
    );
  }
}
