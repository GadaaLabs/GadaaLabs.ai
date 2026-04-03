"use client";

/**
 * /dashboard/admin — DataLab Access Management
 *
 * Features:
 * - Pending requests panel with one-click Approve / Dismiss
 * - Manual grant form
 * - Revocable user table
 * - Env var setup guide (including how to find your own GitHub user ID)
 */

import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  Users,
  UserPlus,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bell,
  ExternalLink,
  Copy,
  Check,
  Mail,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DataLabUser {
  userId: string;
  userName: string;
  email?: string;
  grantedAt: number;
  grantedBy: string;
}

interface PendingRequest {
  userId: string;
  userName: string;
  email?: string;
  requestedAt: number;
  approvalUrl: string;
}

interface EmailPendingRequest {
  type: "email";
  id: string;
  name: string;
  email: string;
  reason?: string;
  agentScope: string[];
  requestedAt: number;
}

type StatusMessage = { type: "success" | "error"; text: string } | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="ml-2 rounded p-1 transition-opacity hover:opacity-80"
      style={{ color: copied ? "var(--color-success)" : "var(--color-text-muted)" }}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{
        background: "var(--color-bg-surface)",
        border: `1px solid ${accent ? "rgba(124,58,237,0.4)" : "var(--color-border-default)"}`,
        boxShadow: accent ? "0 0 0 3px rgba(124,58,237,0.06)" : undefined,
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
        style={{ background: "var(--color-bg-elevated)" }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          {value}
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CopyMagicLinkButton
// ---------------------------------------------------------------------------

function CopyMagicLinkButton({ req, onDismiss }: { req: EmailPendingRequest; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleCopy() {
    setLoading(true);
    setFailed(false);
    try {
      const agents = req.agentScope.join(",");
      const url = `/api/admin/datalab-access/magic-link?name=${encodeURIComponent(req.name)}&email=${encodeURIComponent(req.email)}&agents=${encodeURIComponent(agents)}&days=7`;
      const res = await fetch(url);
      const data = (await res.json()) as { magicUrl?: string; error?: string };
      if (data.magicUrl) {
        await navigator.clipboard.writeText(data.magicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <button
        onClick={() => void handleCopy()}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{
          background: failed ? "rgba(251,113,133,0.12)" : "rgba(52,211,153,0.12)",
          border: `1px solid ${failed ? "rgba(251,113,133,0.3)" : "rgba(52,211,153,0.3)"}`,
          color: failed ? "#fb7185" : "#34d399",
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {loading ? "…" : copied ? "Copied!" : failed ? "Failed" : "Copy 7-day link"}
      </button>
      <button
        onClick={() => void onDismiss()}
        className="text-xs rounded-md px-2 py-1 transition-opacity hover:opacity-80"
        style={{ background: "transparent", border: "none", color: "var(--color-text-disabled)", cursor: "pointer" }}
      >
        Dismiss
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminDataLabPage() {
  const [users, setUsers] = useState<DataLabUser[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [emailPending, setEmailPending] = useState<EmailPendingRequest[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusMessage>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [denying, setDenying] = useState<string | null>(null);

  // Grant form
  const [grantUserId, setGrantUserId] = useState("");
  const [grantUserName, setGrantUserName] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [granting, setGranting] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/datalab-access");
      if (res.status === 403) {
        setStatus({ type: "error", text: "Access denied — you need DATALAB_ADMIN_IDS set with your GitHub user ID. See setup guide below." });
        return;
      }
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as {
        users: DataLabUser[];
        count: number;
        pending: PendingRequest[];
        emailPending: EmailPendingRequest[];
      };
      setUsers(data.users);
      setCount(data.count);
      setPending(data.pending ?? []);
      setEmailPending(data.emailPending ?? []);
    } catch {
      setStatus({ type: "error", text: "Could not load. Are you signed in as an admin?" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // ---------------------------------------------------------------------------
  // Approve pending request (admin clicks from dashboard)
  // ---------------------------------------------------------------------------

  async function handleApprove(req: PendingRequest) {
    setApproving(req.userId);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/datalab-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant",
          userId: req.userId,
          userName: req.userName,
          email: req.email,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setStatus({ type: "success", text: `Access granted to ${req.userName}. Remember to add their ID to DATALAB_ALLOWED_IDS for persistence.` });
        await fetchUsers();
      } else {
        setStatus({ type: "error", text: data.error ?? "Failed to grant access." });
      }
    } catch {
      setStatus({ type: "error", text: "Network error." });
    } finally {
      setApproving(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Deny / dismiss pending request
  // ---------------------------------------------------------------------------

  async function handleDeny(req: PendingRequest) {
    setDenying(req.userId);
    setStatus(null);
    try {
      await fetch("/api/admin/datalab-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deny", userId: req.userId }),
      });
      await fetchUsers();
    } finally {
      setDenying(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Dismiss email request
  // ---------------------------------------------------------------------------

  async function dismissEmailRequest(id: string) {
    const res = await fetch("/api/admin/datalab-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deny-email", userId: id }),
    });
    if (res.ok) {
      setEmailPending((prev) => prev.filter((r) => r.id !== id));
    }
  }

  // ---------------------------------------------------------------------------
  // Manual grant
  // ---------------------------------------------------------------------------

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    if (!grantUserId.trim() || !grantUserName.trim()) return;
    setGranting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/datalab-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant",
          userId: grantUserId.trim(),
          userName: grantUserName.trim(),
          email: grantEmail.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (data.success) {
        setStatus({ type: "success", text: data.message ?? "Access granted." });
        setGrantUserId(""); setGrantUserName(""); setGrantEmail("");
        await fetchUsers();
      } else {
        setStatus({ type: "error", text: data.error ?? "Failed." });
      }
    } catch {
      setStatus({ type: "error", text: "Network error." });
    } finally {
      setGranting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Revoke
  // ---------------------------------------------------------------------------

  async function handleRevoke(userId: string, userName: string) {
    if (!confirm(`Revoke DataLab access for ${userName}?`)) return;
    setStatus(null);
    try {
      const res = await fetch("/api/admin/datalab-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", userId }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setStatus({ type: "success", text: `Access revoked for ${userName}.` });
        await fetchUsers();
      } else {
        setStatus({ type: "error", text: data.error ?? "Failed." });
      }
    } catch {
      setStatus({ type: "error", text: "Network error." });
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">

      {/* Page header */}
      <div
        className="flex items-center gap-4 mb-8 pb-6"
        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--color-purple-800), var(--color-purple-600))",
            boxShadow: "var(--glow-purple)",
          }}
        >
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            DataLab Access Management
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Approve requests, grant or revoke access, manage allowed users.
          </p>
        </div>
        <button
          onClick={() => void fetchUsers()}
          disabled={loading}
          className="ml-auto flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-opacity hover:opacity-80"
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-default)",
            color: "var(--color-text-secondary)",
          }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Status banner */}
      {status && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3 mb-6 text-sm"
          style={{
            background: status.type === "success" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${status.type === "success" ? "#10b981" : "#ef4444"}44`,
            color: status.type === "success" ? "#10b981" : "#ef4444",
          }}
        >
          {status.type === "success" ? (
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          <span className="flex-1">{status.text}</span>
          <button onClick={() => setStatus(null)} className="opacity-60 hover:opacity-100 ml-2">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Users with access"
          value={count}
          icon={<Users className="h-5 w-5" style={{ color: "var(--color-purple-400)" }} />}
        />
        <StatCard
          label="Pending requests"
          value={pending.length}
          accent={pending.length > 0}
          icon={<Bell className="h-5 w-5" style={{ color: pending.length > 0 ? "#f59e0b" : "var(--color-cyan-400)" }} />}
        />
        <StatCard
          label="Admin users"
          value={1}
          icon={<Shield className="h-5 w-5" style={{ color: "var(--color-cyan-400)" }} />}
        />
      </div>

      {/* ── PENDING REQUESTS ─────────────────────────────────────────────────── */}
      {pending.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden mb-8"
          style={{
            background: "var(--color-bg-surface)",
            border: "1px solid rgba(245,158,11,0.35)",
            boxShadow: "0 0 0 3px rgba(245,158,11,0.06)",
          }}
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ borderBottom: "1px solid var(--color-border-subtle)", background: "rgba(245,158,11,0.04)" }}
          >
            <Bell className="h-5 w-5" style={{ color: "#f59e0b" }} />
            <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Pending Requests
            </h2>
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
            >
              {pending.length} waiting
            </span>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
            {pending.map((req) => (
              <div key={req.userId} className="px-6 py-4 flex items-center gap-4">
                {/* Avatar placeholder */}
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold flex-shrink-0"
                  style={{ background: "var(--color-bg-elevated)", color: "var(--color-purple-400)" }}
                >
                  {req.userName.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                    {req.userName}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
                      ID: {req.userId}
                    </span>
                    {req.email && (
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {req.email}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
                      {timeAgo(req.requestedAt)}
                    </span>
                  </div>
                </div>

                {/* Approval link — admin can copy or open directly */}
                <a
                  href={req.approvalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border-default)",
                    color: "var(--color-text-muted)",
                  }}
                  title="Open one-click approval link"
                >
                  <ExternalLink className="h-3 w-3" />
                  Link
                </a>

                {/* Approve */}
                <button
                  onClick={() => void handleApprove(req)}
                  disabled={approving === req.userId}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{
                    background: "rgba(16,185,129,0.12)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    color: "#10b981",
                  }}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {approving === req.userId ? "Approving…" : "Approve"}
                </button>

                {/* Dismiss */}
                <button
                  onClick={() => void handleDeny(req)}
                  disabled={denying === req.userId}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#ef4444",
                  }}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  {denying === req.userId ? "…" : "Dismiss"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EMAIL PENDING REQUESTS ───────────────────────────────────────── */}
      {emailPending.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden mb-8"
          style={{
            background: "var(--color-bg-surface)",
            border: "1px solid rgba(52,211,153,0.35)",
            boxShadow: "0 0 0 3px rgba(52,211,153,0.04)",
          }}
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ borderBottom: "1px solid var(--color-border-subtle)", background: "rgba(52,211,153,0.03)" }}
          >
            <Mail className="h-5 w-5" style={{ color: "#34d399" }} />
            <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Email Access Requests
            </h2>
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}
            >
              {emailPending.length} waiting
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
            {emailPending.map((req) => (
              <div key={req.id} className="px-6 py-4 flex items-start gap-4">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold flex-shrink-0 mt-0.5"
                  style={{ background: "var(--color-bg-elevated)", color: "#34d399" }}
                >
                  {req.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{req.name}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{req.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {req.agentScope.map((scope) => (
                      <span key={scope}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6",
                          border: "1px solid rgba(139,92,246,0.25)" }}>
                        {scope}
                      </span>
                    ))}
                  </div>
                  {req.reason && (
                    <p className="text-xs mt-1 italic" style={{ color: "var(--color-text-muted)" }}>
                      &ldquo;{req.reason}&rdquo;
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-disabled)" }}>
                    {timeAgo(req.requestedAt)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "rgba(52,211,153,0.1)", color: "#34d399",
                      border: "1px solid rgba(52,211,153,0.25)" }}>
                    Email
                  </span>
                  <CopyMagicLinkButton req={req} onDismiss={() => void dismissEmailRequest(req.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MANUAL GRANT FORM ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5" style={{ color: "var(--color-purple-400)" }} />
          <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Grant Access Manually
          </h2>
        </div>
        <form
          onSubmit={(e) => void handleGrant(e)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end"
        >
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
              GitHub User ID *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 12345678"
              value={grantUserId}
              onChange={(e) => setGrantUserId(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
              GitHub Username *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. octocat"
              value={grantUserName}
              onChange={(e) => setGrantUserName(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
              Email (optional)
            </label>
            <input
              type="email"
              placeholder="user@example.com"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={granting}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--color-purple-700), var(--color-purple-600))",
                color: "#fff",
              }}
            >
              <UserPlus className="h-4 w-4" />
              {granting ? "Granting…" : "Grant Access"}
            </button>
          </div>
        </form>
      </div>

      {/* ── ALLOWED USERS TABLE ───────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden mb-8"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <Users className="h-5 w-5" style={{ color: "var(--color-purple-400)" }} />
          <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Allowed Users
          </h2>
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-muted)" }}
          >
            {count} total
          </span>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            Loading…
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No users granted yet. Use the form above or approve a pending request.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                  {["User ID", "Username", "Email", "Granted", "Source", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr
                    key={u.userId}
                    style={{ borderBottom: i < users.length - 1 ? "1px solid var(--color-border-subtle)" : undefined }}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {u.userId}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {u.userName}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
                      {u.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {formatDate(u.grantedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
                      {u.grantedBy === "email-approval-link" ? "📧 email link" : u.grantedBy === "env" ? "🔧 env var" : u.grantedBy}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void handleRevoke(u.userId, u.userName)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                        style={{
                          background: "rgba(239,68,68,0.08)",
                          border: "1px solid rgba(239,68,68,0.2)",
                          color: "#ef4444",
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SETUP GUIDE ───────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
          Setup Guide
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
          To access DataLab and this admin panel, you must add your own GitHub user ID to{" "}
          <code className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--color-bg-elevated)", color: "var(--color-purple-400)" }}>
            DATALAB_ADMIN_IDS
          </code>
          .
        </p>

        {/* Step 1 */}
        <div className="space-y-4">
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)" }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-purple-400)" }}>
              STEP 1 — Find your GitHub user ID
            </p>
            <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
              Visit the URL below (replace YOUR_USERNAME with your GitHub handle):
            </p>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 text-xs font-mono px-2 py-1.5 rounded-lg"
                style={{ background: "#0a0a12", color: "#06b6d4", border: "1px solid #334155" }}
              >
                https://api.github.com/users/YOUR_USERNAME
              </code>
              <CopyButton text="https://api.github.com/users/YOUR_USERNAME" />
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
              Look for the <code style={{ color: "#f59e0b" }}>&quot;id&quot;</code> field in the JSON response. That number is your GitHub user ID.
            </p>
          </div>

          {/* Step 2 */}
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)" }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-purple-400)" }}>
              STEP 2 — Add to .env.local (local dev)
            </p>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 text-xs font-mono px-2 py-1.5 rounded-lg"
                style={{ background: "#0a0a12", color: "#06b6d4", border: "1px solid #334155" }}
              >
                DATALAB_ADMIN_IDS=YOUR_GITHUB_USER_ID
              </code>
              <CopyButton text="DATALAB_ADMIN_IDS=YOUR_GITHUB_USER_ID" />
            </div>
          </div>

          {/* Step 3 */}
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)" }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-purple-400)" }}>
              STEP 3 — Add to Vercel (production)
            </p>
            <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
              Vercel Dashboard → Your Project → Settings → Environment Variables → Add:
            </p>
            <div className="space-y-2">
              {[
                {
                  key: "DATALAB_ADMIN_IDS",
                  val: "your_github_user_id",
                  desc: "Admin access — can view this panel and approve requests",
                },
                {
                  key: "DATALAB_ALLOWED_IDS",
                  val: "id1,id2,id3",
                  desc: "Users with DataLab access (comma-separated, persists across restarts)",
                },
              ].map(({ key, val, desc }) => (
                <div key={key}>
                  <div className="flex items-center gap-2">
                    <code
                      className="flex-1 text-xs font-mono px-2 py-1 rounded-lg"
                      style={{ background: "#0a0a12", color: "#06b6d4", border: "1px solid #334155" }}
                    >
                      {key}={val}
                    </code>
                    <CopyButton text={`${key}=${val}`} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Persistence note */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(245,158,11,0.04)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: "#f59e0b" }}>
              Important — Making grants permanent
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Access granted via the Approve button or email link is stored in server memory and
              resets when Vercel spins up a new instance. To make it permanent, copy the approved
              user&apos;s GitHub ID into{" "}
              <code style={{ color: "#f59e0b" }}>DATALAB_ALLOWED_IDS</code>{" "}
              in your Vercel env vars and redeploy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
