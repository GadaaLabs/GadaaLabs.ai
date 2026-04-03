"use client";
import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";

type AgentScope = "data-analyst" | "visualization" | "ml-expert" | "feature-engineer" | "nlp-expert" | "time-series" | "full";

const AGENT_OPTIONS: { id: AgentScope; label: string }[] = [
  { id: "data-analyst", label: "Data Analyst" },
  { id: "visualization", label: "Visualization" },
  { id: "ml-expert", label: "ML Expert" },
  { id: "feature-engineer", label: "Feature Engineer" },
  { id: "nlp-expert", label: "NLP Expert" },
  { id: "time-series", label: "Time Series" },
  { id: "full", label: "Full Access — All Agents" },
];

type State = "idle" | "loading" | "success" | "error";

export function EmailRequestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<AgentScope[]>(["full"]);
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function toggleScope(id: AgentScope) {
    if (id === "full") {
      setScope(["full"]);
      return;
    }
    setScope((prev) => {
      const without = prev.filter((s) => s !== "full");
      if (without.includes(id)) {
        const next = without.filter((s) => s !== id);
        return next.length === 0 ? ["full"] : next;
      }
      return [...without, id];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/datalab/request-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, reason, agentScope: scope }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        setState("success");
      } else {
        setState("error");
        setErrorMsg(data.error ?? "Something went wrong.");
      }
    } catch {
      setState("error");
      setErrorMsg("Network error — please try again.");
    }
  }

  if (state === "success") {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%",
            background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={22} color="#34d399" />
          </div>
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#e8edf5", marginBottom: 6 }}>
          Request received
        </p>
        <p style={{ fontSize: 13, color: "#9ba8bc" }}>
          You&apos;ll receive an access link at <strong style={{ color: "#e8edf5" }}>{email}</strong> within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600,
          color: "#5c6a80", marginBottom: 4 }}>Full Name *</label>
        <input required value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={{ width: "100%", background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-default)", borderRadius: 10,
            padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
            outline: "none", boxSizing: "border-box" }} />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600,
          color: "#5c6a80", marginBottom: 4 }}>Email Address *</label>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ width: "100%", background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-default)", borderRadius: 10,
            padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
            outline: "none", boxSizing: "border-box" }} />
      </div>

      {/* Agent scope selector */}
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600,
          color: "#5c6a80", marginBottom: 8 }}>Access Scope</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
          {AGENT_OPTIONS.map(({ id, label }) => {
            const isSelected = scope.includes(id);
            return (
              <button key={id} type="button" onClick={() => toggleScope(id)}
                style={{ padding: "7px 10px", borderRadius: 8, fontSize: 11,
                  fontWeight: isSelected ? 600 : 400, cursor: "pointer",
                  background: isSelected ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isSelected ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.07)"}`,
                  color: isSelected ? "#8b5cf6" : "#9ba8bc",
                  gridColumn: id === "full" ? "1 / -1" : undefined }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600,
          color: "#5c6a80", marginBottom: 4 }}>
          Reason for access <span style={{ color: "#3a4558" }}>(optional)</span>
        </label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)}
          maxLength={300} rows={3} placeholder="Brief description of your use case..."
          style={{ width: "100%", background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-default)", borderRadius: 10,
            padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
            outline: "none", resize: "vertical", boxSizing: "border-box",
            fontFamily: "inherit" }} />
        <p style={{ fontSize: 10, color: "#3a4558", marginTop: 2, textAlign: "right" }}>
          {reason.length}/300
        </p>
      </div>

      {state === "error" && (
        <p style={{ fontSize: 12, color: "#fb7185", background: "rgba(251,113,133,0.08)",
          border: "1px solid rgba(251,113,133,0.25)", borderRadius: 8, padding: "8px 10px", margin: 0 }}>
          {errorMsg}
        </p>
      )}

      <button type="submit" disabled={state === "loading"}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          cursor: state === "loading" ? "not-allowed" : "pointer",
          background: "linear-gradient(135deg, var(--color-purple-700), var(--color-purple-600))",
          color: "#fff", border: "none", opacity: state === "loading" ? 0.7 : 1 }}>
        {state === "loading" ? (
          <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>
        ) : (
          <><Mail size={14} /> Request Access</>
        )}
      </button>
    </form>
  );
}
