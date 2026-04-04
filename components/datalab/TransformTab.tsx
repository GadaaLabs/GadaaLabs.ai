"use client";

import { useState, useCallback } from "react";
import { Download, RefreshCw, Trash2, Wand2, RotateCcw, Check } from "lucide-react";
import { computeStats, type DatasetSummary, type ColumnStats } from "@/lib/datalab";

type Row = Record<string, unknown>;
type NullStrategy = "mean" | "median" | "mode" | "zero" | "constant" | "drop_row";
type Encoding = "none" | "label" | "onehot";

interface ColConfig {
  drop: boolean;
  nullStrategy: NullStrategy;
  encoding: Encoding;
  constant: string;
}

function defaultConfig(col: ColumnStats): ColConfig {
  return {
    drop: false,
    nullStrategy: col.type === "numeric" ? "mean" : "mode",
    encoding: col.type === "categorical" || col.type === "boolean" ? "label" : "none",
    constant: "",
  };
}

function applyTransforms(rawRows: Row[], summary: DatasetSummary, cfgs: Record<string, ColConfig>): Row[] {
  const keptCols = summary.columns.filter(c => !cfgs[c.name]?.drop);

  // Pre-compute fill values from precomputed stats
  const fill: Record<string, unknown> = {};
  for (const col of keptCols) {
    const cfg = cfgs[col.name];
    if (!cfg || col.nullCount === 0) continue;
    if (cfg.nullStrategy === "mean" && col.mean !== undefined) fill[col.name] = col.mean;
    else if (cfg.nullStrategy === "median" && col.p50 !== undefined) fill[col.name] = col.p50;
    else if (cfg.nullStrategy === "mode" && col.topValues?.[0]) fill[col.name] = col.topValues[0].value;
    else if (cfg.nullStrategy === "zero") fill[col.name] = col.type === "numeric" ? 0 : "0";
    else if (cfg.nullStrategy === "constant") fill[col.name] = cfg.constant;
  }

  // Build encoders (needs full pass for consistent mapping)
  const labelEnc: Record<string, Map<string, number>> = {};
  const onehotCats: Record<string, string[]> = {};
  for (const col of keptCols) {
    const cfg = cfgs[col.name];
    if (cfg?.encoding === "label") {
      const uniques = [...new Set(rawRows.map(r => String(r[col.name] ?? "")))].sort();
      labelEnc[col.name] = new Map(uniques.map((v, i) => [v, i]));
    } else if (cfg?.encoding === "onehot") {
      onehotCats[col.name] = [...new Set(rawRows.map(r => String(r[col.name] ?? "")))].sort().slice(0, 15);
    }
  }

  const result: Row[] = [];
  for (const row of rawRows) {
    const out: Row = {};
    let skip = false;
    for (const col of keptCols) {
      const cfg = cfgs[col.name];
      const isNull = row[col.name] === null || row[col.name] === undefined || row[col.name] === "";
      if (isNull && cfg?.nullStrategy === "drop_row") { skip = true; break; }
      const val = isNull ? (fill[col.name] ?? row[col.name]) : row[col.name];
      if (cfg?.encoding === "label" && labelEnc[col.name]) {
        out[col.name] = labelEnc[col.name].get(String(val ?? "")) ?? 0;
      } else if (cfg?.encoding === "onehot" && onehotCats[col.name]) {
        for (const u of onehotCats[col.name]) out[`${col.name}_${u}`] = String(val) === u ? 1 : 0;
      } else {
        out[col.name] = val;
      }
    }
    if (!skip) result.push(out);
  }
  return result;
}

