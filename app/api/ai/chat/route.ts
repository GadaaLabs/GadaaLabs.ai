import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { streamWithFallback } from "@/lib/ai-with-fallback";

export async function POST(req: Request) {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "anonymous";

  const { allowed, remaining } = checkRateLimit(ip);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages, system } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const response = await streamWithFallback({
    system:
      system ??
      "You are a helpful AI engineering tutor at GadaaLabs. Give concise, accurate, technically precise answers. Use code examples when relevant.",
    messages,
    temperature: 0.7,
  });

  response.headers.set("X-RateLimit-Remaining", String(remaining));
  return response;
}
