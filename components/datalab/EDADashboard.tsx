"use client";

import { useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, ComposedChart, Line, ScatterChart,
  Scatter, LineChart, PieChart, Pie,
} from "recharts";
import type { DatasetSummary, ColumnStats } from "@/lib/datalab";
import { ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const PALETTE = ["#7c3aed","#06b6d4","#f59e0b","#10b981","#6366f1","#ec4899","#f97316","#38bdf8"];
const TOOLTIP_STYLE = {
  contentStyle: { background: "#161625", border: "1px solid #2a2a45", borderRadius: 8, fontSize: 11 },
  labelStyle: { color: "#f0f0ff", fontWeight: 600 },
  itemStyle: { color: "#a8a8c0" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  if (Math.abs(n) < 0.01 && n !== 0) return n.toExponential(2);
  return n.toFixed(Math.abs(n) < 10 ? 2 : 0);
}

function computeQualityScore(summary: DatasetSummary): number {
  const avg = summary.columns.reduce((s, c) => s + c.nullPct, 0) / (summary.columns.length || 1);
  const crit = summary.columns.filter(c => c.nullPct > 20).length;
  return Math.round(Math.max(0, Math.min(100, 100 - avg * 0.5 - crit * 5)));
}

// Correlation color: -1 = blue, 0 = transparent, +1 = red
function corrColor(r: number): string {
  const abs = Math.abs(r);
  if (r > 0) return `rgba(239,68,68,${(abs * 0.85).toFixed(2)})`;
  if (r < 0) return `rgba(59,130,246,${(abs * 0.85).toFixed(2)})`;
  return "rgba(60,60,80,0.15)";
}

// ─── Rule-based insight fallbacks ─────────────────────────────────────────────

function numericInsight(col: ColumnStats): string {
  const mean = col.mean ?? 0, p50 = col.p50 ?? 0, std = col.std ?? 0;
  const p25 = col.p25 ?? 0, p75 = col.p75 ?? 0;
  const iqr = p75 - p25;
  const parts: string[] = [];

  const skew = col.skewness ?? (std > 0 ? (mean - p50) / std : 0);
  if (skew > 0.5) {
    parts.push(`Right-skewed (skewness ${skew.toFixed(2)}): mean (${fmt(mean)}) exceeds median (${fmt(p50)}) — log1p transform recommended.`);
  } else if (skew < -0.5) {
    parts.push(`Left-skewed (skewness ${skew.toFixed(2)}): consider Yeo-Johnson transform.`);
  } else {
    parts.push(`Near-symmetric distribution — mean (${fmt(mean)}) ≈ median (${fmt(p50)}).`);
  }

  const highFence = p75 + 1.5 * iqr;
  if (col.max !== undefined && col.max > highFence && iqr > 0) {
    parts.push(`Outliers above IQR fence (${fmt(highFence)}): max ${fmt(col.max)} is ${((col.max - highFence) / iqr).toFixed(1)}× IQR beyond Q3.`);
  }
  if (col.nullPct > 5) parts.push(`${col.nullPct.toFixed(1)}% missing — imputation required.`);
  return parts.join(" ");
}

function catInsight(col: ColumnStats): string {
  if (!col.topValues?.length) return "No value frequency data.";
  const top = col.topValues[0];
  const pct = ((top.count / col.count) * 100).toFixed(1);
  const parts: string[] = [];
  if (parseFloat(pct) > 80) parts.push(`Highly imbalanced: "${top.value}" = ${pct}% — class imbalance handling required.`);
  else if (parseFloat(pct) > 50) parts.push(`Moderate concentration: "${top.value}" = ${pct}%.`);
  else parts.push(`Well-distributed: top value "${top.value}" = ${pct}%.`);
  if (col.unique > 50) parts.push(`High cardinality (${col.unique} unique) — use target encoding or embedding.`);
  else parts.push(`${col.unique} unique values — one-hot encoding is safe.`);
  return parts.join(" ");
}

// ─── AI Insights parser ───────────────────────────────────────────────────────

function parseInsightLines(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  const re = /INSIGHT\[([^\]]+)\]:\s*(.+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    result[m[1].trim()] = m[2].trim();
  }
  return result;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NullBadge({ pct }: { pct: number }) {
  const [bg, color] =
    pct === 0 ? ["rgba(16,185,129,0.15)", "#10b981"] :
    pct > 20  ? ["rgba(239,68,68,0.15)",  "#ef4444"] :
                ["rgba(245,158,11,0.15)", "#f59e0b"];
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: bg, color }}>
      {pct === 0 ? "Complete" : `${pct.toFixed(1)}% missing`}
    </span>
  );
}