function exportCSV(rows: Row[], fileName: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = fileName; a.click();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NULL_OPT_NUM: { value: NullStrategy; label: string }[] = [
  { value: "mean",     label: "Fill mean"     },
  { value: "median",   label: "Fill median"   },
  { value: "zero",     label: "Fill 0"        },
  { value: "constant", label: "Fill constant" },
  { value: "drop_row", label: "Drop row"      },
];
const NULL_OPT_CAT: { value: NullStrategy; label: string }[] = [
  { value: "mode",     label: "Fill mode"     },
  { value: "constant", label: "Fill constant" },
  { value: "drop_row", label: "Drop row"      },
];
const ENC_OPT: { value: Encoding; label: string }[] = [
  { value: "none",   label: "No encoding"     },
  { value: "label",  label: "Label encode"    },
  { value: "onehot", label: "One-hot (≤15)"   },
];
const TYPE_COLOR: Record<string, string> = {
  numeric:     "#06b6d4",
  categorical: "#a78bfa",
  boolean:     "#f59e0b",
  datetime:    "#34d399",
  mixed:       "#6b7280",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  rawRows: Row[];
  summary: DatasetSummary;
  onReanalyze: (summary: DatasetSummary, newRows: Row[]) => void;
}

export function TransformTab({ rawRows, summary, onReanalyze }: Props) {
  const [cfgs, setCfgs] = useState<Record<string, ColConfig>>(
    () => Object.fromEntries(summary.columns.map(c => [c.name, defaultConfig(c)]))
  );
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [result, setResult] = useState<{ rows: number; cols: number } | null>(null);

  const patch = useCallback((colName: string, delta: Partial<ColConfig>) => {
    setCfgs(prev => ({ ...prev, [colName]: { ...prev[colName], ...delta } }));
    setApplied(false);
  }, []);

  const droppedCount = Object.values(cfgs).filter(c => c.drop).length;

  const handleApply = useCallback(() => {
    setApplying(true);
    setTimeout(() => {
      const rows = applyTransforms(rawRows, summary, cfgs);
      const ext = summary.fileName.match(/\.[^.]+$/)?.[0] ?? ".csv";
      const name = summary.fileName.replace(/\.[^.]+$/, "") + "_transformed" + ext;
      const sizeKB = Math.round(rows.length * summary.columnCount * 8 / 1024);
      const newSummary = computeStats(rows, name, sizeKB);
      setResult({ rows: rows.length, cols: Object.keys(rows[0] ?? {}).length });
      setApplied(true);
      setApplying(false);
      onReanalyze(newSummary, rows);
    }, 20);
  }, [rawRows, summary, cfgs, onReanalyze]);

  const handleExport = useCallback(() => {
    const rows = applyTransforms(rawRows, summary, cfgs);
    exportCSV(rows, summary.fileName.replace(/\.[^.]+$/, "") + "_transformed.csv");
  }, [rawRows, summary, cfgs]);

  const handleReset = useCallback(() => {
    setCfgs(Object.fromEntries(summary.columns.map(c => [c.name, defaultConfig(c)])));
    setApplied(false);
    setResult(null);
  }, [summary.columns]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}>
            <Wand2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>Data Transformer</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {summary.rowCount.toLocaleString()} rows · {summary.columnCount} cols
              {droppedCount > 0 && (
                <span style={{ color: "#ef4444" }}> · {droppedCount} marked for drop</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button onClick={handleApply} disabled={applying}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", boxShadow: "0 0 18px rgba(124,58,237,0.3)" }}>
            {applying
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Wand2 className="h-4 w-4" />}
            {applying ? "Applying…" : "Apply & Re-analyze"}
          </button>
        </div>
      </div>

      {/* Success banner */}
      {applied && result && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-2 text-sm"
          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}>
          <Check className="h-4 w-4 shrink-0" />
          Transforms applied — {result.rows.toLocaleString()} rows · {result.cols} columns. All tabs updated with new data.
        </div>
      )}

      {/* Column cards */}
      <div className="space-y-2">
        {summary.columns.map(col => {
          const cfg = cfgs[col.name] ?? defaultConfig(col);
          const isCat = col.type === "categorical" || col.type === "boolean";
          const hasNulls = col.nullCount > 0;
          const tc = TYPE_COLOR[col.type] ?? "#6b7280";

          return (
            <div key={col.name}
              className="rounded-xl px-4 py-3 transition-all"
              style={{
                background: cfg.drop ? "rgba(239,68,68,0.05)" : "var(--color-bg-surface)",
                border: `1px solid ${cfg.drop ? "rgba(239,68,68,0.2)" : "var(--color-border-default)"}`,
                opacity: cfg.drop ? 0.55 : 1,
              }}>
              <div className="flex flex-wrap items-center gap-3">
                {/* Name + type badge */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <code className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                    {col.name}
                  </code>
                  <span className="shrink-0 text-xs px-2 py-0.5 rounded font-medium"
                    style={{ background: `${tc}18`, color: tc, border: `1px solid ${tc}28` }}>
                    {col.type}
                  </span>
                  {hasNulls && (
                    <span className="shrink-0 text-xs font-medium" style={{ color: "#f59e0b" }}>
                      {col.nullPct}% null
                    </span>
                  )}
                </div>

                {/* Null strategy */}
                {hasNulls && !cfg.drop && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>Nulls:</span>
                    <select value={cfg.nullStrategy}
                      onChange={e => patch(col.name, { nullStrategy: e.target.value as NullStrategy })}
                      className="text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                      style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
                      {(col.type === "numeric" ? NULL_OPT_NUM : NULL_OPT_CAT).map(o =>
                        <option key={o.value} value={o.value}>{o.label}</option>
                      )}
                    </select>
                    {cfg.nullStrategy === "constant" && (
                      <input value={cfg.constant}
                        onChange={e => patch(col.name, { constant: e.target.value })}
                        placeholder="value"
                        className="text-xs rounded-lg px-2 py-1.5 outline-none w-20"
                        style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}
                      />
                    )}
                  </div>
                )}

                {/* Encoding */}
                {isCat && !cfg.drop && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>Encode:</span>
                    <select value={cfg.encoding}
                      onChange={e => patch(col.name, { encoding: e.target.value as Encoding })}
                      className="text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                      style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
                      {ENC_OPT.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                )}

                {/* Drop toggle */}
                <button onClick={() => patch(col.name, { drop: !cfg.drop })}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: cfg.drop ? "rgba(239,68,68,0.12)" : "var(--color-bg-elevated)",
                    border: `1px solid ${cfg.drop ? "rgba(239,68,68,0.3)" : "var(--color-border-default)"}`,
                    color: cfg.drop ? "#ef4444" : "var(--color-text-muted)",
                  }}>
                  <Trash2 className="h-3 w-3" />
                  {cfg.drop ? "Restore" : "Drop"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
