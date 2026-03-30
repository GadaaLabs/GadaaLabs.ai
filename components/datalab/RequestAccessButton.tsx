"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle } from "lucide-react";

/**
 * Calls POST /api/datalab/request to generate a signed approval token,
 * then opens the pre-filled mailto URL in the user's email client.
 *
 * The email body already contains the one-click approval link so the admin
 * only has to click a URL — no copy-pasting of user IDs.
 */
export function RequestAccessButton() {
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setState("loading");
    setError(null);

    try {
      const res = await fetch("/api/datalab/request", { method: "POST" });
      const data = (await res.json()) as { mailtoUrl?: string; error?: string };

      if (!res.ok || !data.mailtoUrl) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }

      // Open the pre-filled email in the user's mail client
      window.location.href = data.mailtoUrl;
      setState("sent");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div
        className="flex flex-col items-center gap-3 w-full rounded-xl px-4 py-4 text-sm"
        style={{
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.3)",
          color: "var(--color-success)",
        }}
      >
        <CheckCircle className="h-5 w-5" />
        <span className="font-semibold">Email client opened!</span>
        <span className="text-center" style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
          Your email is pre-filled with an approval link. Just hit Send — the admin can
          approve your access with a single click.
        </span>
        <button
          onClick={() => setState("idle")}
          className="mt-1 text-xs underline opacity-60 hover:opacity-100"
          style={{ color: "var(--color-text-muted)" }}
        >
          Send again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => void handleClick()}
        disabled={state === "loading"}
        className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{
          background: "linear-gradient(135deg, var(--color-purple-700), var(--color-purple-600))",
          color: "#fff",
        }}
      >
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        {state === "loading" ? "Preparing email…" : "Request Access via Email"}
      </button>

      {state === "error" && error && (
        <p className="text-xs text-center" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}

      <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
        Your email will include a one-click approval link for the admin.
      </p>
    </div>
  );
}
