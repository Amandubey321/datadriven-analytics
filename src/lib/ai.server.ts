import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const MODEL = "openai/gpt-6-astra";

export class AiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Provider abstraction: swap this function to change AI vendor. */
export async function complete(system: string, prompt: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("AI is not configured for this app.", 500);
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  let failure: unknown;
  const result = streamText({
    model: provider.responses(MODEL),
    system,
    prompt,
    onError: ({ error }) => { failure = error; },
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
  });
  let text = "";
  try {
    text = await result.text;
  } catch (e) {
    failure = failure ?? e;
  }
  if (failure || !text) {
    const status = (failure as { statusCode?: number })?.statusCode ?? 500;
    console.error("AI call failed", failure);
    if (status === 429) throw new AiError("The AI is busy right now. Please wait a moment and try again.", 429);
    if (status === 402) throw new AiError("AI credits have run out. Add credits in Settings → Plans & credits to continue.", 402);
    if (status === 403) throw new AiError("AI access is blocked for this workspace.", 403);
    throw new AiError(text ? "The AI returned an error." : "The AI couldn't answer this. Try rephrasing.", status);
  }
  return text;
}

export function extractJSON(text: string): unknown {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = m ? m[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(body);
}
