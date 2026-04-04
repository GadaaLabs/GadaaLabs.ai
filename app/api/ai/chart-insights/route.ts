import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { streamWithFallback } from "@/lib/ai-with-fallback";

const SYSTEM = `You are a Principal Data Scientist generating chart-specific insights for an EDA dashboard.

You will receive dataset column statistics and correlation data.
Generate a precise, specific insight for EACH column listed.

Rules:
- Cite EXACT numbers (means, percentages, r-values) from the statistics provided
- Each insight must state: (1) the key finding, (2) its modeling implication, (3) the recommended action
- Maximum 2 sentences per column
- NO generic advice — every insight must be specific to this column's numbers
- For correlations, reference the specific correlated column by name

Output format — use EXACTLY this format, one line per column:
INSIGHT[column_name]: insight text here

Do not output anything else. No headers, no markdown, no explanations outside the INSIGHT lines.`;

export async function POST(req: Request) {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "anonymous";

  const { allowed } = checkRateLimit(ip, 10);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please wait a minute." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { summaryText?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { summaryText } = body;
  if (!summaryText || typeof summaryText !== "string") {
    return new Response(
      JSON.stringify({ error: "Missing summaryText" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  return streamWithFallback({
    system: SYSTEM,
    messages: [{
      role: "user",
      content: `Generate INSIGHT lines for every column in this dataset.\n\n${summaryText}`,
    }],
    maxOutputTokens: 2000,
    temperature: 0.2,
  });
}
