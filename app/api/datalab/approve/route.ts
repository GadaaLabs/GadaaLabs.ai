/**
 * GET /api/datalab/approve?token=...
 *
 * The admin clicks this link from their email.
 * No login required — the signed token is the authorization.
 *
 * On success: grants access and returns a styled HTML confirmation page.
 * On failure: returns a styled HTML error page.
 */

import { NextRequest } from "next/server";
import { verifyApprovalToken } from "@/lib/datalab-tokens";
import { grantAccess, removePendingRequest, hasDataLabAccess } from "@/lib/datalab-access";

function html(title: string, body: string, success: boolean): Response {
  const color = success ? "#10b981" : "#ef4444";
  const bgAccent = success ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)";
  const borderColor = success ? "#10b981" : "#ef4444";
  const icon = success ? "✅" : "❌";

  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — GadaaLabs DataLab</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0a0a12;
      color: #f0f0ff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: #0f0f1a;
      border: 1px solid #1e1e2e;
      border-top: 3px solid ${borderColor};
      border-radius: 1.5rem;
      padding: 2.5rem 2rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; font-weight: 700; color: ${color}; margin-bottom: 0.75rem; }
    p { font-size: 0.95rem; color: #94a3b8; line-height: 1.6; margin-bottom: 1rem; }
    .detail {
      background: ${bgAccent};
      border: 1px solid ${borderColor}33;
      border-radius: 0.75rem;
      padding: 1rem;
      margin: 1.25rem 0;
      text-align: left;
    }
    .detail .row { display: flex; gap: 0.5rem; margin-bottom: 0.4rem; font-size: 0.875rem; }
    .detail .label { color: #64748b; min-width: 6rem; }
    .detail .value { color: #f0f0ff; font-weight: 500; word-break: break-all; }
    .env-box {
      background: #0a0a12;
      border: 1px solid #334155;
      border-radius: 0.75rem;
      padding: 1rem;
      margin-top: 1.25rem;
      text-align: left;
    }
    .env-box h3 { font-size: 0.8rem; color: #7c3aed; font-weight: 600; margin-bottom: 0.5rem; letter-spacing: 0.05em; text-transform: uppercase; }
    .env-box p { font-size: 0.8rem; color: #64748b; margin-bottom: 0.5rem; }
    .env-box code { font-family: "JetBrains Mono", "Fira Code", monospace; font-size: 0.75rem; color: #06b6d4; background: #1e1e2e; padding: 0.25rem 0.4rem; border-radius: 0.25rem; word-break: break-all; }
    a.btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #6d28d9, #7c3aed);
      color: #fff;
      font-weight: 600;
      font-size: 0.9rem;
      border-radius: 0.75rem;
      text-decoration: none;
      transition: opacity 0.15s;
    }
    a.btn:hover { opacity: 0.9; }
    .admin-link { margin-top: 1rem; font-size: 0.8rem; }
    .admin-link a { color: #7c3aed; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    ${body}
    <a class="btn" href="/">← Back to GadaaLabs</a>
    <p class="admin-link"><a href="/dashboard/admin">Open Admin Panel →</a></p>
  </div>
</body>
</html>`,
    {
      status: success ? 200 : 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return html(
      "Invalid Link",
      `<p>This approval link is missing its token. Please use the exact link from the request email.</p>`,
      false
    );
  }

  const result = verifyApprovalToken(token);

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      invalid:
        "This approval link is invalid or has been tampered with. Ask the user to submit a new access request.",
      expired:
        "This approval link has expired (links are valid for 7 days). Ask the user to submit a new access request.",
      used:
        "This approval link has already been used. The user may already have access.",
    };
    return html("Link Invalid", `<p>${messages[result.reason]}</p>`, false);
  }

  const { userId, userName, email } = result.payload;
  const alreadyHad = hasDataLabAccess(userId);

  // Grant access — "system-approval" as grantedBy since no admin session here
  grantAccess(userId, userName, email, "email-approval-link");
  removePendingRequest(userId);

  const expiresDate = new Date(result.payload.exp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const detail = `
    <div class="detail">
      <div class="row"><span class="label">Username</span><span class="value">${escapeHtml(userName)}</span></div>
      <div class="row"><span class="label">User ID</span><span class="value">${escapeHtml(userId)}</span></div>
      ${email ? `<div class="row"><span class="label">Email</span><span class="value">${escapeHtml(email)}</span></div>` : ""}
    </div>
    <div class="env-box">
      <h3>Make access permanent</h3>
      <p>This grant lives in server memory and resets on restart. To make it permanent, add the User ID to your environment variables:</p>
      <code>DATALAB_ALLOWED_IDS=...existing...,${escapeHtml(userId)}</code>
      <p style="margin-top:0.5rem">Update this in your <strong style="color:#f0f0ff">Vercel Dashboard → Settings → Environment Variables</strong>, then redeploy.</p>
    </div>`;

  return html(
    alreadyHad ? "Already Had Access" : "Access Granted",
    `<p>${alreadyHad ? `${escapeHtml(userName)} already had DataLab access. No change was made.` : `DataLab access has been granted to <strong style="color:#f0f0ff">${escapeHtml(userName)}</strong>.`}</p>
    ${detail}`,
    true
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
