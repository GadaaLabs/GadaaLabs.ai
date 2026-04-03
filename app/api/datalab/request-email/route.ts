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

  const trimmedName = name.trim();
  const trimmedEmail = email.toLowerCase().trim();
  const trimmedReason = reason?.trim();

  addEmailPendingRequest({
    name: trimmedName,
    email: trimmedEmail,
    reason: trimmedReason,
    agentScope: scope,
  });

  // Build a mailto URL so the admin is notified via email
  const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@gadaalabs.com";
  const origin = process.env.NEXT_PUBLIC_URL ?? process.env.NEXTAUTH_URL ?? "https://gadaalabs.com";
  const adminUrl = `${origin}/dashboard/admin`;

  const subject = encodeURIComponent(`DataLab Access Request — ${trimmedName}`);
  const bodyLines = [
    `New DataLab access request:`,
    ``,
    `Name:   ${trimmedName}`,
    `Email:  ${trimmedEmail}`,
    `Scope:  ${scope.join(", ")}`,
    trimmedReason ? `Reason: ${trimmedReason}` : "",
    ``,
    `Review and approve at: ${adminUrl}`,
  ].filter((l) => l !== null);
  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

  return NextResponse.json({ ok: true, mailtoUrl });
}
