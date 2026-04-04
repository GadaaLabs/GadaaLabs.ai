import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// Models tried in order when the primary hits a rate limit
export const FALLBACK_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
];

// ─── Server-side rate-limit registry ─────────────────────────────────────────
// Tracks which models are known to be rate-limited and when they reset.
// Persists across requests for the lifetime of the server process.
// ─────────────────────────────────────────────────────────────────────────────
const rateLimitRegistry = new Map<string, number>(); // model → UTC epoch ms reset time

function isKnownRateLimited(model: string): boolean {
  const until = rateLimitRegistry.get(model);
  if (!until) return false;
  if (Date.now() >= until) {
    rateLimitRegistry.delete(model);
    return false;
  }
  return true;
}

function recordRateLimit(model: string, err: unknown) {
  // Try to read retry-after from Groq response headers (seconds)
  const retryAfterRaw =
    (err as Record<string, any>)?.responseHeaders?.["retry-after"];
  const retryAfterSecs = retryAfterRaw ? parseInt(String(retryAfterRaw), 10) : 3600;
  rateLimitRegistry.set(model, Date.now() + retryAfterSecs * 1_000);
}

function isRateLimitError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as Record<string, unknown>;
  if (err.statusCode === 429) return true;
  const msg = String(err.message ?? "");
  return msg.includes("rate_limit_exceeded") || msg.includes("Rate limit");
}

// ─── Pick the best available model ───────────────────────────────────────────
function pickModel(orderedModels: string[]): string {
  for (const m of orderedModels) {
    if (!isKnownRateLimited(m)) return m;
  }
  // All known rate-limited — return the one whose limit resets soonest
  return orderedModels.reduce((best, m) =>
    (rateLimitRegistry.get(m) ?? 0) < (rateLimitRegistry.get(best) ?? 0) ? m : best
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Stream text with automatic model fallback on 429 rate-limit errors.
 *
 * Strategy:
 *  1. Use the server-side registry to skip models we already know are rate-limited.
 *  2. Stream with the chosen model using the AI SDK's native toTextStreamResponse().
 *  3. If the chosen model STILL returns a rate-limit error (race condition),
 *     record it in the registry and send the user a friendly retry message so
 *     the next request will automatically use the next available model.
 */
export async function streamWithFallback(
  params: Omit<Parameters<typeof streamText>[0], "model">,
  preferredModel = FALLBACK_MODELS[0]
): Promise<Response> {
  const orderedModels =
    preferredModel === FALLBACK_MODELS[0]
      ? [...FALLBACK_MODELS]
      : [preferredModel, ...FALLBACK_MODELS.filter((m) => m !== preferredModel)];

  const model = pickModel(orderedModels);

  // Build a plain-text streaming response using the AI SDK natively.
  // If we hit a rate limit during the stream, record it so future requests
  // skip this model, and surface a friendly message to the user.
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const enqueue = (text: string) =>
        controller.enqueue(encoder.encode(text));

      try {
        const result = streamText({
          ...params,
          model: groq(model),
          maxRetries: 0, // Fail fast — we handle retries ourselves via the registry
        } as Parameters<typeof streamText>[0]);

        for await (const chunk of result.fullStream) {
          if (chunk.type === "text-delta") {
            enqueue(chunk.text);
          } else if (chunk.type === "error") {
            throw chunk.error;
          }
        }
        controller.close();
      } catch (e) {
        if (isRateLimitError(e)) {
          recordRateLimit(model, e);
          // Try the next model immediately in the same request
          const nextModel = orderedModels.find(
            (m) => m !== model && !isKnownRateLimited(m)
          );
          if (nextModel) {
            try {
              const fallback = streamText({
                ...params,
                model: groq(nextModel),
                maxRetries: 0,
              } as Parameters<typeof streamText>[0]);

              for await (const chunk of fallback.fullStream) {
                if (chunk.type === "text-delta") {
                  enqueue(chunk.text);
                } else if (chunk.type === "error") {
                  throw chunk.error;
                }
              }
              controller.close();
              return;
            } catch (e2) {
              if (isRateLimitError(e2)) recordRateLimit(nextModel, e2);
            }
          }
          // All models exhausted — tell the user to retry (next request will use cached fallback)
          enqueue(
            "⚠️ AI models are currently at capacity. Please resend your message — " +
              "the next request will automatically use a backup model."
          );
          controller.close();
        } else {
          controller.error(e);
        }
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export { groq };
