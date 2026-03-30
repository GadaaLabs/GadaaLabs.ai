import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  isDataLabAdmin,
  getAllowedUsers,
  grantAccess,
  revokeAccess,
  getAccessCount,
} from "@/lib/datalab-access";

// ---------------------------------------------------------------------------
// GET /api/admin/datalab-access
// Returns the full list of users who have been granted DataLab access.
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDataLabAdmin(session.user.id)) {
    return NextResponse.json({ error: "Forbidden — admin access required" }, { status: 403 });
  }

  const users = getAllowedUsers();
  return NextResponse.json({ users, count: getAccessCount() });
}

// ---------------------------------------------------------------------------
// POST /api/admin/datalab-access
// Body: { action: 'grant' | 'revoke', userId: string, userName?: string, email?: string }
// ---------------------------------------------------------------------------

interface PostBody {
  action: "grant" | "revoke";
  userId: string;
  userName?: string;
  email?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDataLabAdmin(session.user.id)) {
    return NextResponse.json({ error: "Forbidden — admin access required" }, { status: 403 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, userId, userName, email } = body;

  if (!action || !userId) {
    return NextResponse.json(
      { error: "Missing required fields: action, userId" },
      { status: 400 }
    );
  }

  if (action === "grant") {
    if (!userName) {
      return NextResponse.json({ error: "userName is required for grant action" }, { status: 400 });
    }
    grantAccess(userId, userName, email, session.user.id);
    return NextResponse.json({
      success: true,
      message: `Access granted to ${userName} (${userId})`,
    });
  }

  if (action === "revoke") {
    revokeAccess(userId);
    return NextResponse.json({
      success: true,
      message: `Access revoked for user ${userId}`,
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
