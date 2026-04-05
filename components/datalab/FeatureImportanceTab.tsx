// components/datalab/FeatureImportanceTab.tsx
"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Info } from "lucide-react";
import type { DatasetSummary } from "@/lib/datalab";

type Row = Record<string, unknown>;

const TOOLTIP_STYLE = {
  contentStyle: { background: "#161625", border: "1px solid #2a2a45", borderRadius: 8, fontSize: 11 },
  labelStyle: { color: "#f0f0ff", fontWeight: 600 },
  itemStyle: { color: "#a8a8c0" },
};

const ROW_CAP = 5000;

function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

interface FeatureImportanceTabProps {
  summary: DatasetSummary;
  activeRows: Row[];
}

export function FeatureImportanceTab({ summary, activeRows }: FeatureImportanceTabProps) {
  const target = summary.detectedTarget;

  const results = useMemo(() => {
    if (!target || activeRows.length === 0) return null;

    const rows = activeRows.slice(0, ROW_CAP);
    const targetCol = summary.columns.find(c => c.name === target);
    const isTargetNumeric = targetCol?.type === "numeric";

    let targetVals: number[];
    if (isTargetNumeric) {
      targetVals = rows.map(r => Number(r[target]));
    } else {
      const uniq = [...new Set(rows.map(r => String(r[target] ?? "")))].sort();
      const enc = Object.fromEntries(uniq.map((v, i) => [v, i]));
      targetVals = rows.map(r => enc[String(r[target] ?? "")] ?? 0);
    }

    return summary.columns
      .filter(c => c.name !== target && c.type === "numeric")
      .map(c => {
        const featureVals = rows.map(r => Number(r[c.name]));
        const pairs = featureVals
          .map((v, i) => [v, targetVals[i]] as [number, number])
          .filter(([x, y]) => isFinite(x) && isFinite(y));
        const r = pearsonR(pairs.map(p => p[0]), pairs.map(p => p[1]));
        return { name: c.name, importance: Math.abs(r), r };
      })
      .sort((a, b) => b.importance - a.importance);
  }, [summary, activeRows, target]);

  if (!target) {
    return (
      <div
        className="flex items-center justify-center py-20 rounded-xl"
        style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}
      >
        <p className="text-sm text-center max-w-sm" style={{ color: "var(--color-text-muted)" }}>
          No target column detected. Name a column{" "}
          <code className="font-mono text-xs px-1 rounded" style={{ background: "var(--color-bg-surface)" }}>target</code>,{" "}
          <code className="font-mono text-xs px-1 rounded" style={{ background: "var(--color-bg-surface)" }}>label</code>,{" "}
          <code className="font-mono text-xs px-1 rounded" style={{ background: "var(--color-bg-surface)" }}>y</code>, or{" "}
          <code className="font-mono text-xs px-1 rounded" style={{ background: "var(--color-bg-surface)" }}>class</code>{" "}
          to enable this tab.
        </p>
      </div>
    );
  }

  if (activeRows.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-20 rounded-xl"
        style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}
      >
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Raw data not available. Re-upload your dataset to compute feature importance.
        </p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-20 rounded-xl"
        style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}
      >
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          No numeric feature columns found to rank.
        </p>
      </div>
    );
  }

  const usedRows = Math.min(activeRows.length, ROW_CAP);
  const targetColMeta = summary.columns.find(c => c.name === target);
  const barHeight = 32;
  const chartHeight = Math.max(results.length * barHeight + 40, 200);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
            Feature Importance
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Pearson |r| vs target column · {results.length} features ranked
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-5 mb-4"
        style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}
      >
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={results}
              layout="vertical"
              margin={{ top: 4, right: 60, bottom: 4, left: 0 }}
            >
              <XAxis
                type="number"
                domain={[0, 1]}
                tick={{ fontSize: 10, fill: "#6b6b88" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 10, fill: "#a8a8c0", fontFamily: "monospace" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v: unknown, _: unknown, props: { payload?: { r?: number } }) => {
                  const r = props?.payload?.r ?? 0;
                  const dir = r >= 0 ? "positively correlated" : "negatively correlated";
                  return [`|r| = ${Number(v).toFixed(3)} (${dir})`, "Importance"];
                }}
              />
              <Bar dataKey="importance" radius={[0, 3, 3, 0]} maxBarSize={24}>
                {results.map((_, i) => (
                  <Cell key={i} fill={i < 3 ? "#7c3aed" : "rgba(124,58,237,0.4)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        className="rounded-xl px-4 py-3 flex items-start gap-3"
        style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)" }}
      >
        <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-purple-400)" }} />
        <div className="space-y-1">
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Target:{" "}
            <code className="font-mono" style={{ color: "var(--color-purple-400)" }}>{target}</code>
            {" "}({targetColMeta?.type ?? "unknown"}) · computed on {usedRows.toLocaleString()} rows · Method: Pearson |r|
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Pearson correlation measures linear association. For non-linear relationships,
            train a model in the Train Model tab for weights-based importance.
          </p>
        </div>
      </div>
    </div>
  );
}
