import type { Metadata } from "next";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { hasDataLabAccess } from "@/lib/datalab-access";
import { verifyMagicToken } from "@/lib/datalab-tokens";
import { DataLabShell } from "@/components/datalab/DataLabShell";
import { FlaskConical, Lock, GitBranch } from "lucide-react";
import { AccessTabSwitcher } from "@/components/datalab/AccessTabSwitcher";

export const metadata: Metadata = {
  title: "DataLab",
  description: "AI-powered data analysis agent.",
};

export default async function DataLabPage() {
  const session = await auth();
  const cookieStore = await cookies();
  const magicCookie = cookieStore.get("datalab_magic");
  const magicResult = magicCookie ? verifyMagicToken(magicCookie.value) : null;
  const magicValid = magicResult?.ok === true;

  const userId = session?.user?.id;
  const hasGitHubAccess = userId ? hasDataLabAccess(userId) : false;
  const canAccess = hasGitHubAccess || magicValid;

  // Signed in but no access
  if (!canAccess) {
    const userName = session?.user?.name ?? session?.user?.email ?? userId ?? "";
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 py-16"
        style={{ background: "var(--color-bg-base)" }}
      >
        <div className="w-full max-w-lg">
          <div className="flex justify-center mb-6">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, var(--color-purple-800), var(--color-purple-600))",
                boxShadow: "var(--glow-purple)",
              }}
            >
              <Lock className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2" style={{ color: "var(--color-text-primary)" }}>
            DataLab —{" "}
            <span className="gradient-text">Premium Access Required</span>
          </h1>
          <p className="text-center mb-8" style={{ color: "var(--color-text-secondary)" }}>
            DataLab is our premier AI data science platform. Access is granted by the GadaaLabs team.
          </p>

          {session?.user && (
            <div
              className="rounded-2xl p-4 mb-6 flex items-center gap-3"
              style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
            >
              {session.user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt={userName}
                  className="h-10 w-10 rounded-full"
                  style={{ border: "2px solid var(--color-purple-600)" }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                  Signed in as <span style={{ color: "var(--color-purple-400)" }}>{userName}</span>
                </p>
                {session.user.email && (
                  <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                    {session.user.email}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-muted)" }}>
                <GitBranch className="h-3 w-3" />
                <span>GitHub</span>
              </div>
            </div>
          )}

          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
          >
            <AccessTabSwitcher />
          </div>
        </div>
      </div>
    );
  }

  // Has access — render DataLab
  const displayName = magicValid && magicResult?.ok
    ? magicResult.payload.name
    : (session?.user?.name ?? session?.user?.email ?? "");

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, var(--color-purple-700), var(--color-cyan-600))" }}
          >
            <FlaskConical className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              DataLab <span className="gradient-text">Agent</span>
            </h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {displayName ? `Welcome, ${displayName} · ` : ""}
              Upload any CSV or Excel file — get instant stats, charts, and AI-powered insights.
            </p>
          </div>
        </div>
      </div>
      <DataLabShell />
    </div>
  );
}
