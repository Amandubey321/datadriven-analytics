import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

// Free model on Groq with 128k context and high reasoning/structured JSON accuracy
const MODEL = "llama-3.3-70b-versatile";

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

/** Provider abstraction: Groq free models via OpenAI-compatible endpoint. */
export async function complete(system: string, prompt: string): Promise<string> {
  const apiKey = GROQ_API_KEY;
  if (!apiKey) throw new AiError("Groq API key is not configured.", 500);

  const provider = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });

  try {
    const result = await generateText({
      model: provider(MODEL),
      system,
      prompt,
      temperature: 0.1,
    });
    return result.text;
  } catch (failure: unknown) {
    console.error("Groq AI call failed:", failure);
    const status = (failure as { statusCode?: number; status?: number })?.statusCode ?? (failure as { status?: number })?.status ?? 500;
    if (status === 429) {
      throw new AiError("Groq rate limit reached. Please wait a moment and try again.", 429);
    }
    if (status === 401 || status === 403) {
      throw new AiError("Invalid Groq API key or unauthorized access.", status);
    }
    throw new AiError(
      failure instanceof Error ? failure.message : "The AI couldn't answer this. Try rephrasing.",
      status,
    );
  }
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