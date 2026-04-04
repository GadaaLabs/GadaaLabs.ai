import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { streamWithFallback } from "@/lib/ai-with-fallback";

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

  const { prompt, system, maxTokens, temperature } = await req.json();

  return streamWithFallback({
    system: system ?? "You are a helpful AI engineering assistant.",
    prompt,
    maxOutputTokens: maxTokens ?? 1024,
    temperature: temperature ?? 0.7,
  });
}
