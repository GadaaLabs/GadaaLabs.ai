import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "anonymous";

  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { prompt, system, model, maxTokens, temperature } = await req.json();

  const result = streamText({
    model: groq(model ?? "llama-3.3-70b-versatile"),
    system: system ?? "You are a helpful AI engineering assistant.",
    prompt,
    maxOutputTokens: maxTokens ?? 1024,
    temperature: temperature ?? 0.7,
  });

  return result.toTextStreamResponse();
}
