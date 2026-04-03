import { NextRequest, NextResponse } from "next/server";
import { verifyMagicToken } from "@/lib/datalab-tokens";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse(errorHtml("Missing token."), {
      status: 400, headers: { "Content-Type": "text/html" },
    });
  }

  const result = verifyMagicToken(token);

  if (!result.ok) {
    const msg = result.reason === "expired"
      ? "This link has expired. Please request a new one."
      : "Invalid access link. Please contact the GadaaLabs team.";
    return new NextResponse(errorHtml(msg), {
      status: 400, headers: { "Content-Type": "text/html" },
    });
  }

  const response = NextResponse.redirect(new URL("/datalab?access=granted", req.nextUrl.origin));
  response.cookies.set("datalab_magic", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: Math.max(0, Math.floor((result.payload.exp - Date.now()) / 1000)),
    path: "/",
  });
  return response;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Access Error</title>
<style>body{font-family:system-ui;background:#06060e;color:#e8edf5;display:flex;
align-items:center;justify-content:center;min-height:100vh;margin:0;}
.card{background:#0c0c18;border:1px solid rgba(255,255,255,0.07);border-radius:14px;
padding:32px;max-width:420px;text-align:center;}
h1{color:#fb7185;font-size:20px;margin:0 0 12px;}
p{color:#9ba8bc;font-size:14px;}
a{color:#8b5cf6;}</style></head>
<body><div class="card"><h1>Access Error</h1><p>${escHtml(message)}</p>
<p><a href="/datalab">← Back to DataLab</a></p></div></body></html>`;
}
