import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM = `You are DataLab, an expert data analyst AI at GadaaLabs.
You are given a structured summary of a dataset's columns and statistics.

Your job:
1. Identify data quality issues (high null rates, suspicious values, type mismatches)
2. Highlight interesting patterns, distributions, and outlier columns
3. Suggest the most useful visualisations for this specific dataset
4. Recommend concrete next steps for analysis
5. Flag any columns that may need cleaning before modelling

Format your response with clear Markdown headings (##). Be specific — cite column names and actual numbers from the statistics. Keep each section concise but actionable.`;

export async function POST(req: Request) {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "anonymous";

  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { summaryText, messages } = await req.json();

  if (!summaryText) {
    return new Response(JSON.stringify({ error: "Missing summaryText" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemWithData = `${SYSTEM}\n\n---\nDATASET SUMMARY:\n${summaryText}`;

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: systemWithData,
    messages: messages ?? [{ role: "user", content: "Please perform a complete EDA on this dataset." }],
    maxOutputTokens: 2048,
    temperature: 0.3,
  });

  return result.toTextStreamResponse();
}
