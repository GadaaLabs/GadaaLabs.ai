"use client";

import { useMemo } from "react";
import { ShieldCheck, CheckCircle2, AlertCircle, Info } from "lucide-react";
import type { DatasetSummary } from "@/lib/datalab";

// ─── Quality computation ──────────────────────────────────────────────────────

interface DimensionScore {
  name: string;
  score: number;
  color: string;
  desc: string;
  issues: string[];
}

interface QualityResult {
  overall: number;
  dimensions: DimensionScore[];
  columnIssues: { col: string; severity: "error" | "warn" | "info"; message: string; suggestion: string }[];
  recommendations: string[];
}

function computeQuality(summary: DatasetSummary): QualityResult {
  const cols = summary.columns;
  const n = summary.rowCount;
  const totalCols = cols.length;

  // ── Completeness ─────────────────────────────────────────────────────────────
  const avgNullRate = totalCols > 0
    ? cols.reduce((s, c) => s + (c.nullCount / n), 0) / totalCols
    : 0;
  const completeness = Math.round((1 - avgNullRate) * 100);
  const completenessIssues: string[] = [];
  const highNullCols = cols.filter(c => c.nullCount / n > 0.2);
  const anyNullCols = cols.filter(c => c.nullCount > 0);
  if (highNullCols.length > 0) completenessIssues.push(`${highNullCols.length} column(s) >20% missing`);
  if (anyNullCols.length > 0) completenessIssues.push(`${anyNullCols.length}/${totalCols} columns contain nulls`);

  // ── Uniqueness ───────────────────────────────────────────────────────────────
  const numCols = cols.filter(c => c.type === "numeric");
  const lowCardNumeric = numCols.filter(c => (c.unique ?? 0) < 10 && (c.unique ?? 0) / n < 0.01);
  const hasUniqueKey = cols.some(c => (c.unique ?? 0) / n > 0.95);
  let uniqueness = hasUniqueKey ? 95 : n < 1000 ? 90 : 80;
  const uniquenessIssues: string[] = [];
  if (lowCardNumeric.length > 0) {
    uniqueness -= Math.min(15, lowCardNumeric.length * 5);
    uniquenessIssues.push(`${lowCardNumeric.length} numeric col(s) with very low cardinality`);
  }
  if (!hasUniqueKey && n > 100) uniquenessIssues.push("No unique identifier column found");
  uniqueness = Math.max(0, uniqueness);

  // ── Consistency ──────────────────────────────────────────────────────────────
  const mixedCols = cols.filter(c => c.type === "mixed");
  const allNullCols = cols.filter(c => c.nullCount === n);
  const outlierCols = numCols.filter(c => (c.outlierCount ?? 0) / n > 0.05);
  let consistency = 100;
  const consistencyIssues: string[] = [];
  if (mixedCols.length > 0) { consistency -= mixedCols.length * 10; consistencyIssues.push(`${mixedCols.length} mixed-type column(s)`); }
  if (outlierCols.length > 0) { consistency -= Math.min(20, outlierCols.length * 5); consistencyIssues.push(`${outlierCols.length} column(s) >5% outliers`); }
  if (allNullCols.length > 0) { consistency -= allNullCols.length * 15; consistencyIssues.push(`${allNullCols.length} fully-null column(s)`); }
  consistency = Math.max(0, consistency);

  // ── Validity ─────────────────────────────────────────────────────────────────
  const catCols = cols.filter(c => c.type === "categorical" || c.type === "boolean");
  const highCardCat = catCols.filter(c => (c.unique ?? 0) > 50);
  const skewedCols = numCols.filter(c => c.distributionShape === "skewed");
  const bimodalCols = numCols.filter(c => c.distributionShape === "bimodal");
  let validity = 100;
  const validityIssues: string[] = [];
  if (highCardCat.length > 0) { validity -= Math.min(15, highCardCat.length * 5); validityIssues.push(`${highCardCat.length} high-cardinality categorical(s) >50 values`); }
  if (numCols.length > 0 && skewedCols.length > numCols.length * 0.5) { validity -= 10; validityIssues.push(`${skewedCols.length} skewed numeric columns`); }
  if (bimodalCols.length > 0) { validity -= Math.min(15, bimodalCols.length * 5); validityIssues.push(`${bimodalCols.length} bimodal distribution(s)`); }
  validity = Math.max(0, validity);

  const overall = Math.round((completeness + uniqueness + consistency + validity) / 4);

  // ── Per-column issues ────────────────────────────────────────────────────────
  const columnIssues: QualityResult["columnIssues"] = [];
  for (const col of cols) {
    const nullRate = col.nullCount / n;
    if (col.nullCount === n) {
      columnIssues.push({ col: col.name, severity: "error", message: "100% null — fully empty", suggestion: "Drop this column" });
    } else if (nullRate > 0.4) {
      columnIssues.push({ col: col.name, severity: "error", message: `${(nullRate * 100).toFixed(0)}% null`, suggestion: "Consider dropping or imputing" });
    } else if (nullRate > 0.1) {
      columnIssues.push({ col: col.name, severity: "warn", message: `${(nullRate * 100).toFixed(0)}% null`, suggestion: "Impute with mean/mode or flag column" });
    }
    if (col.type === "mixed") {
      columnIssues.push({ col: col.name, severity: "error", message: "Mixed data types detected", suggestion: "Cast to a single type before training" });
    }
    if (col.type === "numeric" && (col.outlierCount ?? 0) / n > 0.1) {
      columnIssues.push({ col: col.name, severity: "warn", message: `${((col.outlierCount ?? 0) / n * 100).toFixed(0)}% outliers`, suggestion: "Apply IQR capping or log transform" });
    }
    if (col.distributionShape === "skewed") {
      columnIssues.push({ col: col.name, severity: "info", message: "Skewed distribution", suggestion: "Log or Box-Cox transform before linear models" });
    }
    if ((col.unique ?? 0) / n < 0.001 && col.type === "numeric" && n > 500) {
      columnIssues.push({ col: col.name, severity: "info", message: "Near-constant numeric column", suggestion: "Low variance — consider dropping" });
    }
  }
  columnIssues.sort((a, b) => {
    const ord = { error: 0, warn: 1, info: 2 };
    return ord[a.severity] - ord[b.severity];
  });

  // ── Recommendations ──────────────────────────────────────────────────────────
  const recommendations: string[] = [];
  if (highNullCols.length > 0) recommendations.push(`Impute or drop: ${highNullCols.map(c => `"${c.name}"`).join(", ")} (>20% null)`);
  if (allNullCols.length > 0) recommendations.push(`Drop fully-null columns: ${allNullCols.map(c => `"${c.name}"`).join(", ")}`);
  if (outlierCols.length > 0) recommendations.push(`Cap or transform outlier-heavy columns: ${outlierCols.map(c => `"${c.name}"`).join(", ")}`);
  if (skewedCols.length > 0) recommendations.push(`Apply log/Box-Cox to skewed numerics: ${skewedCols.slice(0, 4).map(c => `"${c.name}"`).join(", ")}${skewedCols.length > 4 ? " …" : ""}`);
  if (mixedCols.length > 0) recommendations.push(`Fix mixed-type columns before encoding: ${mixedCols.map(c => `"${c.name}"`).join(", ")}`);
  if (highCardCat.length > 0) recommendations.push(`Target-encode or hash high-cardinality categoricals: ${highCardCat.slice(0, 3).map(c => `"${c.name}"`).join(", ")}${highCardCat.length > 3 ? " …" : ""}`);
  if (recommendations.length === 0) recommendations.push("Dataset is clean. No critical issues detected — proceed to feature engineering and modeling.");

  return {
    overall,
    dimensions: [
      { name: "Completeness", score: completeness, color: "#10b981", desc: "Non-null cell coverage", issues: completenessIssues },
      { name: "Uniqueness",   score: uniqueness,   color: "#06b6d4", desc: "Distinct value quality", issues: uniquenessIssues },
      { name: "Consistency",  score: consistency,  color: "#a78bfa", desc: "Type & outlier health", issues: consistencyIssues },
      { name: "Validity",     score: validity,     color: "#f59e0b", desc: "Distribution integrity", issues: validityIssues },
    ],
    columnIssues,
    recommendations,
  };
}

