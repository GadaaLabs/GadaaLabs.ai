import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasDataLabAccess } from "@/lib/datalab-access";
import { DataLabShell } from "@/components/datalab/DataLabShell";
import { RequestAccessButton } from "@/components/datalab/RequestAccessButton";
import { FlaskConical, Lock, GitBranch } from "lucide-react";

export const metadata: Metadata = {
  title: "DataLab",
  description:
    "AI-powered data analysis agent. Upload a CSV or Excel file and get instant statistics, charts, and AI-driven EDA insights.",
};

export default async function DataLabPage() {
  const session = await auth();

  // 1. Not signed in — redirect to sign-in
  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/datalab");
  }

  const userId = session.user.id;
  const userName = session.user.name ?? session.user.email ?? userId;

  // 2. Signed in but no DataLab access — show access-required page
  if (!hasDataLabAccess(userId)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 py-16"
        style={{ background: "var(--color-bg-base)" }}
      >
        <div className="w-full max-w-lg">
          {/* Lock icon */}
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

          {/* Title */}
          <h1
            className="text-3xl font-bold text-center mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            DataLab —{" "}
            <span className="gradient-text">Premium Access Required</span>
          </h1>
          <p
            className="text-center mb-8"
            style={{ color: "var(--color-text-secondary)" }}
          >
            DataLab is our premier AI data science platform. Access is granted by the GadaaLabs team.
          </p>

          {/* Signed-in-as card */}
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-3"
            style={{
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            {session.user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={userName}
                className="h-10 w-10 rounded-full"
                style={{ border: "2px solid var(--color-purple-600)" }}
              />
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
            <div
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
              style={{
                background: "var(--color-bg-elevated)",
                color: "var(--color-text-muted)",
              }}
            >
              <GitBranch className="h-3 w-3" />
              <span>GitHub</span>
            </div>
          </div>

          {/* Request access card */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            <h2
              className="text-lg font-semibold mb-1"
              style={{ color: "var(--color-text-primary)" }}
            >
              Request Access
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
              Send us a quick email — your request will include a one-click approval link so the
              admin can grant access instantly without any copy-pasting.
            </p>

            {/* Pre-filled info */}
            <div className="space-y-3 mb-5">
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  GitHub Username
                </label>
                <div
                  className="rounded-xl px-3 py-2 text-sm font-mono"
                  style={{
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border-default)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {userName}
                </div>
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  GitHub User ID
                </label>
                <div
                  className="rounded-xl px-3 py-2 text-sm font-mono"
                  style={{
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border-default)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {userId}
                </div>
              </div>
            </div>

            <RequestAccessButton />

            <p className="text-xs text-center mt-4" style={{ color: "var(--color-text-muted)" }}>
              Or reach out on{" "}
              <a
                href="https://github.com/gadaalabs"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-purple-400)" }}
              >
                GitHub
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Has access — render the full DataLab interface
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, var(--color-purple-700), var(--color-cyan-600))",
            }}
          >
            <FlaskConical className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              DataLab <span className="gradient-text">Agent</span>
            </h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Upload any CSV or Excel file — get instant stats, charts, and AI-powered insights.
            </p>
          </div>
        </div>
      </div>

      <DataLabShell />
    </div>
  );
}
