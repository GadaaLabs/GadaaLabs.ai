"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from "recharts";
import type { ColumnStats, DatasetSummary } from "@/lib/datalab";
import { ChevronDown, ChevronUp } from "lucide-react";

// ─── Colours ─────────────────────────────────────────────────────────────────

const PALETTE = [
  "#7c3aed", "#06b6d4", "#f59e0b", "#10b981",
  "#6366f1", "#ec4899", "#f97316", "#38bdf8",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "k";
  if (Math.abs(n) < 0.01 && n !== 0) return n.toExponential(2);
  return n.toFixed(Math.abs(n) < 10 ? 2 : 0);
}

function computeQualityScore(summary: DatasetSummary): number {
  const avgNull = summary.columns.reduce((s, c) => s + c.nullPct, 0) / (summary.columns.length || 1);
  const critical = summary.columns.filter(c => c.nullPct > 20).length;
  return Math.round(Math.max(0, Math.min(100, 100 - avgNull * 0.5 - critical * 5)));
}

// ─── Insight generators ───────────────────────────────────────────────────────

function numericInsight(col: ColumnStats): string {
  const mean = col.mean ?? 0, p50 = col.p50 ?? 0, std = col.std ?? 0;
  const p25 = col.p25 ?? 0, p75 = col.p75 ?? 0;
  const iqr = p75 - p25;
  const highFence = p75 + 1.5 * iqr;
  const lowFence  = p25 - 1.5 * iqr;
  const parts: string[] = [];

  const skewRatio = std > 0 ? (mean - p50) / std : 0;
  if (skewRatio > 0.5) {
    const pct = (((mean - p50) / (Math.abs(p50) || 1)) * 100).toFixed(1);
    parts.push(
      `Right-skewed: mean (${fmt(mean)}) is ${pct}% above the median (${fmt(p50)}), ` +
      `pulled up by high-value records. Log1p or Box-Cox transform recommended before modelling.`
    );
  } else if (skewRatio < -0.5) {
    parts.push(
      `Left-skewed: mean (${fmt(mean)}) falls below median (${fmt(p50)}), indicating a heavy lower tail. ` +
      `Consider Yeo-Johnson transform.`
    );
  } else {
    parts.push(
      `Approximately symmetric — mean (${fmt(mean)}) and median (${fmt(p50)}) are closely aligned. ` +
      `Standard scaling should suffice.`
    );
  }

  if (col.max !== undefined && col.max > highFence) {
    const n = iqr > 0 ? ((col.max - highFence) / iqr).toFixed(1) : "∞";
    parts.push(
      `Upper outliers detected above IQR fence (${fmt(highFence)}). ` +
      `Max ${fmt(col.max)} is ${n}× IQR beyond Q3 — investigate before modelling.`
    );
  }
  if (col.min !== undefined && col.min < lowFence) {
    parts.push(`Lower outliers below IQR fence (${fmt(lowFence)}) detected.`);
  }

  if (std > 0 && mean !== 0) {
    const cv = std / Math.abs(mean);
    if (cv > 1) parts.push(`High dispersion (CV = ${cv.toFixed(2)}) — feature scaling is essential.`);
  }

  if (col.nullPct > 20) parts.push(`⚠ ${col.nullPct.toFixed(1)}% missing — imputation required.`);
  else if (col.nullPct > 5) parts.push(`${col.nullPct.toFixed(1)}% missing — median imputation recommended.`);

  return parts.join(" ");
}

function categoricalInsight(col: ColumnStats): string {
  if (!col.topValues?.length) return "No value frequency data available.";
  const top = col.topValues[0];
  const topPct = (top.count / col.count) * 100;
  const parts: string[] = [];

  if (topPct > 80) {
    parts.push(
      `Highly imbalanced: "${top.value}" dominates with ${topPct.toFixed(1)}% of records. ` +
      `Class-imbalance handling (SMOTE, class_weight) will be required if used as a target.`
    );
  } else if (topPct > 50) {
    parts.push(`Moderately skewed: "${top.value}" accounts for ${topPct.toFixed(1)}% of records.`);
  } else {
    parts.push(`Well-distributed: top value "${top.value}" holds ${topPct.toFixed(1)}% — balanced across categories.`);
  }

  if (col.unique > 50) {
    parts.push(
      `High cardinality (${col.unique} unique values) — one-hot encoding will explode features. ` +
      `Target encoding or embedding recommended.`
    );
  } else if (col.unique > 15) {
    parts.push(`Medium cardinality (${col.unique} unique values) — group rare categories before encoding.`);
  } else {
    parts.push(`Low cardinality (${col.unique} unique values) — one-hot encoding is safe.`);
  }

  if (col.nullPct > 10) parts.push(`${col.nullPct.toFixed(1)}% missing — add "Unknown" category or mode imputation.`);
  return parts.join(" ");
}

