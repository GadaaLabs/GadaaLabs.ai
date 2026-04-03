"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  // reserved for TimeSeriesTab
  LineChart, Line,
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

function HistogramChart({ col, color }: { col: ColumnStats; color: string }) {
  const data = col.histogram ?? [];
  return (
    <div style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: TX3 }}
            interval="preserveStartEnd" angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 9, fill: TX3 }} width={28} />
          <Tooltip
            contentStyle={{ background: "#10101e", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: TX1 }} itemStyle={{ color: TX2 }}
          />
          <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BoxPlotChart({ col, color }: { col: ColumnStats; color: string }) {
  const data = [
    { label: "Min", value: col.min ?? 0 },
    { label: "Q1", value: col.p25 ?? 0 },
    { label: "Median", value: col.p50 ?? 0 },
    { label: "Mean", value: col.mean ?? 0 },
    { label: "Q3", value: col.p75 ?? 0 },
    { label: "Max", value: col.max ?? 0 },
  ];
  return (
    <div style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: TX3 }} />
          <YAxis tick={{ fontSize: 9, fill: TX3 }} width={40} />
          <Tooltip
            contentStyle={{ background: "#10101e", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: TX1 }} itemStyle={{ color: TX2 }}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={
                d.label === "Median" ? CYAN :
                d.label === "Mean" ? VIOLET :
                d.label === "Min" || d.label === "Max" ? ROSE : color
              } />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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
