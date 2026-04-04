"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, Download } from "lucide-react";
import type { DatasetSummary } from "@/lib/datalab";

type Row = Record<string, unknown>;

const SAMPLE_SIZE = 5000;
const Z_CAP = 5;

interface AnomalyRow {
  _idx: number;
  _score: number;
  _zScores: Record<string, number>;
  [col: string]: unknown;
}

function computeAnomalyScores(rows: Row[], summary: DatasetSummary): AnomalyRow[] {
  const numCols = summary.columns.filter(c => c.type === "numeric");
  if (numCols.length === 0 || rows.length === 0) return [];

  const sample = rows.length > SAMPLE_SIZE ? rows.slice(0, SAMPLE_SIZE) : rows;

  return sample.map((row, idx) => {
    const zScores: Record<string, number> = {};
    let totalZ = 0;
    let validCols = 0;

    for (const col of numCols) {
      const val = parseFloat(String(row[col.name] ?? ""));
      if (isNaN(val)) continue;
      const mean = col.mean ?? 0;
      const std = col.std ?? 0;
      if (std === 0) continue;
      const z = Math.abs((val - mean) / std);
      zScores[col.name] = z;
      totalZ += Math.min(z, Z_CAP);
      validCols++;
    }

    const avgZ = validCols > 0 ? totalZ / validCols : 0;
    const score = Math.min(100, (avgZ / Z_CAP) * 100);

    return { ...row, _idx: idx, _score: score, _zScores: zScores };
  });
}

function exportCSV(rows: AnomalyRow[], name: string) {
  if (!rows.length) return;
  const dataKeys = Object.keys(rows[0]).filter(k => !["_idx", "_score", "_zScores"].includes(k));
  const headers = ["_idx", "_score", ...dataKeys];
  const esc = (v: unknown) => { const s = String(v ?? ""); return s.includes(",") ? `"${s}"` : s; };
  const csv = [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name; a.click();
}

interface Props {
  activeRows: Row[];
  summary: DatasetSummary;
}

export function AnomalyDetectionTab({ activeRows, summary }: Props) {
  const [threshold, setThreshold] = useState(70);

  const numCols = useMemo(
    () => summary.columns.filter(c => c.type === "numeric").map(c => c.name),
    [summary.columns]
  );

  const scored = useMemo(() => computeAnomalyScores(activeRows, summary), [activeRows, summary]);

  const topRows = useMemo(
    () => [...scored].sort((a, b) => b._score - a._score).slice(0, 50),
    [scored]
  );

  const distribution = useMemo(() => ({
    normal:   scored.filter(r => r._score < 40).length,
    moderate: scored.filter(r => r._score >= 40 && r._score < threshold).length,
    critical: scored.filter(r => r._score >= threshold).length,
  }), [scored, threshold]);

  const anomalyRows = useMemo(
    () => topRows.filter(r => r._score >= threshold),
    [topRows, threshold]
  );

  if (activeRows.length === 0) {
    return (
      <div className="rounded-xl p-10 text-center"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <AlertTriangle className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--color-text-disabled)" }} />
        <p className="font-semibold text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>Re-upload your file</p>
        <p className="text-xs max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
          Anomaly detection requires the full dataset. Upload your file to enable this tab.
        </p>
      </div>
    );
  }

  if (numCols.length === 0) {
    return (
      <div className="rounded-xl p-10 text-center"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <AlertTriangle className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--color-text-disabled)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>No numeric columns</p>
        <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
          Anomaly detection requires numeric columns to compute z-scores.
        </p>
      </div>
    );
  }

  const displayCols = numCols.slice(0, 6);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <AlertTriangle className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>Anomaly Detection</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Z-score per-row scoring · {Math.min(activeRows.length, SAMPLE_SIZE).toLocaleString()} rows · {numCols.length} features
              {activeRows.length > SAMPLE_SIZE && ` · sampled from ${activeRows.length.toLocaleString()}`}
            </p>
          </div>
        </div>
        {anomalyRows.length > 0 && (
          <button
            onClick={() => exportCSV(anomalyRows, "anomalies.csv")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
            <Download className="h-3.5 w-3.5" /> Export {anomalyRows.length} anomalies
          </button>
        )}
      </div>

      {/* KPI cards + threshold */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Normal",    value: distribution.normal,   color: "#10b981", desc: "score < 40" },
          { label: "Moderate",  value: distribution.moderate, color: "#f59e0b", desc: `40–${threshold - 1}` },
          { label: "Anomalies", value: distribution.critical, color: "#ef4444", desc: `score ≥ ${threshold}` },
        ].map(({ label, value, color, desc }) => (
          <div key={label} className="rounded-xl p-4"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value.toLocaleString()}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-disabled)" }}>{desc}</p>
          </div>
        ))}

        <div className="rounded-xl p-4"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
          <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
            Threshold: <span style={{ color: "#f59e0b" }}>{threshold}</span>
          </p>
          <input
            type="range" min={40} max={95} step={5} value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: "#f59e0b" }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--color-text-disabled)" }}>anomaly score cutoff</p>
        </div>
      </div>

      {/* Top suspicious rows table */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <div className="px-5 py-3"
          style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-default)" }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            Top 50 suspicious rows — z-score per column (|z| &gt; 2.5 highlighted)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-default)" }}>
                <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap"
                  style={{ color: "var(--color-text-muted)" }}>Row #</th>
                <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap"
                  style={{ color: "#f59e0b" }}>Score</th>
                {displayCols.map(col => (
                  <th key={col} className="px-4 py-2.5 text-left font-semibold whitespace-nowrap"
                    style={{ color: "var(--color-text-muted)" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topRows.map((row, i) => {
                const isAnomaly = row._score >= threshold;
                return (
                  <tr key={i} style={{
                    borderBottom: "1px solid var(--color-border-subtle)",
                    background: isAnomaly
                      ? "rgba(239,68,68,0.04)"
                      : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  }}>
                    <td className="px-4 py-2.5 font-mono" style={{ color: "var(--color-text-disabled)" }}>
                      {(row._idx + 1).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-bold font-mono"
                      style={{ color: isAnomaly ? "#ef4444" : row._score >= 40 ? "#f59e0b" : "#10b981" }}>
                      {row._score.toFixed(1)}
                    </td>
                    {displayCols.map(col => {
                      const z = row._zScores[col];
                      const high = z !== undefined && z > 2.5;
                      return (
                        <td key={col} className="px-4 py-2.5 font-mono"
                          style={{ color: high ? "#f59e0b" : "var(--color-text-secondary)" }}>
                          {z !== undefined ? z.toFixed(2) : "—"}
                        </td>
                      );
                    })}
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
