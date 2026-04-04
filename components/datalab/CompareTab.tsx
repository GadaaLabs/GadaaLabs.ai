"use client";

import { useState, useMemo } from "react";
import { GitCompare, ArrowUp, ArrowDown, Minus, Upload, X } from "lucide-react";
import { DropZone } from "./DropZone";
import { computeStats, type DatasetSummary } from "@/lib/datalab";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function qualityScore(s: DatasetSummary): number {
  const avg  = s.columns.reduce((acc, c) => acc + c.nullPct, 0) / (s.columns.length || 1);
  const crit = s.columns.filter(c => c.nullPct > 20).length;
  return Math.round(Math.max(0, Math.min(100, 100 - avg * 0.5 - crit * 5)));
}

function qualityColor(score: number) {
  return score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
}

function fmtNum(n: number, decimals = 2) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return n.toFixed(decimals);
}

function Delta({ a, b, invert = false }: { a: number; b: number; invert?: boolean }) {
  const diff = b - a;
  const pct  = a !== 0 ? (diff / Math.abs(a)) * 100 : 0;
  if (Math.abs(pct) < 0.5) return <span style={{ color: "var(--color-text-disabled)" }}>≈</span>;
  const positive = invert ? diff < 0 : diff > 0;
  const color = positive ? "#10b981" : "#ef4444";
  const Icon  = diff > 0 ? ArrowUp : ArrowDown;
  return (
    <span className="inline-flex items-center gap-0.5 font-medium" style={{ color }}>
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

type SchemaStatus = "shared" | "type_change" | "only_a" | "only_b";

interface ColDiff {
  name: string;
  status: SchemaStatus;
  typeA?: string;
  typeB?: string;
}

function buildSchemaDiff(a: DatasetSummary, b: DatasetSummary): ColDiff[] {
  const mapA = new Map(a.columns.map(c => [c.name, c.type]));
  const mapB = new Map(b.columns.map(c => [c.name, c.type]));
  const all  = new Set([...mapA.keys(), ...mapB.keys()]);
  const diffs: ColDiff[] = [];
  for (const name of all) {
    const typeA = mapA.get(name);
    const typeB = mapB.get(name);
    if (typeA && typeB) {
      diffs.push({ name, status: typeA === typeB ? "shared" : "type_change", typeA, typeB });
    } else if (typeA) {
      diffs.push({ name, status: "only_a", typeA });
    } else {
      diffs.push({ name, status: "only_b", typeB });
    }
  }
  // Sort: shared first, then changes, then exclusive
  const order: Record<SchemaStatus, number> = { shared: 0, type_change: 1, only_a: 2, only_b: 3 };
  diffs.sort((x, y) => order[x.status] - order[y.status] || x.name.localeCompare(y.name));
  return diffs;
}

const STATUS_STYLE: Record<SchemaStatus, { label: string; color: string; bg: string }> = {
  shared:      { label: "Shared",       color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  type_change: { label: "Type changed", color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  only_a:      { label: "Only in A",    color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  only_b:      { label: "Only in B",    color: "#06b6d4", bg: "rgba(6,182,212,0.1)"   },
};

const TYPE_COLOR: Record<string, string> = {
  numeric:     "#06b6d4",
  categorical: "#a78bfa",
  boolean:     "#f59e0b",
  datetime:    "#34d399",
  mixed:       "#6b7280",
};

// ─── Compact drop zone (smaller than the main one) ────────────────────────────

function MiniDropZone({ onData, onError, loading }: { onData: (rows: Record<string,unknown>[], name: string, kb: number) => void; onError: (m: string) => void; loading: boolean }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border-default)" }}>
      <DropZone onData={onData} onError={onError} loading={loading} />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { summaryA: DatasetSummary }

export function CompareTab({ summaryA }: Props) {
  const [summaryB, setSummaryB] = useState<DatasetSummary | null>(null);
  const [loadingB, setLoadingB] = useState(false);
  const [errorB,   setErrorB]   = useState<string | null>(null);

  const handleDataB = (rows: Record<string, unknown>[], fileName: string, sizeKB: number) => {
    setLoadingB(true);
    setErrorB(null);
    setTimeout(() => {
      const s = computeStats(rows, fileName, sizeKB);
      setSummaryB(s);
      setLoadingB(false);
    }, 20);
  };

  const schemaDiff = useMemo(
    () => summaryB ? buildSchemaDiff(summaryA, summaryB) : [],
    [summaryA, summaryB]
  );

  const sharedNumericCols = useMemo(() => {
    if (!summaryB) return [];
    const shared = schemaDiff.filter(d => d.status === "shared");
    return summaryA.columns.filter(c =>
      c.type === "numeric" && shared.some(d => d.name === c.name)
    );
  }, [summaryA, summaryB, schemaDiff]);

  const sharedCatCols = useMemo(() => {
    if (!summaryB) return [];
    const shared = schemaDiff.filter(d => d.status === "shared");
    return summaryA.columns.filter(c =>
      (c.type === "categorical" || c.type === "boolean") && shared.some(d => d.name === c.name)
    );
  }, [summaryA, summaryB, schemaDiff]);

  const qA = qualityScore(summaryA);
  const qB = summaryB ? qualityScore(summaryB) : null;

  const counts = useMemo(() => ({
    shared:      schemaDiff.filter(d => d.status === "shared").length,
    typeChanged: schemaDiff.filter(d => d.status === "type_change").length,
    onlyA:       schemaDiff.filter(d => d.status === "only_a").length,
    onlyB:       schemaDiff.filter(d => d.status === "only_b").length,
  }), [schemaDiff]);

  // ── Empty state (no file B yet) ─────────────────────────────────────────────

  if (!summaryB) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="rounded-xl px-5 py-4 flex items-center gap-3"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #38bdf8, #0284c7)" }}>
            <GitCompare className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>Dataset Comparison</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Comparing against: <strong style={{ color: "var(--color-text-secondary)" }}>{summaryA.fileName}</strong>
              {" · "}{summaryA.rowCount.toLocaleString()} rows · {summaryA.columnCount} cols
            </p>
          </div>
        </div>

        <div className="rounded-xl p-6"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
            Upload a second dataset to compare
          </p>
          <p className="text-xs mb-5" style={{ color: "var(--color-text-muted)" }}>
            Schema diff, row count change, per-column stats side-by-side — useful for train/test splits, versioned exports, or A/B data.
          </p>
          <MiniDropZone onData={handleDataB} onError={setErrorB} loading={loadingB} />
          {errorB && (
            <p className="mt-3 text-xs" style={{ color: "var(--color-error)" }}>{errorB}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Comparison view ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header — two cards side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: "Dataset A (current)", s: summaryA, q: qA, accent: "#a78bfa" },
          { label: "Dataset B (comparison)", s: summaryB, q: qB!, accent: "#38bdf8" },
        ].map(({ label, s, q, accent }) => (
          <div key={label} className="rounded-xl px-4 py-3"
            style={{ background: "var(--color-bg-surface)", border: `1px solid ${accent}30` }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>{label}</p>
            <p className="font-bold text-sm truncate" style={{ color: "var(--color-text-primary)" }}>{s.fileName}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
              <span><strong style={{ color: "var(--color-text-secondary)" }}>{s.rowCount.toLocaleString()}</strong> rows</span>
              <span><strong style={{ color: "var(--color-text-secondary)" }}>{s.columnCount}</strong> cols</span>
              <span><strong style={{ color: qualityColor(q) }}>{q}/100</strong> quality</span>
              <span>{s.fileSizeKB} KB</span>
            </div>
          </div>
        ))}
      </div>

      {/* Replace B button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setSummaryB(null); setErrorB(null); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
          <X className="h-3.5 w-3.5" /> Change Dataset B
        </button>
      </div>

      {/* High-level KPI diff */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Row count",    a: summaryA.rowCount,    b: summaryB.rowCount,    invert: false, fmt: (n: number) => n.toLocaleString() },
          { label: "Column count", a: summaryA.columnCount, b: summaryB.columnCount, invert: false, fmt: (n: number) => String(n) },
          { label: "Quality score",a: qA,                   b: qB!,                  invert: false, fmt: (n: number) => `${n}/100` },
          { label: "Avg null %",
            a: summaryA.columns.reduce((s,c)=>s+c.nullPct,0)/(summaryA.columns.length||1),
            b: summaryB.columns.reduce((s,c)=>s+c.nullPct,0)/(summaryB.columns.length||1),
            invert: true,
            fmt: (n: number) => `${n.toFixed(1)}%` },
        ].map(m => (
          <div key={m.label} className="rounded-xl p-3"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>{m.label}</p>
            <p className="text-sm font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
              {m.fmt(m.a)} → {m.fmt(m.b)}
            </p>
            <Delta a={m.a} b={m.b} invert={m.invert} />
          </div>
        ))}
      </div>

      {/* Schema diff overview */}
      <div className="rounded-xl p-4 flex flex-wrap gap-3"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <p className="w-full text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
          Schema Overview — {schemaDiff.length} total columns
        </p>
        {(["shared", "type_change", "only_a", "only_b"] as SchemaStatus[]).map(status => {
          const n = counts[status === "shared" ? "shared" : status === "type_change" ? "typeChanged" : status === "only_a" ? "onlyA" : "onlyB"];
          if (n === 0) return null;
          const st = STATUS_STYLE[status];
          return (
            <div key={status} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}28` }}>
              {n} {st.label}
            </div>
          );
        })}
      </div>

      {/* Schema diff table */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <div className="px-4 py-3 grid grid-cols-4 text-xs font-semibold uppercase tracking-wider"
          style={{ borderBottom: "1px solid var(--color-border-subtle)", color: "var(--color-text-muted)" }}>
          <span>Column</span>
          <span>Status</span>
          <span>Type in A</span>
          <span>Type in B</span>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {schemaDiff.map(diff => {
            const st = STATUS_STYLE[diff.status];
            return (
              <div key={diff.name}
                className="px-4 py-2.5 grid grid-cols-4 items-center text-sm"
                style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                <code className="text-xs truncate" style={{ color: "var(--color-text-primary)" }}>
                  {diff.name}
                </code>
                <span className="text-xs font-medium px-2 py-0.5 rounded w-fit"
                  style={{ background: st.bg, color: st.color }}>
                  {st.label}
                </span>
                {diff.typeA
                  ? <span className="text-xs px-2 py-0.5 rounded w-fit" style={{ background: `${TYPE_COLOR[diff.typeA] ?? "#6b7280"}18`, color: TYPE_COLOR[diff.typeA] ?? "#6b7280" }}>{diff.typeA}</span>
                  : <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>—</span>
                }
                {diff.typeB
                  ? <span className="text-xs px-2 py-0.5 rounded w-fit" style={{ background: `${TYPE_COLOR[diff.typeB] ?? "#6b7280"}18`, color: TYPE_COLOR[diff.typeB] ?? "#6b7280" }}>{diff.typeB}</span>
                  : <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>—</span>
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* Numeric columns comparison */}
      {sharedNumericCols.length > 0 && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
          <div className="px-4 py-3"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Numeric Columns — Side-by-Side
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                  {["Column", "Mean A", "Mean B", "Δ Mean", "Std A", "Std B", "Null% A", "Null% B", "Δ Null%"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: "var(--color-text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sharedNumericCols.map(colA => {
                  const colB = summaryB!.columns.find(c => c.name === colA.name);
                  if (!colB) return null;
                  const meanA = colA.mean ?? 0, meanB = colB.mean ?? 0;
                  const stdA  = colA.std  ?? 0, stdB  = colB.std  ?? 0;
                  const nullA = colA.nullPct,    nullB = colB.nullPct;
                  return (
                    <tr key={colA.name} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                      <td className="px-4 py-2.5">
                        <code style={{ color: "var(--color-text-primary)" }}>{colA.name}</code>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: "#a78bfa" }}>{fmtNum(meanA)}</td>
                      <td className="px-4 py-2.5" style={{ color: "#38bdf8" }}>{fmtNum(meanB)}</td>
                      <td className="px-4 py-2.5"><Delta a={meanA} b={meanB} /></td>
                      <td className="px-4 py-2.5" style={{ color: "var(--color-text-muted)" }}>{fmtNum(stdA)}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--color-text-muted)" }}>{fmtNum(stdB)}</td>
                      <td className="px-4 py-2.5"
                        style={{ color: nullA > 20 ? "#ef4444" : nullA > 5 ? "#f59e0b" : "#10b981" }}>
                        {nullA.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5"
                        style={{ color: nullB > 20 ? "#ef4444" : nullB > 5 ? "#f59e0b" : "#10b981" }}>
                        {nullB.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5"><Delta a={nullA} b={nullB} invert /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categorical columns comparison */}
      {sharedCatCols.length > 0 && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Categorical Columns — Top Values
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
            {sharedCatCols.map(colA => {
              const colB = summaryB!.columns.find(c => c.name === colA.name);
              if (!colB) return null;
              const topA = new Map((colA.topValues ?? []).map(t => [t.value, t.count]));
              const topB = new Map((colB.topValues ?? []).map(t => [t.value, t.count]));
              const allVals = [...new Set([...topA.keys(), ...topB.keys()])].slice(0, 6);
              const totalA  = (colA.topValues ?? []).reduce((s, t) => s + t.count, 0) || 1;
              const totalB  = (colB.topValues ?? []).reduce((s, t) => s + t.count, 0) || 1;
              return (
                <div key={colA.name} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-3">
                    <code className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>{colA.name}</code>
                    <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
                      {colA.unique} unique → {colB.unique} unique
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {allVals.map(val => {
                      const cntA = topA.get(val) ?? 0;
                      const cntB = topB.get(val) ?? 0;
                      const pctA = (cntA / totalA) * 100;
                      const pctB = (cntB / totalB) * 100;
                      return (
                        <div key={val} className="grid gap-1" style={{ gridTemplateColumns: "120px 1fr 1fr 60px" }}>
                          <span className="text-xs truncate self-center" style={{ color: "var(--color-text-secondary)" }}>
                            {val || "(empty)"}
                          </span>
                          <div className="flex items-center gap-1">
                            <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: "var(--color-bg-elevated)" }}>
                              <div style={{ height: "100%", width: `${pctA}%`, background: "#a78bfa", borderRadius: 3 }} />
                            </div>
                            <span className="text-xs w-9 text-right" style={{ color: "#a78bfa" }}>{pctA.toFixed(0)}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: "var(--color-bg-elevated)" }}>
                              <div style={{ height: "100%", width: `${pctB}%`, background: "#38bdf8", borderRadius: 3 }} />
                            </div>
                            <span className="text-xs w-9 text-right" style={{ color: "#38bdf8" }}>{pctB.toFixed(0)}%</span>
                          </div>
                          <Delta a={pctA} b={pctB} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs" style={{ color: "var(--color-text-disabled)" }}>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#a78bfa" }} /> Dataset A
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#38bdf8" }} /> Dataset B
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
