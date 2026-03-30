"use client";

import { useState } from "react";
import { Mail, Send, Loader2, CheckCircle2, AlertCircle, MapPin, Clock } from "lucide-react";

const SUBJECTS = [
  "General Inquiry",
  "DataLab Access Request",
  "Course or Content Feedback",
  "Bug Report",
  "Partnership or Collaboration",
  "Billing or Subscription",
  "Other",
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: SUBJECTS[0], message: "" });
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { success?: boolean; mailtoUrl?: string; error?: string };

      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }

      // Open pre-filled email in user's mail client
      if (data.mailtoUrl) window.location.href = data.mailtoUrl;
      setState("success");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setState("error");
    }
  };

  const inputStyle = {
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border-default)",
    color: "var(--color-text-primary)",
    borderRadius: "0.75rem",
    padding: "0.625rem 0.875rem",
    width: "100%",
    fontSize: "0.875rem",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 600,
    marginBottom: "0.375rem",
    color: "var(--color-text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  };

  return (
    <div
      className="min-h-screen px-6 py-16"
      style={{ background: "var(--color-bg-base)" }}
    >
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-5">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, var(--color-purple-700), var(--color-purple-600))",
                boxShadow: "var(--glow-purple)",
              }}
            >
              <Mail className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
            Get in <span className="gradient-text">Touch</span>
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>
            Have a question, feedback, or want to collaborate? We read every message and respond within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left — contact info */}
          <div className="lg:col-span-2 space-y-5">
            {[
              {
                icon: Mail,
                label: "Email Us",
                value: "support@gadaalabs.com",
                href: "mailto:support@gadaalabs.com",
                sub: "We reply within 24 hours",
              },
              {
                icon: Clock,
                label: "Response Time",
                value: "Within 24 hours",
                sub: "Monday – Friday",
              },
              {
                icon: MapPin,
                label: "Based In",
                value: "Remote — Global",
                sub: "Serving learners worldwide",
              },
            ].map(({ icon: Icon, label, value, href, sub }) => (
              <div
                key={label}
                className="flex items-start gap-4 rounded-2xl p-5"
                style={{
                  background: "var(--color-bg-surface)",
                  border: "1px solid var(--color-border-default)",
                }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "var(--color-purple-400)" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {label}
                  </p>
                  {href
                    ? <a href={href} className="text-sm font-semibold hover:underline" style={{ color: "var(--color-purple-400)" }}>{value}</a>
                    : <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{value}</p>}
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{sub}</p>
                </div>
              </div>
            ))}

            {/* What to expect */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(124,58,237,0.06)",
                border: "1px solid rgba(124,58,237,0.2)",
              }}
            >
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-purple-400)" }}>
                What to expect
              </p>
              <ul className="space-y-2">
                {[
                  "We personally read every message",
                  "DataLab access requests reviewed within 24h",
                  "Bug reports triaged within 48h",
                  "Course feedback shapes our content roadmap",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "var(--color-success)" }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right — form */}
          <div
            className="lg:col-span-3 rounded-2xl p-7"
            style={{
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            {state === "success" ? (
              <div className="flex flex-col items-center justify-center h-full py-12 gap-4 text-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}
                >
                  <CheckCircle2 className="h-8 w-8" style={{ color: "var(--color-success)" }} />
                </div>
                <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                  Email client opened!
                </h2>
                <p className="text-sm max-w-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Your message is pre-filled in your email client. Just hit Send — we'll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => setState("idle")}
                  className="mt-2 text-sm underline"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => void submit(e)} className="space-y-5">
                <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
                  Send us a message
                </h2>
                <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
                  Fill in the form and your email client will open with everything pre-filled — just hit Send.
                </p>

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Your Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Smith"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label style={labelStyle}>Subject</label>
                  <select
                    value={form.subject}
                    onChange={(e) => set("subject", e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label style={labelStyle}>Message *</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Tell us how we can help…"
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    style={{ ...inputStyle, resize: "vertical", minHeight: "140px" }}
                  />
                </div>

                {/* Error */}
                {state === "error" && errorMsg && (
                  <div
                    className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--color-error)" }}
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={state === "loading"}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, var(--color-purple-700), var(--color-purple-600))",
                    color: "#fff",
                    boxShadow: "var(--glow-purple-sm)",
                  }}
                >
                  {state === "loading"
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</>
                    : <><Send className="h-4 w-4" /> Send Message</>}
                </button>

                <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
                  Or email directly:{" "}
                  <a href="mailto:support@gadaalabs.com" className="hover:underline" style={{ color: "var(--color-purple-400)" }}>
                    support@gadaalabs.com
                  </a>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
