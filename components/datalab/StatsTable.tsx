"use client";

import { Sparkles, Trash2, Replace, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { DatasetSummary, ColumnStats, CleaningAction } from "@/lib/datalab";

const typeColor: Record<ColumnStats["type"], { color: string; bg: string }> = {
  numeric:     { color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
  categorical: { color: "#a78bfa", bg: "rgba(124,58,237,0.12)" },
  datetime:    { color: "#34d399", bg: "rgba(16,185,129,0.12)" },
  boolean:     { color: "#fbbf24", bg: "rgba(245,158,11,0.12)" },
  mixed:       { color: "#f87171", bg: "rgba(239,68,68,0.12)" },
};

const actionLabel: Record<CleaningAction["action"], string> = {
  drop_column:    "Dropped",
  drop_rows:      "Rows dropped",
  impute_mean:    "Filled → mean",
  impute_median:  "Filled → median",
  impute_mode:    "Filled → mode",
};

const actionColor: Record<CleaningAction["action"], string> = {
  drop_column:   "#ef4444",
  drop_rows:     "#f97316",
  impute_mean:   "#06b6d4",
  impute_median: "#06b6d4",
  impute_mode:   "#a78bfa",
};

function CleaningReportSection({ report }: { report: NonNullable<DatasetSummary["cleaningReport"]> }) {
  const [expanded, setExpanded] = useState(true);

  const drops = report.actions.filter(a => a.action === "drop_column");
  const rowDrop = report.actions.find(a => a.action === "drop_rows");
  const imputations = report.actions.filter(a => a.action !== "drop_column" && a.action !== "drop_rows");
  const totalFixed = drops.length + imputations.length + (rowDrop ? 1 : 0);
  const isClean = totalFixed === 0;

  if (isClean) {
    return (
      <div className="mb-6 rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
        <Sparkles className="h-4 w-4 shrink-0" style={{ color: "#10b981" }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: "#10b981" }}>Data looks clean</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            No null imputation or column drops needed — {report.originalColumns} columns · {report.originalRows.toLocaleString()} rows passed unchanged.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.04)" }}>

      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: "rgba(245,158,11,0.08)" }}>
        <div className="flex items-center gap-3">
          <Sparkles className="h-4 w-4 shrink-0" style={{ color: "#f59e0b" }} />
          <div className="text-left">
            <p className="text-sm font-bold" style={{ color: "#f59e0b" }}>
              Data Preparation — {totalFixed} action{totalFixed !== 1 ? "s" : ""} applied
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {report.originalColumns} → {report.originalColumns - drops.length} columns
              {rowDrop ? ` · ${rowDrop.count.toLocaleString()} blank rows removed` : ""}
              {imputations.length > 0 ? ` · ${imputations.length} column${imputations.length !== 1 ? "s" : ""} imputed` : ""}
              {" · "}applied before all analysis
            </p>
          </div>
        </div>
        <span style={{ color: "var(--color-text-muted)" }}>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                  {["Action", "Column", "Rows affected", "Reason"].map(h => (
                    <th key={h} className="pb-2 text-left font-semibold pr-6"
                      style={{ color: "var(--color-text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.actions.map((a, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                    <td className="py-2 pr-6">
                      <span className="inline-flex items-center gap-1.5">
                        {a.action === "drop_column" || a.action === "drop_rows"
                          ? <Trash2 className="h-3 w-3 shrink-0" style={{ color: actionColor[a.action] }} />
                          : <Replace className="h-3 w-3 shrink-0" style={{ color: actionColor[a.action] }} />}
                        <span className="font-semibold" style={{ color: actionColor[a.action] }}>
                          {actionLabel[a.action]}
                        </span>
                      </span>
                    </td>
                    <td className="py-2 pr-6 font-mono font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {a.column}
                    </td>
                    <td className="py-2 pr-6 font-mono" style={{ color: "var(--color-text-secondary)" }}>
                      {a.action === "drop_column" ? "—" : a.count.toLocaleString()}
                    </td>
                    <td className="py-2" style={{ color: "var(--color-text-muted)" }}>
                      {a.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function StatsTable({ summary }: { summary: DatasetSummary }) {
  return (
    <div>
      {/* Data preparation report — shown before anything else */}
      {summary.cleaningReport && (
        <CleaningReportSection report={summary.cleaningReport} />
      )}

      {/* Overview KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Rows", value: summary.rowCount.toLocaleString() },
          { label: "Columns", value: summary.columnCount },
          { label: "File size", value: `${summary.fileSizeKB} KB` },
          { label: "File", value: summary.fileName.length > 20 ? summary.fileName.slice(0, 18) + "…" : summary.fileName },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4 text-center"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
            <div className="text-xl font-bold gradient-text">{s.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Column stats table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border-default)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-default)" }}>
                {["Column", "Type", "Null %", "Unique", "Min", "Max", "Mean / Top values"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.columns.map((col, i) => {
                const tc = typeColor[col.type];
                return (
                  <tr key={col.name} style={{
                    background: i % 2 === 0 ? "var(--color-bg-surface)" : "var(--color-bg-elevated)",
                    borderTop: "1px solid var(--color-border-subtle)",
                  }}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {col.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{ background: tc.bg, color: tc.color }}>
                        {col.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs"
                      style={{ color: col.nullPct > 20 ? "var(--color-error)" : col.nullPct > 5 ? "var(--color-warning)" : "var(--color-text-secondary)" }}>
                      {col.nullPct}%
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {col.unique.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--color-text-secondary)" }}>
                      {col.min ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--color-text-secondary)" }}>
                      {col.max ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {col.type === "numeric"
                        ? `μ=${col.mean} σ=${col.std}`
                        : col.topValues?.slice(0, 3).map((t) => `"${t.value}"`).join(", ") ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
