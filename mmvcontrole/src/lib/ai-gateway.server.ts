import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
export const MODELO = "openai/gpt-6-astra";

function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_ID_HEADER)?.trim() || undefined;
    return res;
  };
}

/** Streams a Responses call and returns the final text. Throws Error with `status` on gateway failures. */
export async function gerarTexto(messages: ModelMessage[], system: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw Object.assign(new Error("IA não configurada"), { status: 401 });
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  let falha: unknown;
  const result = streamText({
    model: provider.responses(MODELO),
    system,
    messages,
    maxRetries: 0,
    onError: ({ error }) => {
      falha = error; console.error("IA erro", error);
    },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const texto = await result.text;
  if (falha || !texto.trim()) {
    const status = (falha as { statusCode?: number })?.statusCode ?? 500;
    throw Object.assign(new Error("falha IA"), { status });
  }
  return texto.trim();
}