function qualityInsight(summary: DatasetSummary): string {
  const critical = summary.columns.filter(c => c.nullPct > 20).length;
  const warnings = summary.columns.filter(c => c.nullPct > 5 && c.nullPct <= 20).length;
  const clean    = summary.columns.filter(c => c.nullPct === 0).length;
  const total    = summary.rowCount * summary.columnCount;
  const missing  = summary.columns.reduce((s, c) => s + c.nullCount, 0);
  const pct      = total > 0 ? ((missing / total) * 100).toFixed(2) : "0.00";

  if (critical > 0) {
    return `${critical} column(s) have critical null rates (>20%) that will degrade model quality if untreated. ` +
      `${warnings} additional column(s) need imputation. Overall dataset is ${pct}% missing across ${total.toLocaleString()} cells.`;
  }
  if (warnings > 0) {
    return `No critical nulls. ${warnings} column(s) have moderate null rates (5–20%) — median/mode imputation recommended. ` +
      `${clean} of ${summary.columnCount} columns are fully complete.`;
  }
  return `Excellent completeness — ${clean} of ${summary.columnCount} columns are fully complete ` +
    `(${pct}% overall missing). Dataset is production-ready from a completeness perspective.`;
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

function InsightBox({ color, text }: { color: string; text: string }) {
  return (
    <div className="mt-4 rounded-lg px-3 py-2.5"
      style={{ background: `${color}0d`, border: `1px solid ${color}28` }}>
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        <span className="font-semibold" style={{ color }}>Insight: </span>{text}
      </p>
    </div>
  );
}

// Custom SVG box-and-whisker from 5-number summary
function BoxPlot({ min, p25, p50, p75, max, color }: {
  min: number; p25: number; p50: number; p75: number; max: number; color: string;
}) {
  if (min === max) return (
    <p className="text-[10px] text-center py-3" style={{ color: "var(--color-text-muted)" }}>
      No variance (constant value)
    </p>
  );

  const range = max - min;
  const s = (v: number) => (((v - min) / range) * 100).toFixed(2);

  return (
    <div>
      <svg width="100%" height="36" viewBox="0 0 100 36" preserveAspectRatio="none" style={{ display: "block" }}>
        {/* whiskers */}
        <line x1={s(min)}  y1="18" x2={s(p25)}  y2="18" stroke={color} strokeWidth="1.5" opacity="0.45" />
        <line x1={s(p75)}  y1="18" x2={s(max)}  y2="18" stroke={color} strokeWidth="1.5" opacity="0.45" />
        {/* end caps */}
        <line x1={s(min)}  y1="11" x2={s(min)}  y2="25" stroke={color} strokeWidth="1.5" opacity="0.45" />
        <line x1={s(max)}  y1="11" x2={s(max)}  y2="25" stroke={color} strokeWidth="1.5" opacity="0.45" />
        {/* IQR box */}
        <rect
          x={s(p25)} y="9"
          width={Math.max(parseFloat(s(p75)) - parseFloat(s(p25)), 0.5)}
          height="18"
          fill={color} fillOpacity="0.13"
          stroke={color} strokeWidth="1.5" rx="2"
        />
        {/* median */}
        <line x1={s(p50)} y1="9" x2={s(p50)} y2="27" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-[9px] font-mono mt-0.5 px-0.5"
        style={{ color: "rgba(160,160,200,0.5)" }}>
        <span>Min {fmt(min)}</span>
        <span style={{ color }}>Q1 {fmt(p25)}</span>
        <span style={{ color, fontWeight: 700 }}>Median {fmt(p50)}</span>
        <span style={{ color }}>Q3 {fmt(p75)}</span>
        <span>Max {fmt(max)}</span>
      </div>
    </div>
  );
}

const TOOLTIP_STYLE = {
  contentStyle: { background: "#161625", border: "1px solid #2a2a45", borderRadius: 8, fontSize: 11 },
  labelStyle: { color: "#f0f0ff", fontWeight: 600 },
  itemStyle: { color: "#a8a8c0" },
};

// Numeric column card
function NumericCard({ col, color }: { col: ColumnStats; color: string }) {
  const hasBox = col.min !== undefined && col.p25 !== undefined &&
                 col.p50 !== undefined && col.p75 !== undefined && col.max !== undefined;
  const insight = numericInsight(col);

  return (
    <div className="rounded-xl p-5"
      style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>

      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-sm font-bold font-mono" style={{ color: "var(--color-text-primary)" }}>{col.name}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            numeric · {col.count.toLocaleString()} values
          </p>
        </div>
        <NullBadge pct={col.nullPct} />
      </div>

      {col.histogram && col.histogram.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--color-text-muted)" }}>Frequency Distribution</p>
          <div style={{ height: 145, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={col.histogram} margin={{ top: 4, right: 4, bottom: 26, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 8, fill: "#6b6b88" }}
                  interval="preserveStartEnd" angle={-30} textAnchor="end"
                  tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                <YAxis tick={{ fontSize: 8, fill: "#6b6b88" }} width={28}
                  tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" fill={color} fillOpacity={0.85} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[9px] text-center mt-1" style={{ color: "#6b6b88" }}>
            X: Value buckets · Y: Count of records in each bucket
          </p>
        </>
      )}

      {hasBox && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-muted)" }}>Box Plot — IQR &amp; Spread</p>
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

      <InsightBox color={color} text={insight} />
    </div>
  );
}

// Categorical column card
function CatCard({ col, color }: { col: ColumnStats; color: string }) {
  const insight = categoricalInsight(col);
  const data = (col.topValues ?? []).slice(0, 8).map(v => ({
    name: v.value.length > 20 ? v.value.slice(0, 18) + "…" : v.value,
    count: v.count,
  }));
  const barData = data.length > 0 ? data : (col.histogram ?? []).slice(0, 8).map(h => ({
    name: h.bucket, count: h.count,
  }));
  const barH = Math.min(barData.length * 30 + 20, 210);

  return (
    <div className="rounded-xl p-5"
      style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>

      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-sm font-bold font-mono" style={{ color: "var(--color-text-primary)" }}>{col.name}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {col.type} · {col.unique} unique values
          </p>
        </div>
        <NullBadge pct={col.nullPct} />
      </div>

      {barData.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--color-text-muted)" }}>Value Frequency (top {barData.length})</p>
          <div style={{ height: barH, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 8, fill: "#6b6b88" }}
                  tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                <YAxis type="category" dataKey="name"
                  tick={{ fontSize: 9, fill: "#a8a8c0" }} width={95}
                  tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={color} fillOpacity={Math.max(0.3, 1 - i * 0.08)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[9px] text-center mt-1" style={{ color: "#6b6b88" }}>
            X: Count of records · Y: Category value
          </p>
        </>
      )}

      <div className="grid grid-cols-3 gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
        {[
          ["Unique values", col.unique.toLocaleString()],
          ["Top value %", col.topValues?.[0]
            ? `${((col.topValues[0].count / col.count) * 100).toFixed(1)}%` : "—"],
          ["Null rate", `${col.nullPct.toFixed(1)}%`],
        ].map(([label, value]) => (
          <div key={String(label)} className="text-center">
            <p className="text-[9px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{label}</p>
            <p className="text-xs font-bold font-mono mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{value}</p>
          </div>
        ))}
      </div>

      <InsightBox color={color} text={insight} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EDADashboard({ summary }: { summary: DatasetSummary }) {
  const [showAllNum, setShowAllNum] = useState(false);
  const [showAllCat, setShowAllCat] = useState(false);

  const numericCols = summary.columns.filter(c => c.type === "numeric");
  const catCols     = summary.columns.filter(c => c.type === "categorical" || c.type === "boolean");

  const visNum = showAllNum ? numericCols : numericCols.slice(0, 6);
  const visCat = showAllCat ? catCols     : catCols.slice(0, 4);

  const qualityScore  = computeQualityScore(summary);
  const totalCells    = summary.rowCount * summary.columnCount;
  const missingCells  = summary.columns.reduce((s, c) => s + c.nullCount, 0);
  const missingPct    = totalCells > 0 ? ((missingCells / totalCells) * 100).toFixed(1) : "0.0";
  const qualityColor  = qualityScore >= 80 ? "#10b981" : qualityScore >= 60 ? "#f59e0b" : "#ef4444";
  const missingColor  = parseFloat(missingPct) > 10 ? "#ef4444" : parseFloat(missingPct) > 2 ? "#f59e0b" : "#10b981";

  const showToggle = (
    show: boolean,
    toggle: () => void,
    total: number,
    label: string,
  ) => total > (label === "numeric" ? 6 : 4) && (
    <div className="flex justify-center mt-5">
      <button onClick={toggle}
        className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
        style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
        {show
          ? <><ChevronUp className="h-4 w-4" /> Show fewer</>
          : <><ChevronDown className="h-4 w-4" /> Show all {total} {label} columns</>}
      </button>
    </div>
  );

  return (
    <div className="space-y-10">

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Rows",           value: summary.rowCount.toLocaleString(),   sub: "total records",                    color: "#7c3aed" },
          { label: "Columns",        value: String(summary.columnCount),          sub: `${numericCols.length} numeric · ${catCols.length} categorical`, color: "#06b6d4" },
          { label: "Quality Score",  value: `${qualityScore}/100`,                sub: qualityScore >= 80 ? "Production ready" : qualityScore >= 60 ? "Needs cleaning" : "Significant prep required", color: qualityColor },
          { label: "Missing Cells",  value: `${missingPct}%`,                     sub: `${missingCells.toLocaleString()} of ${totalCells.toLocaleString()} cells`, color: missingColor },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl p-4"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Numeric distributions */}
      {numericCols.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>Numeric Distributions</h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Histogram, box-and-whisker plot, and distribution insight for each numeric column
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg font-mono"
              style={{ background: "var(--color-bg-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border-subtle)" }}>
              {numericCols.length} columns
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {visNum.map((col, i) => <NumericCard key={col.name} col={col} color={PALETTE[i % PALETTE.length]} />)}
          </div>
          {showToggle(showAllNum, () => setShowAllNum(v => !v), numericCols.length, "numeric")}
        </section>
      )}

      {/* Categorical distributions */}
      {catCols.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>Categorical Distributions</h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Value frequency, cardinality analysis, and encoding recommendations
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg font-mono"
              style={{ background: "var(--color-bg-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border-subtle)" }}>
              {catCols.length} columns
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {visCat.map((col, i) => <CatCard key={col.name} col={col} color={PALETTE[(i + 4) % PALETTE.length]} />)}
          </div>
          {showToggle(showAllCat, () => setShowAllCat(v => !v), catCols.length, "categorical")}
        </section>
      )}

      {/* Data quality chart */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>Data Quality — Null Rate per Column</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Missing value rate across all {summary.columnCount} columns
            </p>
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
                  angle={-40} textAnchor="end"
                  tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                <YAxis tick={{ fontSize: 9, fill: "#6b6b88" }} width={36}
                  domain={[0, 100]} tickFormatter={(v: number) => `${v}%`}
                  tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(v: unknown) => [`${v}%`, "Null rate"]} />
                <Bar dataKey="nullPct" radius={[3, 3, 0, 0]}>
                  {summary.columns.map((col, i) => (
                    <Cell key={i} fill={col.nullPct > 20 ? "#ef4444" : col.nullPct > 5 ? "#f59e0b" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[9px] text-center mb-3" style={{ color: "#6b6b88" }}>
            X: Column name · Y: Percentage of missing values (0–100%)
          </p>
          <div className="flex flex-wrap gap-5 mb-3">
            {[["#10b981", "< 5% — Clean"], ["#f59e0b", "5–20% — Warning"], ["#ef4444", "> 20% — Critical"]].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
          <InsightBox color={qualityColor} text={qualityInsight(summary)} />
        </div>
      </section>

      {numericCols.length === 0 && catCols.length === 0 && (
        <p className="text-sm text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          No chart-able columns detected in this dataset.
        </p>
      )}
    </div>
  );
}
