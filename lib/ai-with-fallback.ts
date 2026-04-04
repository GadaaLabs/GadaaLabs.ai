import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// Ordered by quality → speed. All confirmed available on Groq as of 2025-04.
export const FALLBACK_MODELS = [
  "llama-3.3-70b-versatile",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen/qwen3-32b",
  "llama-3.1-8b-instant",
];

// ─── Rate-limit registry ──────────────────────────────────────────────────────
// Server-side map: model → UTC epoch ms when the limit resets.
const rateLimitRegistry = new Map<string, number>();

function isKnownRateLimited(model: string): boolean {
  const until = rateLimitRegistry.get(model);
  if (!until) return false;
  if (Date.now() >= until) { rateLimitRegistry.delete(model); return false; }
  return true;
}

function recordRateLimit(model: string, err: unknown) {
  const retryAfterRaw =
    (err as Record<string, Record<string, string>>)?.responseHeaders?.["retry-after"];
  const retryAfterSecs = retryAfterRaw ? parseInt(String(retryAfterRaw), 10) : 3600;
  rateLimitRegistry.set(model, Date.now() + retryAfterSecs * 1_000);
}

function isRateLimitError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as Record<string, unknown>;
  if (err.statusCode === 429) return true;
  const msg = String(err.message ?? "");
  return (
    msg.includes("rate_limit_exceeded") ||
    msg.includes("Rate limit") ||
    msg.includes("429")
  );
}

// Any error that means "this model can't serve this request" — skip it permanently
// in this request cycle (rate limits, decommissioned, not found, etc.)
function isSkippableError(e: unknown): boolean {
  if (isRateLimitError(e)) return true;
  const msg = String((e as Record<string, unknown>)?.message ?? "");
  return (
    msg.includes("decommissioned") ||
    msg.includes("no longer supported") ||
    msg.includes("deprecated") ||
    msg.includes("not found") ||
    msg.includes("does not exist") ||
    msg.includes("404")
  );
}

// ─── Stream one model — returns true on success, false on skippable error ─────
async function tryStream(
  model: string,
  params: Omit<Parameters<typeof streamText>[0], "model">,
  enqueue: (t: string) => void
): Promise<boolean> {
  try {
    const result = streamText({
      ...params,
      model: groq(model),
      maxRetries: 0,
    } as Parameters<typeof streamText>[0]);

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta") enqueue(chunk.text);
      else if (chunk.type === "error") throw chunk.error;
    }
    return true;
  } catch (e) {
    if (isRateLimitError(e)) recordRateLimit(model, e);
    if (isSkippableError(e)) return false;
    throw e; // real unexpected error — propagate
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function streamWithFallback(
  params: Omit<Parameters<typeof streamText>[0], "model">,
  preferredModel = FALLBACK_MODELS[0]
): Promise<Response> {
  // Build ordered model list: preferred first, then others
  const orderedModels =
    preferredModel === FALLBACK_MODELS[0]
      ? [...FALLBACK_MODELS]
      : [preferredModel, ...FALLBACK_MODELS.filter(m => m !== preferredModel)];

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const enqueue = (text: string) => controller.enqueue(encoder.encode(text));

      for (const model of orderedModels) {
        if (isKnownRateLimited(model)) continue;

        try {
          const ok = await tryStream(model, params, enqueue);
          if (ok) { controller.close(); return; }
          // Skippable error — try next model silently
        } catch (e) {
          // Unexpected error — surface it and stop
          const msg = (e as Error)?.message ?? "Unknown error";
          enqueue(`\n\n⚠️ Analysis error: ${msg}. Please try again.`);
          controller.close();
          return;
        }
      }

      // All models exhausted
      enqueue(
        "⚠️ All AI models are currently at capacity (free-tier token limits). " +
        "Please wait 1–2 minutes and try again — limits reset every minute/day."
      );
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export { groq };
