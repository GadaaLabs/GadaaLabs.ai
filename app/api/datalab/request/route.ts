/**
 * POST /api/datalab/request
 *
 * Called when a signed-in user clicks "Request Access".
 * Generates a HMAC-signed approval token and returns a pre-built mailto URL
 * whose body already contains the one-click approval link.
 *
 * The admin receives the email, clicks "Approve Access", and the user is
 * granted DataLab access — no manual copy-pasting of IDs required.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createApprovalToken } from "@/lib/datalab-tokens";
import { addPendingRequest, hasDataLabAccess } from "@/lib/datalab-access";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@gadaalabs.com";

export async function POST(req: NextRequest) {
  const session = await auth();

  // Must be signed in to request access
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = session.user.id;
  const userName = session.user.name ?? session.user.email ?? userId;
  const email = session.user.email ?? undefined;

  // If the user already has access, no need for a request
  if (hasDataLabAccess(userId)) {
    return NextResponse.json({ error: "You already have access" }, { status: 409 });
  }

  // Build the signed approval token
  const token = createApprovalToken({ userId, userName, email });

  // Build the absolute approval URL
  const origin =
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";
  const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`;
  const approvalUrl = `${baseUrl}/api/datalab/approve?token=${encodeURIComponent(token)}`;

  // Store the pending request so it shows up in the admin dashboard
  addPendingRequest({
    userId,
    userName,
    email,
    requestedAt: Date.now(),
    approvalUrl,
  });

  // Build the mailto URL with all details pre-filled
  const subject = encodeURIComponent(`DataLab Access Request — ${userName}`);
  const body = encodeURIComponent(
    [
      `Hi GadaaLabs team,`,
      ``,
      `I'd like to request access to DataLab.`,
      ``,
      `GitHub Username: ${userName}`,
      `GitHub User ID:  ${userId}`,
      email ? `Email:           ${email}` : "",
      ``,
      `──────────────────────────────────────────`,
      `ONE-CLICK APPROVAL LINK (valid 7 days):`,
      ``,
      approvalUrl,
      ``,
      `Click the link above to instantly grant access — no copy-pasting required.`,
      `──────────────────────────────────────────`,
      ``,
      `Thanks!`,
    ]
      .filter((l) => l !== null)
      .join("\n")
  );

  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

  return NextResponse.json({ mailtoUrl, approvalUrl });
}
