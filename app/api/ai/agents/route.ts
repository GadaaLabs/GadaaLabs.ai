import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { AGENTS } from "@/lib/agents";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  // Rate limiting — higher limit for multi-agent endpoint (30/min)
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "anonymous";

  const { allowed } = checkRateLimit(ip, 30);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { agentId, summaryText, agentTask, previousOutputs } = await req.json();

  if (!agentId || !summaryText) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: agentId, summaryText" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const agent = AGENTS[agentId];
  if (!agent) {
    return new Response(
      JSON.stringify({ error: `Unknown agent: ${agentId}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build system content: agent system prompt + dataset context
  let systemContent =
    agent.systemPrompt + "\n\nDATASET SUMMARY:\n" + summaryText;

  // Inject prior agent outputs as context for specialist agents
  if (
    previousOutputs &&
    typeof previousOutputs === "object" &&
    Object.keys(previousOutputs).length > 0
  ) {
    const prevContext = Object.entries(previousOutputs)
      .map(
        ([id, output]) =>
          `=== ${AGENTS[id]?.name ?? id} Output ===\n${output}`
      )
      .join("\n\n");
    systemContent +=
      "\n\nOTHER AGENTS' OUTPUTS (use as context, do not repeat):\n" +
      prevContext;
  }

  const userMessage =
    agentTask?.trim() ||
    "Perform your expert analysis on this dataset. Be thorough, specific, and actionable.";

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: systemContent,
    messages: [{ role: "user", content: userMessage }],
    // Orchestrator only needs to output a JSON plan; specialists get more tokens
    maxOutputTokens: agentId === "orchestrator" ? 1024 : 3000,
    // Code generator benefits from lower temperature for deterministic, correct code
    temperature: agentId === "code-generator" ? 0.15 : 0.3,
  });

  return result.toTextStreamResponse();
}
