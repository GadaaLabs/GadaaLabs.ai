import { NextRequest, NextResponse } from "next/server";
import { addEmailPendingRequest, checkEmailRateLimit, type AgentScope } from "@/lib/datalab-access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email, reason, agentScope } = body as {
    name?: string;
    email?: string;
    reason?: string;
    agentScope?: string[];
  };

  if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
    return NextResponse.json({ error: "name is required (max 100 chars)" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Valid email is required (max 200 chars)" }, { status: 400 });
  }
  if (reason && (typeof reason !== "string" || reason.length > 300)) {
    return NextResponse.json({ error: "reason must be a string (max 300 chars)" }, { status: 400 });
  }

  const VALID_SCOPES = new Set<string>([
    "data-analyst", "visualization", "ml-expert",
    "feature-engineer", "nlp-expert", "time-series", "full",
  ]);
  const scope: AgentScope[] = Array.isArray(agentScope) && agentScope.length > 0
    ? agentScope.filter((s): s is AgentScope => typeof s === "string" && VALID_SCOPES.has(s))
    : ["full"];
  if (scope.length === 0) {
    return NextResponse.json({ error: "Invalid agentScope values" }, { status: 400 });
  }

  if (!checkEmailRateLimit(email.toLowerCase())) {
    return NextResponse.json(
      { error: "Too many requests. Max 3 per email per hour." },
      { status: 429 }
    );
  }

  addEmailPendingRequest({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    reason: reason?.trim(),
    agentScope: scope,
  });

  return NextResponse.json({ ok: true });
}