function InsightBox({ color, text, isAI }: { color: string; text: string; isAI?: boolean }) {
  return (
    <div className="mt-3 rounded-lg px-3 py-2.5"
      style={{ background: `${color}0d`, border: `1px solid ${color}28` }}>
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        <span className="font-semibold" style={{ color }}>
          {isAI ? "✨ AI Insight: " : "Insight: "}
        </span>
        {text}
      </p>
    </div>
  );
}

function BoxPlot({ min, p25, p50, p75, max, color }: {
  min: number; p25: number; p50: number; p75: number; max: number; color: string;
}) {
  if (min === max) return <p className="text-[10px] text-center py-2" style={{ color: "var(--color-text-muted)" }}>No variance</p>;
  const range = max - min;
  const s = (v: number) => (((v - min) / range) * 100).toFixed(2);
  return (
    <div>
      <svg width="100%" height="34" viewBox="0 0 100 34" preserveAspectRatio="none" style={{ display: "block" }}>
        <line x1={s(min)} y1="17" x2={s(p25)} y2="17" stroke={color} strokeWidth="1.5" opacity="0.45" />
        <line x1={s(p75)} y1="17" x2={s(max)} y2="17" stroke={color} strokeWidth="1.5" opacity="0.45" />
        <line x1={s(min)} y1="10" x2={s(min)} y2="24" stroke={color} strokeWidth="1.5" opacity="0.45" />
        <line x1={s(max)} y1="10" x2={s(max)} y2="24" stroke={color} strokeWidth="1.5" opacity="0.45" />
        <rect x={s(p25)} y="8" width={Math.max(parseFloat(s(p75)) - parseFloat(s(p25)), 0.5)} height="18"
          fill={color} fillOpacity="0.13" stroke={color} strokeWidth="1.5" rx="2" />
        <line x1={s(p50)} y1="8" x2={s(p50)} y2="26" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-[9px] font-mono mt-0.5 px-0.5" style={{ color: "rgba(160,160,200,0.5)" }}>
        <span>{fmt(min)}</span>
        <span style={{ color }}>Q1 {fmt(p25)}</span>
        <span style={{ color, fontWeight: 700 }}>Median {fmt(p50)}</span>
        <span style={{ color }}>Q3 {fmt(p75)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}

// Numeric column card with histogram + KDE + box plot
function NumericCard({ col, color, insight, isAI }: {
  col: ColumnStats; color: string; insight: string; isAI: boolean;
}) {
  const hasBox = col.min !== undefined && col.p25 !== undefined && col.p50 !== undefined && col.p75 !== undefined && col.max !== undefined;

  // Merge histogram and KDE into ComposedChart data
  const chartData = (col.histogram ?? []).map((bin, i) => {
    const kde = col.kdePoints?.[Math.round(i * ((col.kdePoints?.length ?? 1) - 1) / Math.max((col.histogram?.length ?? 1) - 1, 1))];
    return { bucket: bin.bucket, count: bin.count, density: kde?.y };
  });

  // Scale KDE to be visually meaningful alongside bar heights
  const maxCount = Math.max(...(col.histogram?.map(b => b.count) ?? [1]));
  const maxDensity = Math.max(...(chartData.map(d => d.density ?? 0).filter(Boolean)));
  const kdeScale = maxDensity > 0 ? maxCount / maxDensity : 1;

  return (
    <div className="rounded-xl p-5"
      style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-sm font-bold font-mono" style={{ color: "var(--color-text-primary)" }}>{col.name}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>numeric · {col.count.toLocaleString()} values</p>
        </div>
        <NullBadge pct={col.nullPct} />
      </div>

      {chartData.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-muted)" }}>
            Distribution — Histogram + KDE
          </p>
          <div style={{ height: 150, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 26, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 8, fill: "#6b6b88" }}
                  interval="preserveStartEnd" angle={-30} textAnchor="end"
                  tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                <YAxis tick={{ fontSize: 8, fill: "#6b6b88" }} width={28}
                  tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(v: unknown, name: unknown) => {
                    if (name === "count") return [Number(v).toLocaleString(), "Count"];
                    if (name === "density") return [Number(v).toFixed(5), "KDE Density"];
                    return [String(v), String(name)];
                  }} />
                <Bar dataKey="count" fill={color} fillOpacity={0.75} radius={[2, 2, 0, 0]} />
                {col.kdePoints && col.kdePoints.length > 0 && (
                  <Line
                    type="monotone"
                    dataKey={(d: { density?: number }) =>
                      d.density !== undefined ? d.density * kdeScale : undefined
                    }
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    strokeOpacity={0.9}
                    name="density"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[9px] text-center mt-1" style={{ color: "#6b6b88" }}>
            X: {col.name} value range · Y: Count · Orange line: density curve
          </p>
        </>
      )}

      {hasBox && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>
            Box Plot — IQR &amp; Outlier Detection
          </p>
          <BoxPlot min={col.min!} p25={col.p25!} p50={col.p50!} p75={col.p75!} max={col.max!} color={color} />
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
        {[["Mean", col.mean], ["Std Dev", col.std], ["Min", col.min], ["Max", col.max]].map(([label, val]) => (
          <div key={String(label)} className="text-center">
            <p className="text-[9px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{label}</p>
            <p className="text-xs font-bold font-mono mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              {fmt(val as number | undefined)}
            </p>
          </div>
        ))}
      </div>

      <InsightBox color={color} text={insight} isAI={isAI} />
    </div>
  );
}

// Categorical column card
function CatCard({ col, color, insight, isAI }: {
  col: ColumnStats; color: string; insight: string; isAI: boolean;
}) {
  const data = (col.topValues ?? []).slice(0, 8).map(v => ({
    name: v.value.length > 20 ? v.value.slice(0, 18) + "…" : v.value,
    count: v.count,
    pct: col.count > 0 ? ((v.count / col.count) * 100).toFixed(1) : "0.0",
  }));
  const fallback = (col.histogram ?? []).slice(0, 8).map(h => ({ name: h.bucket, count: h.count, pct: "—" }));
  const barData = data.length > 0 ? data : fallback;
  const barH = Math.min(barData.length * 30 + 20, 210);

  return (
    <div className="rounded-xl p-5"
      style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-sm font-bold font-mono" style={{ color: "var(--color-text-primary)" }}>{col.name}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{col.type} · {col.unique} unique</p>
        </div>
        <NullBadge pct={col.nullPct} />
      </div>

      {barData.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-muted)" }}>
            Value Frequency (top {barData.length})
          </p>
          <div style={{ height: barH, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 8, fill: "#6b6b88" }} tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#a8a8c0" }} width={95}
                  tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {barData.map((_, i) => <Cell key={i} fill={color} fillOpacity={Math.max(0.3, 1 - i * 0.08)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[9px] text-center mt-1" style={{ color: "#6b6b88" }}>
            X: Count · Y: {col.name} value
          </p>
        </>
      )}

      <div className="grid grid-cols-3 gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
        {[
          ["Unique", col.unique.toLocaleString()],
          ["Top %", col.topValues?.[0] ? `${((col.topValues[0].count / col.count) * 100).toFixed(1)}%` : "—"],
          ["Nulls", `${col.nullPct.toFixed(1)}%`],
        ].map(([l, v]) => (
          <div key={String(l)} className="text-center">
            <p className="text-[9px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{l}</p>
            <p className="text-xs font-bold font-mono mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{v}</p>
          </div>
        ))}
      </div>

      <InsightBox color={color} text={insight} isAI={isAI} />
    </div>
  );
}

// Correlation heatmap — full matrix with r-values
function CorrelationHeatmap({ summary }: { summary: DatasetSummary }) {
  const numericCols = summary.columns.filter(c => c.type === "numeric").slice(0, 12);
  if (numericCols.length < 2) return null;

  const colNames = numericCols.map(c => c.name);
  const matrix = summary.correlationMatrix;
  const topPairs = summary.correlations.slice(0, 5);

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>Correlation Intelligence</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Pearson r matrix — red = positive, blue = negative correlation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Heatmap grid */}
        <div className="lg:col-span-2 rounded-xl p-5 overflow-x-auto"
          style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>
            Correlation Matrix (Pearson r)
          </p>
          <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: 90 }} />
                {colNames.map(c => (
                  <th key={c} className="pb-2 px-1 text-right"
                    style={{ color: "var(--color-text-muted)", fontSize: 9, fontWeight: 600, minWidth: 48 }}>
                    <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", display: "inline-block", maxHeight: 70, overflow: "hidden" }}>
                      {c}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colNames.map(rowCol => (
                <tr key={rowCol}>
                  <td className="pr-2 py-0.5 text-right font-mono"
                    style={{ color: "var(--color-text-muted)", fontSize: 9, maxWidth: 90, overflow: "hidden", whiteSpace: "nowrap" }}>
                    {rowCol.length > 12 ? rowCol.slice(0, 10) + "…" : rowCol}
                  </td>
                  {colNames.map(colCol => {
                    const r = colCol === rowCol ? 1 : (matrix[rowCol]?.[colCol] ?? 0);
                    return (
                      <td key={colCol} className="p-0.5">
                        <div className="flex items-center justify-center rounded text-[9px] font-bold font-mono"
                          style={{
                            background: colCol === rowCol ? "rgba(124,58,237,0.25)" : corrColor(r),
                            color: Math.abs(r) > 0.4 ? "#fff" : "var(--color-text-secondary)",
                            height: 28, minWidth: 40, fontSize: 9,
                          }}
                          title={`${rowCol} ↔ ${colCol}: r=${r}`}>
                          {r.toFixed(2)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-4 mt-3">
            {[["rgba(59,130,246,0.85)", "−1 Strong negative"], ["rgba(60,60,80,0.15)", "0 No correlation"], ["rgba(239,68,68,0.85)", "+1 Strong positive"]].map(([bg, label]) => (
              <div key={label} className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: bg }} />{label}
              </div>
            ))}
          </div>
        </div>

        {/* Top correlated pairs */}
        <div className="rounded-xl p-5"
          style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--color-text-muted)" }}>
            Top Correlated Pairs
          </p>
          {topPairs.length === 0 && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Not enough numeric columns.</p>
          )}
          {topPairs.map(({ colA, colB, r }, i) => (
            <div key={i} className="mb-3 pb-3" style={{ borderBottom: i < topPairs.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-mono font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                  {colA} ↔ {colB}
                </span>
                <span className="text-xs font-bold shrink-0"
                  style={{ color: r > 0 ? "#ef4444" : "#3b82f6" }}>
                  r = {r.toFixed(3)}
                </span>
              </div>
              {/* Progress bar showing correlation strength */}
              <div className="h-1.5 rounded-full" style={{ background: "var(--color-bg-surface)" }}>
                <div className="h-full rounded-full"
                  style={{
                    width: `${Math.abs(r) * 100}%`,
                    background: r > 0 ? "#ef4444" : "#3b82f6",
                  }} />
              </div>
              <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                {Math.abs(r) > 0.7 ? "Strong" : Math.abs(r) > 0.4 ? "Moderate" : "Weak"} {r > 0 ? "positive" : "negative"} — {Math.abs(r) > 0.7 ? "likely causal or redundant" : Math.abs(r) > 0.4 ? "investigate before training" : "minimal linear relationship"}
              </p>
            </div>
          ))}

          {/* Scatter of top pair */}
          {topPairs.length > 0 && summary.sampleRows.length > 0 && (() => {
            const { colA, colB } = topPairs[0];
            const scatterData = summary.sampleRows
              .filter(r => r[colA] !== undefined && r[colB] !== undefined)
              .slice(0, 200)
              .map(r => ({ x: r[colA], y: r[colB] }));
            if (scatterData.length < 5) return null;
            return (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-muted)" }}>
                  Scatter: {colA} vs {colB}
                </p>
                <div style={{ height: 160, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="x" name={colA} tick={{ fontSize: 8, fill: "#6b6b88" }}
                        type="number" domain={["auto", "auto"]}
                        label={{ value: colA, position: "insideBottom", offset: -14, fontSize: 9, fill: "#6b6b88" }} />
                      <YAxis dataKey="y" name={colB} tick={{ fontSize: 8, fill: "#6b6b88" }}
                        type="number" width={30}
                        label={{ value: colB, angle: -90, position: "insideLeft", offset: 12, fontSize: 9, fill: "#6b6b88" }} />
                      <Tooltip {...TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter data={scatterData} fill="#7c3aed" fillOpacity={0.5} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
}

// Class balance chart for detected target column
function ClassBalanceChart({ summary }: { summary: DatasetSummary }) {
  if (!summary.detectedTarget) return null;
  const col = summary.columns.find(c => c.name === summary.detectedTarget);
  if (!col || !col.topValues?.length) return null;

  const total = col.topValues.reduce((s, v) => s + v.count, 0);
  const data = col.topValues.slice(0, 8).map((v, i) => ({
    name: v.value.length > 20 ? v.value.slice(0, 18) + "…" : v.value,
    count: v.count,
    pct: ((v.count / total) * 100).toFixed(1),
    fill: PALETTE[i % PALETTE.length],
  }));

  const imbalanced = data.length > 1 && parseFloat(data[0].pct) > 70;

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
            Class Balance — <span style={{ color: "#7c3aed" }}>{summary.detectedTarget}</span>
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Detected target column · {col.unique} classes
          </p>
        </div>
        {imbalanced && (
          <span className="text-[10px] px-2 py-1 rounded-full font-semibold"
            style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
            ⚠ Class imbalance detected
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Bar chart */}
        <div className="rounded-xl p-5"
          style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>
            Class Distribution
          </p>
          <div style={{ height: Math.min(data.length * 32 + 20, 220), minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 50, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 8, fill: "#6b6b88" }} tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#a8a8c0" }}
                  width={80} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(v: unknown, _: unknown, props: { payload?: { pct?: string } }) =>
                    [`${Number(v).toLocaleString()} (${props.payload?.pct ?? ""}%)`, "Count"]} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="rounded-xl p-5 flex flex-col items-center justify-center"
          style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 self-start" style={{ color: "var(--color-text-muted)" }}>
            Proportion
          </p>
          <div style={{ height: 180, width: "100%", minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%"
                  outerRadius={70} innerRadius={30} paddingAngle={2}
                  label={(props: { name?: string; index?: number }) => {
                    const d = data[props.index ?? 0];
                    return d ? `${d.name}: ${d.pct}%` : "";
                  }}
                  labelLine={false}>
                  {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {imbalanced && (
            <div className="mt-3 rounded-lg px-3 py-2 w-full"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                <span className="font-semibold" style={{ color: "#ef4444" }}>Imbalance Alert: </span>
                Class &ldquo;{data[0].name}&rdquo; holds {data[0].pct}% of records.
                Apply SMOTE oversampling or <code style={{ color: "#a78bfa" }}>class_weight=&quot;balanced&quot;</code> before training to prevent majority-class bias.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Time series charts for datetime columns
function TimeSeriesSection({ summary }: { summary: DatasetSummary }) {
  if (!summary.timeSeries.length) return null;
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>Time Series Analysis</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Record volume over time per datetime column</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {summary.timeSeries.map((ts, ci) => (
          <div key={ts.colName} className="rounded-xl p-5"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
            <p className="text-sm font-bold font-mono mb-1" style={{ color: "var(--color-text-primary)" }}>{ts.colName}</p>
            <p className="text-[11px] mb-3" style={{ color: "var(--color-text-muted)" }}>datetime · {ts.points.length} periods</p>
            <div style={{ height: 160, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ts.points} margin={{ top: 4, right: 8, bottom: 28, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="period" tick={{ fontSize: 8, fill: "#6b6b88" }}
                    interval="preserveStartEnd" angle={-30} textAnchor="end"
                    tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                  <YAxis tick={{ fontSize: 8, fill: "#6b6b88" }} width={28}
                    tickLine={false} axisLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="count"
                    stroke={PALETTE[ci % PALETTE.length]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[9px] text-center mt-1" style={{ color: "#6b6b88" }}>
              X: Month (YYYY-MM) · Y: Record count
            </p>
            {(() => {
              const pts = ts.points;
              if (pts.length < 3) return null;
              const first = pts[0].count, last = pts[pts.length - 1].count;
              const trend = last > first * 1.1 ? "upward" : last < first * 0.9 ? "downward" : "stable";
              return (
                <div className="mt-3 rounded-lg px-3 py-2"
                  style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)" }}>
                  <p className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                    <span className="font-semibold" style={{ color: PALETTE[ci % PALETTE.length] }}>Trend: </span>
                    {trend.charAt(0).toUpperCase() + trend.slice(1)} — {pts.length} monthly periods from {pts[0].period} to {pts[pts.length - 1].period}.
                    {trend !== "stable" && ` Volume ${trend === "upward" ? "grew" : "dropped"} from ${first.toLocaleString()} to ${last.toLocaleString()} records.`}
                  </p>
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EDADashboard({ summary }: { summary: DatasetSummary }) {
  const [showAllNum, setShowAllNum] = useState(false);
  const [showAllCat, setShowAllCat] = useState(false);
  const [aiInsights, setAiInsights]     = useState<Record<string, string> | null>(null);
  const [loadingAI, setLoadingAI]       = useState(false);
  const [aiError, setAiError]           = useState<string | null>(null);

  const generateInsights = useCallback(async () => {
    if (loadingAI) return;
    setLoadingAI(true);
    setAiError(null);
    try {
      const { summaryToPrompt } = await import("@/lib/datalab");
      const res = await fetch("/api/ai/chart-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryText: summaryToPrompt(summary) }),
      });
      if (!res.ok || !res.body) throw new Error(`API error ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }
      const parsed = parseInsightLines(raw);
      if (Object.keys(parsed).length === 0) throw new Error("No insights parsed from response");
      setAiInsights(parsed);
    } catch (e) {
      setAiError((e as Error).message ?? "Failed to generate AI insights");
    } finally {
      setLoadingAI(false);
    }
  }, [loadingAI, summary]);

  const numericCols = summary.columns.filter(c => c.type === "numeric");
  const catCols     = summary.columns.filter(c => c.type === "categorical" || c.type === "boolean");
  const visNum      = showAllNum ? numericCols : numericCols.slice(0, 6);
  const visCat      = showAllCat ? catCols     : catCols.slice(0, 4);

  const qualityScore = computeQualityScore(summary);
  const totalCells   = summary.rowCount * summary.columnCount;
  const missingCells = summary.columns.reduce((s, c) => s + c.nullCount, 0);
  const missingPct   = totalCells > 0 ? ((missingCells / totalCells) * 100).toFixed(1) : "0.0";
  const qualityColor = qualityScore >= 80 ? "#10b981" : qualityScore >= 60 ? "#f59e0b" : "#ef4444";

  const getInsight = (col: ColumnStats, fallback: string): { text: string; isAI: boolean } => {
    const ai = aiInsights?.[col.name];
    return ai ? { text: ai, isAI: true } : { text: fallback, isAI: false };
  };

  return (
    <div className="space-y-10">

      {/* AI Insights banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-3"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {aiInsights ? `✨ AI insights active — ${Object.keys(aiInsights).length} columns enriched` : "Chart insights are rule-based by default"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {aiInsights ? "AI has analysed each column in context of your specific dataset" : "Click to upgrade to AI-generated, domain-specific insights per chart"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {aiError && <p className="text-xs" style={{ color: "var(--color-error)" }}>{aiError}</p>}
          <button onClick={generateInsights} disabled={loadingAI}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{
              background: aiInsights
                ? "var(--color-bg-elevated)"
                : "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
              color: aiInsights ? "var(--color-text-muted)" : "#fff",
              border: aiInsights ? "1px solid var(--color-border-default)" : "none",
            }}>
            {loadingAI
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              : <><Sparkles className="h-4 w-4" /> {aiInsights ? "Regenerate" : "Generate AI Insights"}</>}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Rows",          value: summary.rowCount.toLocaleString(), sub: "total records",                   color: "#7c3aed" },
          { label: "Columns",       value: String(summary.columnCount),        sub: `${numericCols.length} numeric · ${catCols.length} categorical`, color: "#06b6d4" },
          { label: "Quality Score", value: `${qualityScore}/100`,              sub: qualityScore >= 80 ? "Production ready" : qualityScore >= 60 ? "Needs cleaning" : "Significant prep", color: qualityColor },
          { label: "Missing Cells", value: `${missingPct}%`,                   sub: `${missingCells.toLocaleString()} of ${totalCells.toLocaleString()}`, color: parseFloat(missingPct) > 10 ? "#ef4444" : parseFloat(missingPct) > 2 ? "#f59e0b" : "#10b981" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl p-4"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Correlation heatmap */}
      <CorrelationHeatmap summary={summary} />

      {/* Class balance */}
      <ClassBalanceChart summary={summary} />

      {/* Time series */}
      <TimeSeriesSection summary={summary} />

      {/* Numeric distributions */}
      {numericCols.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>Numeric Distributions</h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Histogram + KDE curve + box plot per numeric column</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg font-mono"
              style={{ background: "var(--color-bg-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border-subtle)" }}>
              {numericCols.length} columns
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {visNum.map((col, i) => {
              const { text, isAI } = getInsight(col, numericInsight(col));
              return <NumericCard key={col.name} col={col} color={PALETTE[i % PALETTE.length]} insight={text} isAI={isAI} />;
            })}
          </div>
          {numericCols.length > 6 && (
            <div className="flex justify-center mt-5">
              <button onClick={() => setShowAllNum(v => !v)}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
                {showAllNum ? <><ChevronUp className="h-4 w-4" /> Show fewer</> : <><ChevronDown className="h-4 w-4" /> Show all {numericCols.length} numeric columns</>}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Categorical distributions */}
      {catCols.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>Categorical Distributions</h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Value frequency, cardinality, encoding recommendations</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg font-mono"
              style={{ background: "var(--color-bg-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border-subtle)" }}>
              {catCols.length} columns
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {visCat.map((col, i) => {
              const { text, isAI } = getInsight(col, catInsight(col));
              return <CatCard key={col.name} col={col} color={PALETTE[(i + 4) % PALETTE.length]} insight={text} isAI={isAI} />;
            })}
          </div>
          {catCols.length > 4 && (
            <div className="flex justify-center mt-5">
              <button onClick={() => setShowAllCat(v => !v)}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
                {showAllCat ? <><ChevronUp className="h-4 w-4" /> Show fewer</> : <><ChevronDown className="h-4 w-4" /> Show all {catCols.length} categorical columns</>}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Data quality / null rate */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>Data Quality — Missing Value Heatmap</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Null rate per column across {summary.columnCount} columns</p>
          </div>
        </div>
        <div className="rounded-xl p-5"
          style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
          <div style={{ height: 200, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.columns.map(c => ({
                  name: c.name.length > 14 ? c.name.slice(0, 12) + "…" : c.name,
                  nullPct: parseFloat(c.nullPct.toFixed(1)),
                }))}
                margin={{ top: 8, right: 8, bottom: 52, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#6b6b88" }}
                  angle={-40} textAnchor="end" tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                <YAxis tick={{ fontSize: 9, fill: "#6b6b88" }} width={36}
                  domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: unknown) => [`${v}%`, "Null rate"]} />
                <Bar dataKey="nullPct" radius={[3, 3, 0, 0]}>
                  {summary.columns.map((col, i) => (
                    <Cell key={i} fill={col.nullPct > 20 ? "#ef4444" : col.nullPct > 5 ? "#f59e0b" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[9px] text-center mb-3" style={{ color: "#6b6b88" }}>X: Column · Y: Null rate (%)</p>
          <div className="flex flex-wrap gap-5 mb-3">
            {[["#10b981","< 5% — Clean"],["#f59e0b","5–20% — Warning"],["#ef4444","> 20% — Critical"]].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />{label}
              </div>
            ))}
          </div>
          <div className="rounded-lg px-3 py-2.5" style={{ background: `${qualityColor}0d`, border: `1px solid ${qualityColor}28` }}>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              <span className="font-semibold" style={{ color: qualityColor }}>Quality Insight: </span>
              {(() => {
                const crit = summary.columns.filter(c => c.nullPct > 20).length;
                const warn = summary.columns.filter(c => c.nullPct > 5 && c.nullPct <= 20).length;
                const clean = summary.columns.filter(c => c.nullPct === 0).length;
                if (crit > 0) return `${crit} column(s) have critical null rates (>20%). ${warn} additional need imputation. Overall ${missingPct}% of cells are missing.`;
                if (warn > 0) return `No critical nulls. ${warn} column(s) need imputation (5–20% null). ${clean} of ${summary.columnCount} columns fully complete.`;
                return `Excellent — ${clean} of ${summary.columnCount} columns fully complete. Overall missing rate: ${missingPct}%. Dataset is production-ready.`;
              })()}
            </p>
          </div>
        </div>
      </section>

      {numericCols.length === 0 && catCols.length === 0 && (
        <p className="text-sm text-center py-12" style={{ color: "var(--color-text-muted)" }}>No chart-able columns detected.</p>
      )}
    </div>
  );
}
