import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isDataLabAdmin } from "@/lib/datalab-access";
import { createMagicAccessToken } from "@/lib/datalab-tokens";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDataLabAdmin(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const name = req.nextUrl.searchParams.get("name") ?? "";
  const email = req.nextUrl.searchParams.get("email") ?? "";
  const agentsParam = req.nextUrl.searchParams.get("agents") ?? "full";
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "7", 10);

  if (!name || !email) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const agentScope = agentsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const token = createMagicAccessToken(name, email, agentScope, days);

  const origin = process.env.NEXT_PUBLIC_URL
    ?? process.env.NEXTAUTH_URL
    ?? `https://${req.nextUrl.host}`;
  const magicUrl = `${origin}/api/datalab/magic?token=${encodeURIComponent(token)}`;

  return NextResponse.json({ magicUrl });
}
