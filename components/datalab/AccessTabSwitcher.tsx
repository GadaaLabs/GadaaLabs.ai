"use client";
import { useState } from "react";
import { GitBranch, Mail } from "lucide-react";
import { RequestAccessButton } from "./RequestAccessButton";
import { EmailRequestForm } from "./EmailRequestForm";

export function AccessTabSwitcher() {
  const [tab, setTab] = useState<"github" | "email">("github");

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
        Request Access
      </h2>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, background: "var(--color-bg-elevated)",
        borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {[
          { id: "github" as const, label: "GitHub Account", Icon: GitBranch },
          { id: "email" as const, label: "Email Request", Icon: Mail },
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

      {tab === "github" && (
        <div>
          <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
            Send a one-click approval email — the admin can grant access instantly.
          </p>
          <RequestAccessButton />
        </div>
      )}

      {tab === "email" && <EmailRequestForm />}
    </div>
  );
}
