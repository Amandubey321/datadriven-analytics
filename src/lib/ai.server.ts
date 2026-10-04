import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

// Free models on Groq in priority order (llama-3.1-8b-instant is ultra-fast with high free-tier rate limits)
const FREE_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "gemma2-9b-it",
] as const;

const GRO<dyad-write path="src/lib/ai.server.ts" description="Switch to llama-3.1-8b-instant with fallback to other free Groq models">
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

// Free models on Groq in priority order (llama-3.1-8b-instant is ultra-fast with high free-tier rate limits)
const FREE_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "gemma2-9b-it",
] as const;

const GROQ_API_KEY =
  process.env["GROQ_API_KEY"] ||
  "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";

export class AiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Provider abstraction: Groq free models via OpenAI-compatible endpoint with automatic fallback. */
export async function complete(system: string, prompt: string): Promise<string> {
  const apiKey = GROQ_API_KEY;
  if (!apiKey) throw new AiError("Groq API key is not configured.", 500);

  const provider = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });

  let lastError: unknown = null;

  for (const model of FREE_MODELS) {
    try {
      const result = await generateText({
        model: provider(model),
        system,
        prompt,
        temperature: 0.1,
      });
      return result.text;
    } catch (failure: unknown) {
      console.warn(`Groq model ${model} failed, checking next model:`, failure);
      lastError = failure;
      const status =
        (failure as { statusCode?: number; status?: number })?.statusCode ??
        (failure as { status?: number })?.status ??
        500;

      // If invalid key, no point in retrying other models
      if (status === 401 || status === 403) {
        throw new AiError("Invalid Groq API key or unauthorized access.", status);
      }
    }
  }

  const finalStatus =
    (lastError as { statusCode?: number; status?: number })?.statusCode ??
    (lastError as { status?: number })?.status ??
    500;

  if (finalStatus === 429) {
    throw new AiError("Groq rate limit reached across available free models. Please wait a moment and try again.", 429);
  }

  throw new AiError(
    lastError instanceof Error ? lastError.message : "The AI couldn't answer this. Try rephrasing.",
    finalStatus,
  );
}

export function extractJSON(text: string): unknown {
  try {
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = m ? m[1].trim() : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1).trim();
    return JSON.parse(body);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("Could not parse JSON from AI response.");
  }
}