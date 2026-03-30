import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const PROMPT_ENGINEER_SYSTEM = `You are an expert Prompt Engineer with deep knowledge of how large language models think and respond.
Your job is to transform a user's raw, unstructured idea into a world-class expert prompt that will get the best possible output from any LLM.

A great prompt includes:
1. A clear role/persona for the LLM ("You are an expert X...")
2. Precise context and background
3. Clear task specification with output format
4. Constraints and edge cases to handle
5. Quality criteria for the output
6. Examples if helpful
7. Chain-of-thought instruction if complex reasoning is needed

Output format:
## Expert Prompt

[The enhanced, expert prompt ready to copy-paste]

## Why This Works
[3-4 bullet points explaining the key techniques used]

## Variations
[2 alternative versions — one shorter, one more specific]`;

export async function POST(req: Request) {
  // Rate limiting
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "anonymous";

  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { userInput, context, targetLLM } = await req.json();

  if (!userInput?.trim()) {
    return new Response(
      JSON.stringify({ error: "Missing required field: userInput" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build user message incorporating optional context and target LLM hints
  let userMessage = `Transform this raw idea into an expert-level prompt:\n\n"${userInput.trim()}"`;

  if (context?.trim()) {
    userMessage += `\n\nAdditional context: ${context.trim()}`;
  }

  if (targetLLM?.trim()) {
    userMessage += `\n\nTarget LLM / system: ${targetLLM.trim()} — optimise the prompt for this model's strengths.`;
  }

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: PROMPT_ENGINEER_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
    maxOutputTokens: 2048,
    temperature: 0.4,
  });

  return result.toTextStreamResponse();
}
