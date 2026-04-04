"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { Download, Lock, Loader2, Users, Zap, RotateCcw, Clock, ChevronDown } from "lucide-react";
import type { DatasetSummary } from "@/lib/datalab";

const StakeholderReportPDFButton = dynamic(() => import("./StakeholderReportPDFButton"), { ssr: false });

const MAX_VERSIONS = 3;

interface Version {
  report: string;
  generatedAt: string; // ISO string
}

function downloadMd(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}

function buildExecutiveContext(outputs: Record<string, string>): string {
  const phases = [
    { id: "triage",     label: "Domain & Quality Assessment" },
    { id: "business",   label: "Business Intelligence & ROI" },
    { id: "decision",   label: "Decision Brief & Actions" },
    { id: "hypotheses", label: "Key Hypotheses" },
  ];
  return phases
    .filter(p => outputs[p.id])
    .map(p => `### ${p.label}\n${outputs[p.id].slice(0, 1200)}`)
    .join("\n\n");
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
    " · " + d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface Props {
  outputs: Record<string, string> | null;
  summary: DatasetSummary;
}

export function StakeholderReport({ outputs, summary }: Props) {
  const [versions, setVersions]   = useState<Version[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [streaming, setStreaming] = useState("");  // live text while generating
  const [error, setError]         = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const currentReport = loading ? streaming : (versions[activeIdx]?.report ?? "");
  const generated = versions.length > 0;

  const generate = useCallback(async () => {
    if (!outputs || loading) return;
    setLoading(true);
    setError(null);
    setStreaming("");

    try {
      const res = await fetch("/api/ai/stakeholder-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: buildExecutiveContext(outputs), datasetName: summary.fileName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreaming(acc);
      }

      const newVersion: Version = { report: acc, generatedAt: new Date().toISOString() };
      setVersions(prev => {
        const updated = [newVersion, ...prev].slice(0, MAX_VERSIONS);
        return updated;
      });
      setActiveIdx(0);
      setStreaming("");
    } catch (e) {
      setError((e as Error).message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [outputs, loading, summary.fileName]);

  if (!outputs) {
    return (
      <div className="rounded-xl p-10 text-center"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <Lock className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--color-text-disabled)" }} />
        <p className="font-semibold text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>No Analysis Yet</p>
        <p className="text-xs max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
          Run the 7-phase Data Science Agent analysis first. Once complete, generate a plain-language executive brief here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)" }}>
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>Stakeholder Report</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {generated
                ? `v${versions.length} saved · last generated ${fmtTime(versions[0].generatedAt)}`
                : "AI-generated executive brief — plain English, no jargon"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Version selector */}
          {versions.length > 1 && (
            <div className="relative">
              <button onClick={() => setShowHistory(v => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
                <Clock className="h-3.5 w-3.5" />
                v{versions.length - activeIdx} of {versions.length}
                <ChevronDown className="h-3 w-3" />
              </button>
              {showHistory && (
                <div className="absolute right-0 top-full mt-1 z-10 rounded-xl overflow-hidden shadow-xl min-w-[200px]"
                  style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
                  {versions.map((v, i) => (
                    <button key={i}
                      onClick={() => { setActiveIdx(i); setShowHistory(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-xs hover:bg-white/5"
                      style={{ color: i === activeIdx ? "#10b981" : "var(--color-text-secondary)" }}>
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{i === 0 ? "Latest — " : `v${versions.length - i} — `}{fmtTime(v.generatedAt)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Regenerate */}
          {!loading && (
            <button onClick={generate}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
              <RotateCcw className="h-3.5 w-3.5" />
              {generated ? "Regenerate" : "Generate"}
            </button>
          )}
          {loading && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}>
              <Loader2 className="h-4 w-4 animate-spin" /> Writing brief…
            </div>
          )}

          {/* Downloads — only for final versions */}
          {!loading && generated && versions[activeIdx] && (
            <>
              <StakeholderReportPDFButton report={versions[activeIdx].report} summary={summary} />
              <button
                onClick={() => downloadMd(versions[activeIdx].report, `${summary.fileName.replace(/\.[^.]+$/, "")}_stakeholder_report_v${versions.length - activeIdx}.md`)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
                <Download className="h-3.5 w-3.5" /> .md
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--color-error)" }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!generated && !loading && !error && (
        <div className="rounded-xl p-8 text-center"
          style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
          <Users className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--color-text-disabled)" }} />
          <p className="font-semibold text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>Ready to Generate</p>
          <p className="text-xs max-w-md mx-auto leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            The 7-phase analysis is complete. Click <strong style={{ color: "#10b981" }}>Generate</strong> to produce
            a plain-language report for leadership — no code, no jargon, pure business insight.
          </p>
          <button onClick={generate}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", boxShadow: "0 0 18px rgba(16,185,129,0.3)" }}>
            <Zap className="h-4 w-4" /> Generate Executive Brief
          </button>
        </div>
      )}

      {/* Version label when viewing older version */}
      {!loading && generated && activeIdx > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Viewing version {versions.length - activeIdx} of {versions.length} — generated {fmtTime(versions[activeIdx].generatedAt)}
          <button onClick={() => setActiveIdx(0)} className="ml-auto font-semibold underline">View latest</button>
        </div>
      )}

      {/* Report content */}
      {(currentReport || loading) && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-bg-surface)", border: "1px solid rgba(16,185,129,0.25)", borderLeft: "3px solid #10b981" }}>
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#10b981" }}>
              Executive Brief — {summary.fileName}
              {!loading && versions.length > 1 && (
                <span style={{ color: "var(--color-text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                  {" "}· v{versions.length - activeIdx}
                </span>
              )}
            </p>
            {loading && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "#10b981" }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#10b981" }} />
                Generating
              </span>
            )}
          </div>
          <div className="px-4 py-4">
            <pre className="text-sm leading-relaxed"
              style={{ color: "var(--color-text-secondary)", whiteSpace: "pre-wrap", fontFamily: "var(--font-inter, sans-serif)", margin: 0 }}>
              {currentReport}
              {loading && <span style={{ color: "#10b981" }}>▊</span>}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
