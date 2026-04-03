"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  ComposedChart, Area, ReferenceLine, ScatterChart, Scatter, ZAxis,
} from "recharts";
import type { DatasetSummary, ColumnStats, ChartType } from "@/lib/datalab";

// ── Design tokens ────────────────────────────────────────────────────────────
const TX1 = "#e8edf5";
const TX2 = "#9ba8bc";
const TX3 = "#5c6a80";
const VIOLET = "#8b5cf6";
const CYAN = "#22d3ee";
const GREEN = "#34d399";
const AMBER = "#fbbf24";
const ROSE = "#fb7185";
const BLUE = "#60a5fa";
const BG2 = "#0c0c18";
const BORDER = "rgba(255,255,255,0.07)";

const PALETTE = [VIOLET, CYAN, GREEN, AMBER, ROSE, BLUE, "#f472b6", "#fb923c"];

const SHAPE_COLORS: Record<string, string> = {
  normal: GREEN,
  "right-skewed": AMBER,
  "left-skewed": BLUE,
  "heavy-tailed": ROSE,
  uniform: VIOLET,
};

// ── Stat chips ───────────────────────────────────────────────────────────────

function StatChip({ label, value, color = TX2 }: { label: string; value: string | number; color?: string }) {
  return (
    <span style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center",
      background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`,
      borderRadius: 8, padding: "4px 10px", gap: 1,
    }}>
      <span style={{ fontSize: 10, color: TX3 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{value}</span>
    </span>
  );
}

// ── Universal chart card wrapper ─────────────────────────────────────────────

interface CardProps {
  col: ColumnStats;
  insight?: string;
  children: React.ReactNode;
}

function ChartCard({ col, insight, children }: CardProps) {
  const shape = col.distributionShape;
  const shapeColor = shape ? (SHAPE_COLORS[shape] ?? TX3) : TX3;

  return (
    <div style={{
      background: BG2, border: `1px solid ${BORDER}`, borderRadius: 14,
      overflow: "hidden", marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px 0",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: TX1, fontFamily: "monospace" }}>
            {col.name}
          </span>
          <span style={{ fontSize: 11, color: TX3, marginLeft: 8 }}>
            {col.count.toLocaleString()} rows · {col.nullPct}% null · {col.unique} unique
          </span>
        </div>
        {shape && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: shapeColor,
            background: `${shapeColor}18`, border: `1px solid ${shapeColor}40`,
            borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap",
          }}>
            {shape}
          </span>
        )}
      </div>

      {/* Chart body */}
      <div style={{ padding: "12px 16px" }}>{children}</div>

      {/* Stats chips — numeric */}
      {col.type === "numeric" && (
        <div style={{ padding: "0 16px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {col.mean !== undefined && <StatChip label="mean" value={col.mean} color={CYAN} />}
          {col.p50 !== undefined && <StatChip label="median" value={col.p50} color={VIOLET} />}
          {col.std !== undefined && <StatChip label="std" value={col.std} />}
          {col.outlierCount !== undefined && (
            <StatChip label="outliers" value={col.outlierCount}
              color={col.outlierCount > 0 ? ROSE : GREEN} />
          )}
        </div>
      )}

      {/* Stats chips — categorical */}
      {(col.type === "categorical" || col.type === "boolean") && col.topValues && (
        <div style={{ padding: "0 16px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          <StatChip label="top value" value={col.topValues[0]?.value ?? "—"} color={CYAN} />
          <StatChip label="unique" value={col.unique} />
          <StatChip label="null %" value={`${col.nullPct}%`}
            color={col.nullPct > 20 ? ROSE : col.nullPct > 5 ? AMBER : GREEN} />
        </div>
      )}

      {/* AI Insight */}
      {insight && (
        <div style={{
          margin: "0 16px 14px", padding: "10px 12px",
          background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)",
          borderRadius: 10,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: VIOLET,
            textTransform: "uppercase" as const, letterSpacing: "0.08em",
          }}>AI Insight</span>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: TX2, lineHeight: 1.6 }}>{insight}</p>
        </div>
      )}
    </div>
  );
}

// ── Chart renderers ──────────────────────────────────────────────────────────

// Find the bucket label whose range contains a given value
function bucketFor(buckets: { bucket: string }[], value: number): string | undefined {
  for (const b of buckets) {
    const parts = b.bucket.split("–").concat(b.bucket.split("-"));
    const nums = parts.map(Number).filter(isFinite);
    if (nums.length >= 2 && value >= nums[0] && value <= nums[nums.length - 1]) return b.bucket;
  }
  return undefined;
}

function HistogramChart({ col, color }: { col: ColumnStats; color: string }) {
  const histData = col.histogram ?? [];
  const mean = col.mean;
  const median = col.p50;
  const kdeRaw = col.kdePoints ?? [];

  // Attach a scaled KDE value to each histogram bucket by interpolating from kdePoints
  const maxCount = histData.reduce((m, d) => Math.max(m, d.count), 1);
  const maxKde = kdeRaw.reduce((m, d) => Math.max(m, d.y), 0.0001);

  const data = histData.map((b) => {
    const parts = b.bucket.split("–").concat(b.bucket.split("-")).map(Number).filter(isFinite);
    const mid = parts.length >= 2 ? (parts[0] + parts[parts.length - 1]) / 2 : NaN;
    let kde: number | undefined;
    if (kdeRaw.length > 0 && isFinite(mid)) {
      const closest = kdeRaw.reduce((p, c) => Math.abs(c.x - mid) < Math.abs(p.x - mid) ? c : p);
      kde = (closest.y / maxKde) * maxCount * 0.82;
    }
    return { ...b, kde };
  });

  const meanBucket = mean !== undefined ? bucketFor(histData, mean) : undefined;
  const medianBucket = median !== undefined ? bucketFor(histData, median) : undefined;

  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 12, bottom: 28, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: TX3 }}
            interval="preserveStartEnd" angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 9, fill: TX3 }} width={28} />
          <Tooltip
            contentStyle={{ background: "#10101e", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: TX1 }} itemStyle={{ color: TX2 }}
          />
          <Bar dataKey="count" fill={color} fillOpacity={0.72} radius={[2, 2, 0, 0]} />
          {kdeRaw.length > 0 && (
            <Area dataKey="kde" type="monotone"
              stroke={CYAN} strokeWidth={2} fill={`${CYAN}14`} dot={false} />
          )}
          {meanBucket && (
            <ReferenceLine x={meanBucket} stroke={CYAN} strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value: `μ=${mean}`, position: "top", fill: CYAN, fontSize: 9 }} />
          )}
          {medianBucket && medianBucket !== meanBucket && (
            <ReferenceLine x={medianBucket} stroke={VIOLET} strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value: `M=${median}`, position: "insideTop", fill: VIOLET, fontSize: 9 }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function BoxPlotChart({ col, color }: { col: ColumnStats; color: string }) {
  const min = col.min ?? 0, max = col.max ?? 0;
  const q1 = col.p25 ?? 0, median = col.p50 ?? 0, q3 = col.p75 ?? 0;
  const mean = col.mean ?? 0;
  const iqr = q3 - q1;
  const lowerFence = Math.max(min, q1 - 1.5 * iqr);
  const upperFence = Math.min(max, q3 + 1.5 * iqr);
  const range = max - min || 1;

  // Map value to x% position (0–100)
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / range) * 100));

  const H = 80; // SVG height
  const boxY = 22, boxH = 36;
  const midY = boxY + boxH / 2;

  return (
    <div style={{ padding: "8px 0" }}>
      <svg width="100%" height={H} style={{ overflow: "visible" }}>
        {/* Whisker lines */}
        <line x1={`${pct(lowerFence)}%`} y1={midY} x2={`${pct(q1)}%`} y2={midY}
          stroke={TX3} strokeWidth={1.5} strokeDasharray="3 2" />
        <line x1={`${pct(q3)}%`} y1={midY} x2={`${pct(upperFence)}%`} y2={midY}
          stroke={TX3} strokeWidth={1.5} strokeDasharray="3 2" />
        {/* Whisker end caps */}
        <line x1={`${pct(lowerFence)}%`} y1={boxY + 8} x2={`${pct(lowerFence)}%`} y2={boxY + boxH - 8}
          stroke={TX3} strokeWidth={1.5} />
        <line x1={`${pct(upperFence)}%`} y1={boxY + 8} x2={`${pct(upperFence)}%`} y2={boxY + boxH - 8}
          stroke={TX3} strokeWidth={1.5} />
        {/* IQR box */}
        <rect x={`${pct(q1)}%`} y={boxY} width={`${pct(q3) - pct(q1)}%`} height={boxH}
          fill={`${color}30`} stroke={color} strokeWidth={1.5} rx={3} />
        {/* Median line */}
        <line x1={`${pct(median)}%`} y1={boxY} x2={`${pct(median)}%`} y2={boxY + boxH}
          stroke={CYAN} strokeWidth={2.5} />
        {/* Mean diamond */}
        {(() => {
          const mx = `${pct(mean)}%`;
          const s = 5;
          return <polygon
            points={`${pct(mean)}%,${midY - s} calc(${pct(mean)}% + ${s}px),${midY} ${pct(mean)}%,${midY + s} calc(${pct(mean)}% - ${s}px),${midY}`}
            fill={VIOLET} opacity={0.9}
          />;
        })()}
        {/* Min/Max outlier dots */}
        {min < lowerFence && <circle cx={`${pct(min)}%`} cy={midY} r={3.5} fill={ROSE} opacity={0.8} />}
        {max > upperFence && <circle cx={`${pct(max)}%`} cy={midY} r={3.5} fill={ROSE} opacity={0.8} />}
        {/* Labels */}
        <text x={`${pct(lowerFence)}%`} y={boxY - 5} textAnchor="middle" fontSize={8} fill={TX3}>
          {lowerFence.toFixed(1)}
        </text>
        <text x={`${pct(q1)}%`} y={boxY - 5} textAnchor="middle" fontSize={8} fill={TX2}>Q1</text>
        <text x={`${pct(median)}%`} y={boxY + boxH + 13} textAnchor="middle" fontSize={8} fill={CYAN}
          fontWeight="bold">M</text>
        <text x={`${pct(q3)}%`} y={boxY - 5} textAnchor="middle" fontSize={8} fill={TX2}>Q3</text>
        <text x={`${pct(upperFence)}%`} y={boxY - 5} textAnchor="middle" fontSize={8} fill={TX3}>
          {upperFence.toFixed(1)}
        </text>
      </svg>
      {/* Legend row */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: CYAN }}>── Median</span>
        <span style={{ fontSize: 10, color: VIOLET }}>◆ Mean</span>
        <span style={{ fontSize: 10, color: color }}>□ IQR box</span>
        {(min < lowerFence || max > upperFence) && (
          <span style={{ fontSize: 10, color: ROSE }}>● Outlier</span>
        )}
      </div>
    </div>
  );
}

function DonutChart({ col }: { col: ColumnStats }) {
  const data = (col.topValues ?? []).slice(0, 6);
  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map((d) => ({
    name: d.value,
    pct: total > 0 ? Math.round((d.count / total) * 1000) / 10 : 0,
  }));
  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 9, fill: TX3 }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: TX2 }} width={80} />
          <Tooltip
            contentStyle={{ background: "#10101e", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }}
            formatter={(v: unknown) => [`${v}%`, "share"]}
            labelStyle={{ color: TX1 }}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.9} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HorizontalBarChart({ col }: { col: ColumnStats }) {
  const data = (col.topValues ?? []).slice(0, 10).map((d) => ({ name: d.value, count: d.count }));
  return (
    <div style={{ height: Math.max(180, data.length * 22) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 9, fill: TX3 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: TX2 }} width={90} />
          <Tooltip
            contentStyle={{ background: "#10101e", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: TX1 }} itemStyle={{ color: TX2 }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Chart dispatcher ──────────────────────────────────────────────────────────

function ColumnChart({ col, colorIdx, insight }: {
  col: ColumnStats;
  colorIdx: number;
  insight?: string;
}) {
  const color = PALETTE[colorIdx % PALETTE.length];
  const chartType: ChartType = col.recommendedChart ?? "bar";

  let body: React.ReactNode;
  if (chartType === "histogram") {
    body = <HistogramChart col={col} color={color} />;
  } else if (chartType === "boxplot") {
    body = <BoxPlotChart col={col} color={color} />;
  } else if (chartType === "donut" || chartType === "bar") {
    body = <DonutChart col={col} />;
  } else if (chartType === "horizontal-bar") {
    body = <HorizontalBarChart col={col} />;
  } else {
    // fallback for timeseries / cdf / violin — show histogram if data available
    body = <HistogramChart col={col} color={color} />;
  }

  return <ChartCard col={col} insight={insight}>{body}</ChartCard>;
}

// ── Null-rate bar chart ───────────────────────────────────────────────────────

function NullRateChart({ summary }: { summary: DatasetSummary }) {
  return (
    <div>
      <h3 style={{
        fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const,
        letterSpacing: "0.1em", color: TX3, marginBottom: 12,
      }}>
        Null Rate per Column
      </h3>
      <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={summary.columns.map((c) => ({ name: c.name, nullPct: c.nullPct }))}
              margin={{ top: 4, right: 8, bottom: 40, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: TX3 }} angle={-40} textAnchor="end" />
              <YAxis tick={{ fontSize: 9, fill: TX3 }} width={28} domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`} />
              <Tooltip
                contentStyle={{ background: "#10101e", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }}
                formatter={(v: unknown) => [`${v}%`, "Null %"]}
                labelStyle={{ color: TX1 }}
              />
              <Bar dataKey="nullPct" radius={[3, 3, 0, 0]}>
                {summary.columns.map((col, i) => (
                  <Cell key={i} fill={col.nullPct > 20 ? ROSE : col.nullPct > 5 ? AMBER : GREEN} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p style={{ fontSize: 11, color: TX3, marginTop: 6 }}>
          <span style={{ color: GREEN }}>Green</span> = &lt;5% ·{" "}
          <span style={{ color: AMBER }}>Amber</span> = 5–20% ·{" "}
          <span style={{ color: ROSE }}>Red</span> = &gt;20%
        </p>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  summary: DatasetSummary;
  chartInsights?: Record<string, string>;
}

export function ChartPanel({ summary, chartInsights = {} }: Props) {
  const chartable = summary.columns.filter(
    (c) => c.type !== "mixed" && ((c.histogram?.length ?? 0) > 0 || (c.topValues?.length ?? 0) > 0)
  );

  if (chartable.length === 0) {
    return (
      <p style={{ textAlign: "center", color: TX3, padding: "40px 0", fontSize: 13 }}>
        No chart-able columns detected.
      </p>
    );
  }

  return (
    <div>
      {chartable.map((col, i) => (
        <ColumnChart
          key={col.name}
          col={col}
          colorIdx={i}
          insight={chartInsights[col.name]}
        />
      ))}
      <NullRateChart summary={summary} />
    </div>
  );
}
