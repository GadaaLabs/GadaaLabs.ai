"use client";

/**
 * /dashboard/admin — DataLab Access Management
 *
 * Client component: fetches user list on mount, handles grant/revoke via the
 * /api/admin/datalab-access route.
 *
 * Route is automatically protected by middleware (covers /dashboard/:path*).
 * An additional admin check is performed server-side in the API route.
 */

import { useEffect, useState } from "react";
import { Shield, Users, UserPlus, Trash2, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface DataLabUser {
  userId: string;
  userName: string;
  email?: string;
  grantedAt: number;
  grantedBy: string;
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
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{
        background: "var(--color-bg-surface)",
        border: "1px solid var(--color-border-default)",
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
// Main page
// ---------------------------------------------------------------------------

export default function AdminDataLabPage() {
  const [users, setUsers] = useState<DataLabUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusMessage>(null);

  // Grant form state
  const [grantUserId, setGrantUserId] = useState("");
  const [grantUserName, setGrantUserName] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [granting, setGranting] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch user list
  // ---------------------------------------------------------------------------

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/datalab-access");
      if (res.status === 403) {
        setStatus({ type: "error", text: "Access denied — admin privileges required." });
        return;
      }
      if (!res.ok) throw new Error("Failed to load users");
      const data = (await res.json()) as { users: DataLabUser[]; count: number };
      setUsers(data.users);
      setCount(data.count);
    } catch {
      setStatus({ type: "error", text: "Could not load user list. Are you signed in as an admin?" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Grant access
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
        setGrantUserId("");
        setGrantUserName("");
        setGrantEmail("");
        await fetchUsers();
      } else {
        setStatus({ type: "error", text: data.error ?? "Failed to grant access." });
      }
    } catch {
      setStatus({ type: "error", text: "Network error. Please try again." });
    } finally {
      setGranting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Revoke access
  // ---------------------------------------------------------------------------

  async function handleRevoke(userId: string, userName: string) {
    if (!confirm(`Revoke DataLab access for ${userName} (${userId})?`)) return;
    setStatus(null);
    try {
      const res = await fetch("/api/admin/datalab-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", userId }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (data.success) {
        setStatus({ type: "success", text: data.message ?? "Access revoked." });
        await fetchUsers();
      } else {
        setStatus({ type: "error", text: data.error ?? "Failed to revoke access." });
      }
    } catch {
      setStatus({ type: "error", text: "Network error. Please try again." });
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Page header */}
      <div className="flex items-center gap-4 mb-8 pb-6" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
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
            Grant or revoke DataLab access for GadaaLabs users.
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
          className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6 text-sm"
          style={{
            background: status.type === "success" ? "rgba(52, 211, 153, 0.08)" : "rgba(248, 113, 113, 0.08)",
            border: `1px solid ${status.type === "success" ? "#34d399" : "#f87171"}`,
            color: status.type === "success" ? "#34d399" : "#f87171",
          }}
        >
          {status.type === "success" ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {status.text}
          <button
            onClick={() => setStatus(null)}
            className="ml-auto opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          label="Users with DataLab access"
          value={count}
          icon={<Users className="h-5 w-5" style={{ color: "var(--color-purple-400)" }} />}
        />
        <StatCard
          label="Admin users (env var)"
          value={0 /* admin count not surfaced to client */}
          icon={<Shield className="h-5 w-5" style={{ color: "var(--color-cyan-400)" }} />}
        />
      </div>

      {/* Grant access form */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5" style={{ color: "var(--color-purple-400)" }} />
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Grant Access
          </h2>
        </div>
        <form onSubmit={(e) => void handleGrant(e)} className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
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
              className="w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-1"
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
              className="w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-1"
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
              className="w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-1"
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

      {/* Users table */}
      <div
        className="rounded-2xl overflow-hidden mb-8"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: "var(--color-purple-400)" }} />
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Allowed Users
            </h2>
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-full"
              style={{
                background: "var(--color-bg-elevated)",
                color: "var(--color-text-muted)",
              }}
            >
              {count} total
            </span>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No users have been granted access yet (env-seeded users shown after page refresh).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                  {["User ID", "Username", "Email", "Granted", "By", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr
                    key={u.userId}
                    style={{
                      borderBottom: i < users.length - 1 ? "1px solid var(--color-border-subtle)" : undefined,
                    }}
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
                      {u.grantedBy}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void handleRevoke(u.userId, u.userName)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                        style={{
                          background: "rgba(248, 113, 113, 0.08)",
                          border: "1px solid rgba(248, 113, 113, 0.25)",
                          color: "#f87171",
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

      {/* Env var guidance panel */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
          Environment Variable Configuration
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
          The in-memory store is seeded at startup from these env vars. Permanent access lists should be set here.
          For production, replace the in-memory Map with Vercel KV or a Prisma model.
        </p>
        <div className="space-y-3">
          {[
            {
              key: "DATALAB_ADMIN_IDS",
              description: "Comma-separated GitHub user IDs with admin access (never expires, not revocable at runtime).",
              example: "12345678,87654321",
            },
            {
              key: "DATALAB_ALLOWED_IDS",
              description: "Comma-separated GitHub user IDs pre-seeded with DataLab access on every cold start.",
              example: "11111111,22222222",
            },
          ].map(({ key, description, example }) => (
            <div
              key={key}
              className="rounded-xl p-4"
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <code className="text-sm font-mono font-semibold" style={{ color: "var(--color-purple-400)" }}>
                {key}
              </code>
              <p className="text-xs mt-1 mb-2" style={{ color: "var(--color-text-secondary)" }}>
                {description}
              </p>
              <code className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
                {key}={example}
              </code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
