"use client";

import { useState, useMemo, useCallback } from "react";
import { LayoutGrid, Download, ChevronUp, ChevronDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { DatasetSummary } from "@/lib/datalab";

type Row = Record<string, unknown>;
type AggFn = "count" | "mean" | "sum" | "min" | "max";
type SortDir = "asc" | "desc";

// ─── Pivot computation ────────────────────────────────────────────────────────

interface PivotRow { group: string; count: number; [col: string]: number | string }

function computePivot(rows: Row[], groupCol: string, valueCols: string[], aggFn: AggFn): PivotRow[] {
  const buckets = new Map<string, Map<string, number[]>>();

  for (const row of rows) {
    const key = String(row[groupCol] ?? "(empty)");
    if (!buckets.has(key)) {
      buckets.set(key, new Map(valueCols.map(c => [c, []])));
    }
    const b = buckets.get(key)!;
    for (const col of valueCols) {
      const v = parseFloat(String(row[col] ?? ""));
      if (!isNaN(v)) b.get(col)!.push(v);
    }
  }

  const result: PivotRow[] = [];
  for (const [key, valMap] of buckets) {
    const r: PivotRow = { group: key, count: 0 };
    let totalCount = 0;
    for (const col of valueCols) {
      const vals = valMap.get(col)!;
      totalCount = Math.max(totalCount, vals.length);
      if (vals.length === 0) { r[col] = NaN; continue; }
      switch (aggFn) {
        case "count": r[col] = vals.length; break;
        case "mean":  r[col] = vals.reduce((a, b) => a + b, 0) / vals.length; break;
        case "sum":   r[col] = vals.reduce((a, b) => a + b, 0); break;
        case "min":   r[col] = Math.min(...vals); break;
        case "max":   r[col] = Math.max(...vals); break;
      }
    }
    r.count = totalCount;
    result.push(r);
  }
  return result;
}

function exportCSV(rows: PivotRow[], name: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => { const s = String(v ?? ""); return s.includes(",") ? `"${s}"` : s; };
  const csv = [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name; a.click();
}

const AGG_OPTIONS: { value: AggFn; label: string }[] = [
  { value: "count", label: "Count" },
  { value: "mean",  label: "Mean"  },
  { value: "sum",   label: "Sum"   },
  { value: "min",   label: "Min"   },
  { value: "max",   label: "Max"   },
];

const BAR_COLORS = ["#a78bfa", "#06b6d4", "#10b981", "#f59e0b", "#f472b6", "#38bdf8", "#34d399"];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  activeRows: Row[];
  summary: DatasetSummary;
}

export function PivotTab({ activeRows, summary }: Props) {
  const catCols = useMemo(
    () => summary.columns.filter(c => c.type === "categorical" || c.type === "boolean").map(c => c.name),
    [summary.columns]
  );
  const numCols = useMemo(
    () => summary.columns.filter(c => c.type === "numeric").map(c => c.name),
    [summary.columns]
  );

  const [groupCol, setGroupCol]   = useState<string>(() => catCols[0] ?? summary.columns[0]?.name ?? "");
  const [valueCols, setValueCols] = useState<Set<string>>(() => new Set(numCols.slice(0, 4)));
  const [aggFn, setAggFn]         = useState<AggFn>("mean");
  const [sortCol, setSortCol]     = useState<string>("count");
  const [sortDir, setSortDir]     = useState<SortDir>("desc");
  const [barCol, setBarCol]       = useState<string>(() => numCols[0] ?? "");

  const toggleValue = (col: string) => {
    setValueCols(prev => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });
  };

  const pivotRows = useMemo(() => {
    if (!groupCol || valueCols.size === 0 || activeRows.length === 0) return [];
    return computePivot(activeRows, groupCol, [...valueCols], aggFn);
  }, [activeRows, groupCol, valueCols, aggFn]);

  const sorted = useMemo(() => {
    if (!pivotRows.length) return [];
    return [...pivotRows].sort((a, b) => {
      const va = sortCol === "group" ? String(a.group) : Number(a[sortCol]) || 0;
      const vb = sortCol === "group" ? String(b.group) : Number(b[sortCol]) || 0;
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [pivotRows, sortCol, sortDir]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  // Top 15 groups for bar chart
  const chartData = useMemo(() => {
    if (!sorted.length || !barCol || !valueCols.has(barCol)) return [];
    return sorted
      .filter(r => !isNaN(Number(r[barCol])))
      .slice(0, 15)
      .map(r => ({ name: r.group.length > 14 ? r.group.slice(0, 14) + "…" : r.group, value: Number(r[barCol]) }));
  }, [sorted, barCol, valueCols]);

  const fmt = (v: unknown) => {
    const n = Number(v);
    if (isNaN(n)) return "—";
    return Math.abs(n) >= 10000 ? n.toFixed(0) : Math.abs(n) >= 10 ? n.toFixed(2) : n.toFixed(4);
  };

  const noRows = activeRows.length === 0;

  if (noRows) {
    return (
      <div className="rounded-xl p-10 text-center"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <LayoutGrid className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--color-text-disabled)" }} />
        <p className="font-semibold text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>Re-upload your file</p>
        <p className="text-xs max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
          Pivot analysis requires the full dataset. Upload your file to enable this tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #34d399, #059669)" }}>
            <LayoutGrid className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>Pivot Table</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {sorted.length} groups · {activeRows.length.toLocaleString()} rows aggregated
            </p>
          </div>
        </div>
        {sorted.length > 0 && (
          <button onClick={() => exportCSV(sorted, summary.fileName.replace(/\.[^.]+$/, "") + `_pivot_${groupCol}.csv`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        )}
      </div>

      {/* Config */}
      <div className="rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-5"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        {/* Group by */}
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Group by
          </label>
          <select value={groupCol} onChange={e => setGroupCol(e.target.value)}
            className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}>
            {summary.columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        {/* Aggregation */}
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Aggregation
          </label>
          <select value={aggFn} onChange={e => setAggFn(e.target.value as AggFn)}
            className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}>
            {AGG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Chart column */}
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Bar chart column
          </label>
          <select value={barCol} onChange={e => setBarCol(e.target.value)}
            className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}>
            <option value="">(none)</option>
            {numCols.filter(c => valueCols.has(c)).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Value columns */}
        <div className="sm:col-span-3">
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Value Columns — {valueCols.size} selected
          </label>
          <div className="flex flex-wrap gap-2">
            {numCols.map(col => {
              const on = valueCols.has(col);
              return (
                <button key={col} onClick={() => toggleValue(col)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: on ? "rgba(52,211,153,0.15)" : "var(--color-bg-elevated)",
                    border: `1px solid ${on ? "rgba(52,211,153,0.4)" : "var(--color-border-default)"}`,
                    color: on ? "#34d399" : "var(--color-text-muted)",
                  }}>
                  {col}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && barCol && (
        <div className="rounded-xl p-5"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--color-text-muted)" }}>
            {aggFn.charAt(0).toUpperCase() + aggFn.slice(1)} of {barCol} by {groupCol} (top 15)
          </p>
          <div style={{ height: 240, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 80 }}>
                <XAxis type="number" tick={{ fill: "var(--color-text-disabled)", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }} width={80} />
                <Tooltip
                  contentStyle={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: unknown) => [(v as number).toFixed(3), aggFn + "(" + barCol + ")"]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Pivot table */}
      {sorted.length > 0 && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-default)" }}>
                  {[{ key: "group", label: groupCol }, { key: "count", label: "Count" }, ...[...valueCols].map(c => ({ key: c, label: `${aggFn}(${c})` }))].map(h => (
                    <th key={h.key}
                      onClick={() => toggleSort(h.key)}
                      className="px-4 py-2.5 text-left font-semibold cursor-pointer select-none whitespace-nowrap"
                      style={{ color: sortCol === h.key ? "var(--color-purple-300)" : "var(--color-text-muted)" }}>
                      <span className="inline-flex items-center gap-1">
                        {h.label}
                        {sortCol === h.key && (sortDir === "asc"
                          ? <ChevronUp className="h-3 w-3 shrink-0" />
                          : <ChevronDown className="h-3 w-3 shrink-0" />)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr key={row.group}
                    style={{
                      borderBottom: "1px solid var(--color-border-subtle)",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                    }}>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: BAR_COLORS[i % BAR_COLORS.length] }}>
                      {row.group}
                    </td>
                    <td className="px-4 py-2.5 font-mono" style={{ color: "var(--color-text-secondary)" }}>
                      {row.count.toLocaleString()}
                    </td>
                    {[...valueCols].map(col => (
                      <td key={col} className="px-4 py-2.5 font-mono" style={{ color: isNaN(Number(row[col])) ? "var(--color-text-disabled)" : "var(--color-text-secondary)" }}>
                        {fmt(row[col])}
                      </td>
                    ))}
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