// ─── SVG ring gauge ───────────────────────────────────────────────────────────

function RingGauge({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size / 2) * 0.72;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Good" : score >= 60 ? "Fair" : "Poor";

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border-default)" strokeWidth={10} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size * 0.2, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.1, color: "var(--color-text-muted)", marginTop: 2 }}>{label}</span>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props { summary: DatasetSummary }

export function DataQualityTab({ summary }: Props) {
  const result = useMemo(() => computeQuality(summary), [summary]);

  const severityIcon = (s: "error" | "warn" | "info") => {
    if (s === "error") return <AlertCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "#ef4444" }} />;
    if (s === "warn")  return <AlertCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "#f59e0b" }} />;
    return <Info className="h-3.5 w-3.5 shrink-0" style={{ color: "#06b6d4" }} />;
  };

  const severityColor = (s: "error" | "warn" | "info") =>
    s === "error" ? "#ef4444" : s === "warn" ? "#f59e0b" : "#06b6d4";

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="rounded-xl px-5 py-4 flex flex-wrap items-center gap-4"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>Data Quality Scorecard</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {summary.columnCount} columns · {summary.rowCount.toLocaleString()} rows · rule-based analysis
            </p>
          </div>
        </div>
      </div>

      {/* Overall score + dimensions */}
      <div className="rounded-xl p-5 grid grid-cols-1 sm:grid-cols-5 gap-6 items-center"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>

        {/* Ring gauge */}
        <div className="flex flex-col items-center gap-2 sm:col-span-1">
          <RingGauge score={result.overall} size={110} />
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Overall
          </p>
        </div>

        {/* Dimension cards */}
        <div className="sm:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {result.dimensions.map(d => (
            <div key={d.name} className="rounded-xl p-3"
              style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>{d.name}</p>
                <span className="text-sm font-bold" style={{ color: d.color }}>{d.score}</span>
              </div>
              {/* Mini bar */}
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border-default)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${d.score}%`, background: d.color }} />
              </div>
              <p className="text-xs mt-1.5" style={{ color: "var(--color-text-disabled)" }}>{d.desc}</p>
              {d.issues.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {d.issues.map((iss, i) => (
                    <li key={i} className="text-xs" style={{ color: "var(--color-text-muted)" }}>· {iss}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="rounded-xl p-5"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
          Recommendations
        </p>
        <ul className="space-y-2">
          {result.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#10b981" }} />
              {rec}
            </li>
          ))}
        </ul>
      </div>

      {/* Per-column issues table */}
      {result.columnIssues.length > 0 && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
          <div className="px-5 py-3"
            style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-default)" }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Column Issues — {result.columnIssues.length} found
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-default)" }}>
                  {["Severity", "Column", "Issue", "Suggestion"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold whitespace-nowrap"
                      style={{ color: "var(--color-text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.columnIssues.map((issue, i) => (
                  <tr key={i} style={{
                    borderBottom: "1px solid var(--color-border-subtle)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  }}>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        {severityIcon(issue.severity)}
                        <span className="font-semibold uppercase tracking-wide text-xs"
                          style={{ color: severityColor(issue.severity) }}>
                          {issue.severity}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {issue.col}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>
                      {issue.message}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--color-text-muted)" }}>
                      {issue.suggestion}
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
