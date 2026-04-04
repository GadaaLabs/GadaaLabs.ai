"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { Download, Lock, Loader2, Users, Zap, RotateCcw } from "lucide-react";
import type { DatasetSummary } from "@/lib/datalab";

const StakeholderReportPDFButton = dynamic(() => import("./StakeholderReportPDFButton"), { ssr: false });

function downloadMd(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// Build context for the AI — extract only business-relevant phases, keep it concise
function buildExecutiveContext(outputs: Record<string, string>): string {
  const phases: { id: string; label: string }[] = [
    { id: "triage",   label: "Domain & Quality Assessment" },
    { id: "business", label: "Business Intelligence & ROI" },
    { id: "decision", label: "Decision Brief & Actions" },
    { id: "hypotheses", label: "Key Hypotheses" },
  ];
  return phases
    .filter(p => outputs[p.id])
    .map(p => `### ${p.label}\n${outputs[p.id].slice(0, 1200)}`)
    .join("\n\n");
}

interface Props {
  outputs: Record<string, string> | null;
  summary: DatasetSummary;
}

export function StakeholderReport({ outputs, summary }: Props) {
  const [report, setReport]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!outputs || loading) return;
    setLoading(true);
    setError(null);
    setReport("");

    const context = buildExecutiveContext(outputs);

    try {
      const res = await fetch("/api/ai/stakeholder-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, datasetName: summary.fileName }),
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
        setReport(acc);
      }

      setGenerated(true);
    } catch (e) {
      setError((e as Error).message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [outputs, loading, summary.fileName]);

  const reset = useCallback(() => {
    setReport("");
    setGenerated(false);
    setError(null);
  }, []);

  // No outputs yet
  if (!outputs) {
    return (
      <div className="rounded-xl p-10 text-center"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <Lock className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--color-text-disabled)" }} />
        <p className="font-semibold text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
          No Analysis Yet
        </p>
        <p className="text-xs max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
          Run the 7-phase Data Science Agent analysis first. Once complete, you can generate a plain-language executive brief here.
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
              AI-generated executive brief — plain English, no jargon
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {generated && (
            <>
              <button onClick={reset}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
                <RotateCcw className="h-3.5 w-3.5" /> Regenerate
              </button>
              <StakeholderReportPDFButton report={report} summary={summary} />
              <button
                onClick={() => downloadMd(report, `${summary.fileName.replace(/\.[^.]+$/, "")}_stakeholder_report.md`)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
                <Download className="h-3.5 w-3.5" /> .md
              </button>
            </>
          )}
          {!generated && !loading && (
            <button onClick={generate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", boxShadow: "0 0 18px rgba(16,185,129,0.3)" }}>
              <Zap className="h-4 w-4" /> Generate Executive Brief
            </button>
          )}
          {loading && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}>
              <Loader2 className="h-4 w-4 animate-spin" /> Writing brief…
            </div>
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

      {/* Empty state — outputs available but not yet generated */}
      {!report && !loading && !error && (
        <div className="rounded-xl p-8 text-center"
          style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
          <Users className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--color-text-disabled)" }} />
          <p className="font-semibold text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>Ready to Generate</p>
          <p className="text-xs max-w-md mx-auto leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            The 7-phase analysis is complete. Click <strong style={{ color: "#10b981" }}>Generate Executive Brief</strong> to produce
            a plain-language report for leadership — no code, no jargon, pure business insight.
          </p>
        </div>
      )}

      {/* Streaming / final report */}
      {(report || loading) && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-bg-surface)", border: "1px solid rgba(16,185,129,0.25)", borderLeft: "3px solid #10b981" }}>
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#10b981" }}>
              Executive Brief — {summary.fileName}
            </p>
            {loading && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "#10b981" }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#10b981" }} />
                Generating
              </span>
            )}
          </div>
          <div className="px-4 py-4">
            <pre
              className="text-sm leading-relaxed"
              style={{
                color: "var(--color-text-secondary)",
                whiteSpace: "pre-wrap",
                fontFamily: "var(--font-inter, sans-serif)",
                margin: 0,
              }}>
              {report}
              {loading && (
                <span style={{ color: "#10b981" }}>▊</span>
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
