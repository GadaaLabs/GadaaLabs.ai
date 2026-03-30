import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { EXPERT_AGENTS } from "@/lib/agents";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "anonymous";

  const { allowed } = checkRateLimit(ip, 20);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { agentId, messages, documentText } = (await req.json()) as {
    agentId: string;
    messages: { role: "user" | "assistant"; content: string }[];
    documentText?: string;
  };

  if (!agentId || !messages?.length) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: agentId, messages" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const agent = EXPERT_AGENTS[agentId];
  if (!agent) {
    return new Response(
      JSON.stringify({ error: `Unknown expert agent: ${agentId}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let systemContent = agent.systemPrompt;
  if (documentText?.trim()) {
    systemContent += `\n\n${"─".repeat(60)}\nDOCUMENT / CONTEXT PROVIDED BY USER:\n${"─".repeat(60)}\n${documentText.slice(0, 12000)}`;
  }

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: systemContent,
    messages,
    maxOutputTokens: 4096,
    temperature: agentId === "electrical-engineer" ? 0.2 : 0.35,
  });

  return result.toTextStreamResponse();
}
