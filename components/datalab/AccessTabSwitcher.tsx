"use client";
import { useState } from "react";
import { GitBranch, Mail, LogIn } from "lucide-react";
import { RequestAccessButton } from "./RequestAccessButton";
import { EmailRequestForm } from "./EmailRequestForm";

interface Props {
  isSignedIn?: boolean;
}

export function AccessTabSwitcher({ isSignedIn = false }: Props) {
  // Default to email tab — works for everyone without sign-in
  const [tab, setTab] = useState<"github" | "email">("email");

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
        Request Access
      </h2>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, background: "var(--color-bg-elevated)",
        borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {[
          { id: "email" as const, label: "Email Request", Icon: Mail },
          { id: "github" as const, label: "GitHub Account", Icon: GitBranch },
        ].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", border: "none", transition: "all 0.15s",
              background: tab === id ? "var(--color-bg-surface)" : "transparent",
              color: tab === id ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {tab === "email" && <EmailRequestForm />}

      {tab === "github" && (
        <div>
          {isSignedIn ? (
            <>
              <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
                Linked to your GitHub account — the admin can approve access with one click.
              </p>
              <RequestAccessButton />
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
              <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
                Sign in with GitHub first, then request access with your account linked.
              </p>
              <a
                href={`/api/auth/signin?callbackUrl=${encodeURIComponent("/datalab")}`}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  gap: 8, padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: "linear-gradient(135deg, var(--color-purple-700), var(--color-purple-600))",
                  color: "#fff", textDecoration: "none",
                }}
              >
                <LogIn size={14} />
                Sign in with GitHub
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
