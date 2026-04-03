# DataLab World-Class Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade DataLab with intelligent chart selection, full EDA tab suite, 10-step DS workflow, stakeholder report, and email-based magic-link access.

**Architecture:** Three tracks executed in order: (1) commit pending content files, (2) enrich `lib/datalab.ts` stats then rebuild `ChartPanel.tsx` and add new tab components imported into `DataLabShell.tsx`, (3) extend access system with email requests and HMAC magic links.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Recharts · Tailwind CSS v4 · CSS custom properties · HMAC-SHA256 tokens · httpOnly cookies

**CRITICAL CONSTRAINT:** Do NOT modify `components/datalab/ExpertHub.tsx` or the `"agents"` tab in `DataLabShell.tsx`. The Expert Agent Hub (Document Intelligence, Business Strategist, Legal and Immigration Expert, Risk & Industry Analyst, Electrical Engineering Expert) must remain exactly as-is.

---

## Track 1 — Commit Pending Content Files

### Task 1: Commit 13 modified content files

**Files:**
- Modify (stage only): `README.md`, `gravityclaude.md`, `content/courses/python-mastery/lessons/01-python-foundations.mdx` through `16-nlp-transformers.mdx`

- [ ] **Step 1: Stage and commit all 13 modified files**

```bash
git add README.md gravityclaude.md \
  content/courses/python-mastery/lessons/01-python-foundations.mdx \
  content/courses/python-mastery/lessons/02-functions-scope.mdx \
  content/courses/python-mastery/lessons/03-data-structures.mdx \
  content/courses/python-mastery/lessons/04-string-manipulation.mdx \
  content/courses/python-mastery/lessons/05-oop.mdx \
  content/courses/python-mastery/lessons/07-error-handling-testing.mdx \
  content/courses/python-mastery/lessons/09-numpy.mdx \
  content/courses/python-mastery/lessons/10-pandas.mdx \
  content/courses/python-mastery/lessons/13-concurrency.mdx \
  content/courses/python-mastery/lessons/14-scikit-learn.mdx \
  content/courses/python-mastery/lessons/16-nlp-transformers.mdx
git commit -m "content: update Python Mastery lessons 01-16 and site docs"
```

Expected: 1 commit with 13 files changed.

---

## Track 2 — World-Class DataLab

### Task 2: Enrich `lib/datalab.ts` with new stat fields and chart selection

**Files:**
- Modify: `lib/datalab.ts`

- [ ] **Step 1: Add `ChartType` and new fields to `ColumnStats` and `DatasetSummary`**

Replace the top of `lib/datalab.ts` (the two interfaces) with:

```ts
export type ChartType =
  | "histogram" | "boxplot" | "bar" | "donut"
  | "horizontal-bar" | "timeseries" | "cdf" | "violin";

export type DistributionShape =
  | "normal" | "right-skewed" | "left-skewed"
  | "heavy-tailed" | "uniform";

export interface ColumnStats {
  name: string;
  type: "numeric" | "categorical" | "datetime" | "boolean" | "mixed";
  count: number;
  nullCount: number;
  nullPct: number;
  unique: number;
  // numeric
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  // new numeric enrichments
  outlierCount?: number;
  skewness?: number;
  distributionShape?: DistributionShape;
  kdePoints?: { x: number; y: number }[];
  recommendedChart?: ChartType;
  // categorical
  topValues?: { value: string; count: number }[];
  // for charts
  histogram?: { bucket: string; count: number }[];
}

export interface DatasetSummary {
  fileName: string;
  fileSizeKB: number;
  rowCount: number;
  columnCount: number;
  columns: ColumnStats[];
  // new top-level enrichments
  correlationMatrix: { col1: string; col2: string; r: number }[];
  recommendedPairs: { col1: string; col2: string; r: number }[];
  missingnessPattern: { rowIndex: number; colsWithNull: string[] }[];
}
```

- [ ] **Step 2: Add helper functions before `computeStats`**

Add after the `buildHistogram` function and before `computeStats`:

```ts
function computeOutlierCount(sorted: number[], q1: number, q3: number): number {
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  return sorted.filter((v) => v < lo || v > hi).length;
}

function computeSkewness(mean: number, median: number, std: number): number {
  if (std === 0) return 0;
  return (3 * (mean - median)) / std;
}

function classifyShape(skewness: number, std: number, range: number): DistributionShape {
  if (range > 0 && std / range < 0.15) return "uniform";
  if (Math.abs(skewness) < 0.2) return "normal";
  if (skewness > 0.5) return "right-skewed";
  if (skewness < -0.5) return "left-skewed";
  return "heavy-tailed";
}

function computeKDE(nums: number[], points = 50): { x: number; y: number }[] {
  if (nums.length === 0) return [];
  const min = nums[0];
  const max = nums[nums.length - 1];
  if (min === max) return [];
  const h = 1.06 * (nums.reduce((a, b) => a + (b - nums[Math.floor(nums.length / 2)]) ** 2, 0) / nums.length) ** 0.5 * nums.length ** -0.2 || 1;
  const step = (max - min) / (points - 1);
  return Array.from({ length: points }, (_, i) => {
    const x = min + i * step;
    const y = nums.reduce((sum, xi) => {
      const u = (x - xi) / h;
      return sum + Math.exp(-0.5 * u * u);
    }, 0) / (nums.length * h * Math.sqrt(2 * Math.PI));
    return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 10000) / 10000 };
  });
}

function selectChartType(col: ColumnStats): ChartType {
  if (col.type === "datetime") return "timeseries";
  if (col.type === "boolean") return "donut";
  if (col.type === "categorical") {
    if (col.unique <= 6) return "donut";
    if (col.unique <= 20) return "horizontal-bar";
    return "horizontal-bar"; // truncated top-10
  }
  if (col.type === "numeric") {
    if (col.unique !== undefined && col.unique <= 20) return "bar";
    const outlierPct = col.outlierCount !== undefined && col.count > 0
      ? col.outlierCount / col.count
      : 0;
    if (outlierPct > 0.05) return "boxplot";
    return "histogram";
  }
  return "bar";
}

function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : Math.round((num / denom) * 1000) / 1000;
}
```

- [ ] **Step 3: Update `computeStats` to populate new numeric fields**

Inside the `if (type === "numeric")` block in `computeStats`, after the existing `base.histogram = buildHistogram(nums)` line, add:

```ts
        const q1 = base.p25 ?? 0;
        const q3 = base.p75 ?? 0;
        const outlierCount = computeOutlierCount(nums, q1, q3);
        const skewness = base.mean !== undefined && base.p50 !== undefined && base.std !== undefined
          ? computeSkewness(base.mean, base.p50, base.std)
          : 0;
        base.outlierCount = outlierCount;
        base.skewness = Math.round(skewness * 1000) / 1000;
        base.distributionShape = classifyShape(skewness, base.std ?? 0, (base.max ?? 0) - (base.min ?? 0));
        base.kdePoints = computeKDE(nums);
```

- [ ] **Step 4: Add `recommendedChart` to every column and compute dataset-level fields**

Replace the `return { fileName, fileSizeKB, rowCount: rows.length, columnCount: keys.length, columns };` line at the end of `computeStats` with:

```ts
  // Assign recommended chart per column
  for (const col of columns) {
    col.recommendedChart = selectChartType(col);
  }

  // Correlation matrix for all numeric column pairs
  const numericCols = columns.filter((c) => c.type === "numeric");
  const correlationMatrix: DatasetSummary["correlationMatrix"] = [];
  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const colA = numericCols[i];
      const colB = numericCols[j];
      const xs = sample.map((r) => parseFloat(String(r[colA.name]))).filter(isFinite);
      const ys = sample.map((r) => parseFloat(String(r[colB.name]))).filter(isFinite);
      const paired = xs.map((x, k) => [x, ys[k]]).filter(([, y]) => isFinite(y));
      if (paired.length < 3) continue;
      const r = pearsonR(paired.map(([x]) => x), paired.map(([, y]) => y));
      correlationMatrix.push({ col1: colA.name, col2: colB.name, r });
    }
  }

  const recommendedPairs = correlationMatrix
    .filter((p) => Math.abs(p.r) > 0.3)
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
    .slice(0, 6);

  // Missingness pattern — sample up to 200 rows
  const missSample = sample.slice(0, 200);
  const missingnessPattern = missSample
    .map((row, rowIndex) => ({
      rowIndex,
      colsWithNull: keys.filter((k) => row[k] === null || row[k] === undefined || row[k] === ""),
    }))
    .filter((r) => r.colsWithNull.length > 0);

  return {
    fileName, fileSizeKB,
    rowCount: rows.length, columnCount: keys.length,
    columns,
    correlationMatrix,
    recommendedPairs,
    missingnessPattern,
  };
```

- [ ] **Step 5: Update `summaryToPrompt` to include new fields, then commit**

After `line += ` mean=${col.mean}...`` add:
```ts
      if (col.outlierCount !== undefined) line += ` outliers=${col.outlierCount}`;
      if (col.distributionShape) line += ` shape=${col.distributionShape}`;
      if (col.skewness !== undefined) line += ` skew=${col.skewness}`;
```

Also add after the column loop:
```ts
  if (summary.recommendedPairs.length > 0) {
    lines.push("");
    lines.push("Strong correlations:");
    for (const p of summary.recommendedPairs) {
      lines.push(`- ${p.col1} × ${p.col2}: r=${p.r}`);
    }
  }
```

Then commit:
```bash
git add lib/datalab.ts
git commit -m "feat(datalab): enrich stats with outliers, skewness, KDE, correlation matrix, chart selection"
```

---

### Task 3: Rewrite `components/datalab/ChartPanel.tsx`

**Files:**
- Modify: `components/datalab/ChartPanel.tsx`

- [ ] **Step 1: Replace entire file with universal-annotation chart panel**

Write `components/datalab/ChartPanel.tsx`:

```tsx
"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  LineChart, Line, ReferenceLine, ScatterChart, Scatter, ZAxis,
} from "recharts";
import type { DatasetSummary, ColumnStats, ChartType } from "@/lib/datalab";

// ── Design tokens (match v6-final.html) ────────────────────────────────────
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
  normal: GREEN, "right-skewed": AMBER, "left-skewed": BLUE,
  "heavy-tailed": ROSE, uniform: VIOLET,
};

// ── Stat chips ──────────────────────────────────────────────────────────────

function StatChip({ label, value, color = TX2 }: { label: string; value: string | number; color?: string }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center",
      background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`,
      borderRadius: 8, padding: "4px 10px", gap: 1 }}>
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
  palette?: string[];
}

function ChartCard({ col, insight, children, palette = PALETTE }: CardProps) {
  const shape = col.distributionShape;
  const shapeColor = shape ? SHAPE_COLORS[shape] ?? TX3 : TX3;

  return (
    <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 14,
      overflow: "hidden", marginBottom: 16 }}>
      {/* Header */}
      <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "flex-start",
        justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: TX1, fontFamily: "monospace" }}>
            {col.name}
          </span>
          <span style={{ fontSize: 11, color: TX3, marginLeft: 8 }}>
            {col.count.toLocaleString()} rows · {col.nullPct}% null · {col.unique} unique
          </span>
        </div>
        {shape && (
          <span style={{ fontSize: 10, fontWeight: 600, color: shapeColor,
            background: `${shapeColor}18`, border: `1px solid ${shapeColor}40`,
            borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap" }}>
            {shape}
          </span>
        )}
      </div>

      {/* Chart body */}
      <div style={{ padding: "12px 16px" }}>{children}</div>

      {/* Stats chips */}
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
        <div style={{ margin: "0 16px 14px", padding: "10px 12px",
          background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)",
          borderRadius: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: VIOLET,
            textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Insight</span>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: TX2, lineHeight: 1.6 }}>{insight}</p>
        </div>
      )}
    </div>
  );
}

// ── Individual chart renderers ───────────────────────────────────────────────

function HistogramChart({ col, color }: { col: ColumnStats; color: string }) {
  const data = col.histogram ?? [];
  const mean = col.mean;
  const median = col.p50;
  // Find x-positions closest to mean/median for reference lines
  return (
    <div style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: TX3 }}
            interval="preserveStartEnd" angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 9, fill: TX3 }} width={28} />
          <Tooltip contentStyle={{ background: "#10101e", border: `1px solid ${BORDER}`,
            borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: TX1 }} itemStyle={{ color: TX2 }} />
          <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BoxPlotChart({ col, color }: { col: ColumnStats; color: string }) {
  // Represent as a single bar from p25 to p75 with whiskers as lines
  const p25 = col.p25 ?? 0, p50 = col.p50 ?? 0, p75 = col.p75 ?? 0;
  const min = col.min ?? 0, max = col.max ?? 0;
  const iqr = p75 - p25;
  const lowerFence = p25 - 1.5 * iqr;
  const upperFence = p75 + 1.5 * iqr;
  const data = [
    { label: "min", value: min }, { label: "lFence", value: lowerFence },
    { label: "Q1", value: p25 }, { label: "Median", value: p50 },
    { label: "Q3", value: p75 }, { label: "uFence", value: upperFence },
    { label: "max", value: max },
  ];
  return (
    <div style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: TX3 }} />
          <YAxis tick={{ fontSize: 9, fill: TX3 }} width={40} />
          <Tooltip contentStyle={{ background: "#10101e", border: `1px solid ${BORDER}`,
            borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: TX1 }} itemStyle={{ color: TX2 }} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={
                d.label === "Median" ? CYAN :
                d.label === "Q1" || d.label === "Q3" ? color :
                TX3
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
  // Render as horizontal mini-bar since PieChart isn't imported to keep deps minimal
  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.map((d) => ({ name: d.value, pct: Math.round(d.count / total * 1000) / 10 }))}
          layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 9, fill: TX3 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: TX2 }} width={80} />
          <Tooltip contentStyle={{ background: "#10101e", border: `1px solid ${BORDER}`,
            borderRadius: 8, fontSize: 11 }}
            formatter={(v: number) => [`${v}%`, "share"]}
            labelStyle={{ color: TX1 }} />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.9} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HorizontalBarChart({ col }: { col: ColumnStats }) {
  const data = (col.topValues ?? []).slice(0, 10);
  return (
    <div style={{ height: Math.max(180, data.length * 22) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.map((d) => ({ name: d.value, count: d.count }))}
          layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 9, fill: TX3 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: TX2 }} width={90} />
          <Tooltip contentStyle={{ background: "#10101e", border: `1px solid ${BORDER}`,
            borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: TX1 }} itemStyle={{ color: TX2 }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Chart dispatcher ─────────────────────────────────────────────────────────

function ColumnChart({ col, colorIdx, insight }: { col: ColumnStats; colorIdx: number; insight?: string }) {
  const color = PALETTE[colorIdx % PALETTE.length];
  const chartType: ChartType = col.recommendedChart ?? "bar";

  let body: React.ReactNode;
  if (chartType === "histogram") body = <HistogramChart col={col} color={color} />;
  else if (chartType === "boxplot") body = <BoxPlotChart col={col} color={color} />;
  else if (chartType === "donut" || chartType === "bar") body = <DonutChart col={col} />;
  else if (chartType === "horizontal-bar") body = <HorizontalBarChart col={col} />;
  else body = <HistogramChart col={col} color={color} />;

  return <ChartCard col={col} insight={insight}>{body}</ChartCard>;
}

// ── Null-rate bar chart (existing overview chart) ────────────────────────────

function NullRateChart({ summary }: { summary: DatasetSummary }) {
  return (
    <div>
      <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.1em", color: TX3, marginBottom: 12 }}>
        Null Rate per Column
      </h3>
      <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.columns.map((c) => ({ name: c.name, nullPct: c.nullPct }))}
              margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: TX3 }} angle={-40} textAnchor="end" />
              <YAxis tick={{ fontSize: 9, fill: TX3 }} width={28} domain={[0, 100]}
                tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ background: "#10101e", border: `1px solid ${BORDER}`,
                borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [`${v}%`, "Null %"]}
                labelStyle={{ color: TX1 }} />
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

// ── Main export ──────────────────────────────────────────────────────────────

interface Props {
  summary: DatasetSummary;
  chartInsights?: Record<string, string>;
}

export function ChartPanel({ summary, chartInsights = {} }: Props) {
  const chartable = summary.columns.filter(
    (c) => c.type !== "mixed" && (c.histogram?.length || c.topValues?.length)
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
```

- [ ] **Step 2: Commit**

```bash
git add components/datalab/ChartPanel.tsx
git commit -m "feat(datalab): rewrite ChartPanel with universal annotation standard and intelligent chart selection"
```

---

### Task 4: Create EDA tab components

**Files:**
- Create: `components/datalab/DistributionsTab.tsx`
- Create: `components/datalab/CorrelationsTab.tsx`
- Create: `components/datalab/OutliersTab.tsx`
- Create: `components/datalab/MissingTab.tsx`

- [ ] **Step 1: Create `DistributionsTab.tsx`**

```tsx
"use client";
import type { DatasetSummary } from "@/lib/datalab";
import { ChartPanel } from "./ChartPanel";

interface Props {
  summary: DatasetSummary;
  chartInsights?: Record<string, string>;
}

export function DistributionsTab({ summary, chartInsights }: Props) {
  return (
    <div>
      <p style={{ fontSize: 12, color: "#5c6a80", marginBottom: 16 }}>
        Each column shown with its agent-selected chart type, annotated with distribution shape, stats, and AI insight.
      </p>
      <ChartPanel summary={summary} chartInsights={chartInsights} />
    </div>
  );
}
```

- [ ] **Step 2: Create `CorrelationsTab.tsx`**

```tsx
"use client";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, LineChart, Line,
} from "recharts";
import type { DatasetSummary } from "@/lib/datalab";

const TX1 = "#e8edf5", TX2 = "#9ba8bc", TX3 = "#5c6a80";
const VIOLET = "#8b5cf6", CYAN = "#22d3ee", BORDER = "rgba(255,255,255,0.07)";

interface Props {
  summary: DatasetSummary;
  chartInsights?: Record<string, string>;
}

export function CorrelationsTab({ summary, chartInsights = {} }: Props) {
  const { correlationMatrix, recommendedPairs, columns } = summary;

  if (correlationMatrix.length === 0) {
    return (
      <p style={{ color: TX3, textAlign: "center", padding: "40px 0", fontSize: 13 }}>
        No numeric column pairs found for correlation analysis.
      </p>
    );
  }

  const allNumeric = columns.filter((c) => c.type === "numeric");
  const colNames = allNumeric.map((c) => c.name);

  // Build matrix lookup
  const rLookup = new Map<string, number>();
  for (const p of correlationMatrix) {
    rLookup.set(`${p.col1}|${p.col2}`, p.r);
    rLookup.set(`${p.col2}|${p.col1}`, p.r);
  }

  function rColor(r: number): string {
    if (r > 0.7) return VIOLET;
    if (r > 0.4) return CYAN;
    if (r < -0.7) return "#fb7185";
    if (r < -0.4) return "#fbbf24";
    return TX3;
  }

  return (
    <div>
      {/* Correlation heatmap */}
      <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.1em", color: TX3, marginBottom: 12 }}>
        Correlation Heatmap
      </h3>
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ width: 100 }} />
              {colNames.map((n) => (
                <th key={n} style={{ color: TX2, padding: "4px 6px", fontWeight: 500,
                  writingMode: "vertical-lr", transform: "rotate(180deg)", maxWidth: 80,
                  overflow: "hidden", textOverflow: "ellipsis" }}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colNames.map((row) => (
              <tr key={row}>
                <td style={{ color: TX2, padding: "4px 8px", fontWeight: 500,
                  maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap" }}>{row}</td>
                {colNames.map((col) => {
                  const r = row === col ? 1 : (rLookup.get(`${row}|${col}`) ?? 0);
                  const bg = r === 1 ? "rgba(139,92,246,0.3)" :
                    r > 0 ? `rgba(34,211,238,${Math.abs(r) * 0.5})` :
                    `rgba(251,113,133,${Math.abs(r) * 0.5})`;
                  return (
                    <td key={col} style={{ background: bg, padding: "6px 8px",
                      textAlign: "center", color: Math.abs(r) > 0.3 ? TX1 : TX3,
                      fontWeight: Math.abs(r) > 0.5 ? 700 : 400,
                      border: `1px solid ${BORDER}` }}>
                      {r.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top correlated pairs */}
      {recommendedPairs.length > 0 && (
        <div>
          <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.1em", color: TX3, marginBottom: 12 }}>
            Top Correlated Pairs
          </h3>
          {recommendedPairs.map((pair) => {
            const insight = chartInsights[`${pair.col1}_${pair.col2}`] ??
              chartInsights[`${pair.col2}_${pair.col1}`];
            return (
              <div key={`${pair.col1}_${pair.col2}`}
                style={{ background: "#0c0c18", border: `1px solid ${BORDER}`,
                  borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: TX1, fontFamily: "monospace" }}>
                    {pair.col1} × {pair.col2}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700,
                    color: rColor(pair.r), background: `${rColor(pair.r)}18`,
                    border: `1px solid ${rColor(pair.r)}40`,
                    borderRadius: 20, padding: "2px 10px" }}>
                    r = {pair.r}
                  </span>
                </div>
                {insight && (
                  <p style={{ fontSize: 12, color: TX2, lineHeight: 1.6,
                    background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)",
                    borderRadius: 8, padding: "8px 10px", margin: 0 }}>{insight}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `OutliersTab.tsx`**

```tsx
"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { DatasetSummary } from "@/lib/datalab";

const TX1 = "#e8edf5", TX2 = "#9ba8bc", TX3 = "#5c6a80";
const ROSE = "#fb7185", GREEN = "#34d399", AMBER = "#fbbf24", VIOLET = "#8b5cf6";
const BORDER = "rgba(255,255,255,0.07)";

interface Props { summary: DatasetSummary }

export function OutliersTab({ summary }: Props) {
  const numericCols = summary.columns.filter((c) => c.type === "numeric" && c.outlierCount !== undefined);
  const totalOutliers = numericCols.reduce((s, c) => s + (c.outlierCount ?? 0), 0);

  if (numericCols.length === 0) {
    return <p style={{ color: TX3, textAlign: "center", padding: "40px 0", fontSize: 13 }}>No numeric columns found.</p>;
  }

  const data = numericCols.map((c) => ({
    name: c.name,
    outliers: c.outlierCount ?? 0,
    pct: c.count > 0 ? Math.round((c.outlierCount ?? 0) / c.count * 1000) / 10 : 0,
  })).sort((a, b) => b.outliers - a.outliers);

  return (
    <div>
      <div style={{ background: "#0c0c18", border: `1px solid ${BORDER}`,
        borderRadius: 12, padding: "12px 16px", marginBottom: 16,
        display: "flex", gap: 16, alignItems: "center" }}>
        <span style={{ fontSize: 13, color: TX2 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: totalOutliers > 0 ? ROSE : GREEN }}>
            {totalOutliers}
          </span>{" "}total outlier values across{" "}
          <strong style={{ color: TX1 }}>{numericCols.length}</strong> numeric columns
        </span>
        {totalOutliers > 0 && (
          <span style={{ fontSize: 11, color: AMBER, background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.25)", borderRadius: 8, padding: "3px 10px" }}>
            Recommend: investigate or cap outliers before modeling
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
        {data.map((d, i) => {
          const col = numericCols.find((c) => c.name === d.name)!;
          const boxData = [
            { label: "Min", value: col.min ?? 0 },
            { label: "Q1", value: col.p25 ?? 0 },
            { label: "Median", value: col.p50 ?? 0 },
            { label: "Mean", value: col.mean ?? 0 },
            { label: "Q3", value: col.p75 ?? 0 },
            { label: "Max", value: col.max ?? 0 },
          ];
          return (
            <div key={d.name} style={{ background: "#0c0c18", border: `1px solid ${BORDER}`,
              borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: TX1, fontFamily: "monospace" }}>{d.name}</span>
                <span style={{ fontSize: 11, color: d.outliers > 0 ? ROSE : GREEN,
                  background: d.outliers > 0 ? "rgba(251,113,133,0.12)" : "rgba(52,211,153,0.1)",
                  border: `1px solid ${d.outliers > 0 ? "rgba(251,113,133,0.3)" : "rgba(52,211,153,0.25)"}`,
                  borderRadius: 20, padding: "2px 8px" }}>
                  {d.outliers} outliers ({d.pct}%)
                </span>
              </div>
              <div style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={boxData} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: TX3 }} />
                    <YAxis tick={{ fontSize: 9, fill: TX3 }} width={40} />
                    <Tooltip contentStyle={{ background: "#10101e", border: `1px solid ${BORDER}`,
                      borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: TX1 }} itemStyle={{ color: TX2 }} />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {boxData.map((bd, bi) => (
                        <Cell key={bi} fill={
                          bd.label === "Median" ? VIOLET :
                          bd.label === "Mean" ? "#22d3ee" :
                          bd.label === "Min" || bd.label === "Max" ? ROSE : "#60a5fa"
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `MissingTab.tsx`**

```tsx
"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { DatasetSummary } from "@/lib/datalab";

const TX1 = "#e8edf5", TX2 = "#9ba8bc", TX3 = "#5c6a80";
const ROSE = "#fb7185", GREEN = "#34d399", AMBER = "#fbbf24";
const BORDER = "rgba(255,255,255,0.07)";

interface Props { summary: DatasetSummary }

export function MissingTab({ summary }: Props) {
  const colsWithNulls = summary.columns
    .filter((c) => c.nullPct > 0)
    .sort((a, b) => b.nullPct - a.nullPct);

  const { missingnessPattern } = summary;

  // Co-occurrence: columns that are null together frequently
  const coOccurrence = new Map<string, number>();
  for (const row of missingnessPattern) {
    for (let i = 0; i < row.colsWithNull.length; i++) {
      for (let j = i + 1; j < row.colsWithNull.length; j++) {
        const key = `${row.colsWithNull[i]}|${row.colsWithNull[j]}`;
        coOccurrence.set(key, (coOccurrence.get(key) ?? 0) + 1);
      }
    }
  }
  const topCoOccurrence = [...coOccurrence.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (colsWithNulls.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <p style={{ fontSize: 22, marginBottom: 8 }}>✓</p>
        <p style={{ color: GREEN, fontSize: 14, fontWeight: 600 }}>No missing data detected</p>
      </div>
    );
  }

  return (
    <div>
      {/* Null % per column bar chart */}
      <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.1em", color: TX3, marginBottom: 12 }}>
        Null % per Column
      </h3>
      <div style={{ background: "#0c0c18", border: `1px solid ${BORDER}`,
        borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={colsWithNulls.map((c) => ({ name: c.name, nullPct: c.nullPct }))}
              margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: TX3 }} angle={-40} textAnchor="end" />
              <YAxis tick={{ fontSize: 9, fill: TX3 }} width={28} domain={[0, 100]}
                tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ background: "#10101e", border: `1px solid ${BORDER}`,
                borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [`${v}%`, "Null %"]}
                labelStyle={{ color: TX1 }} />
              <Bar dataKey="nullPct" radius={[3, 3, 0, 0]}>
                {colsWithNulls.map((col, i) => (
                  <Cell key={i} fill={col.nullPct > 20 ? ROSE : col.nullPct > 5 ? AMBER : GREEN} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Missingness heatmap (sampled rows) */}
      {missingnessPattern.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.1em", color: TX3, marginBottom: 12 }}>
            Row-Level Missingness Pattern (first 200 rows sampled)
          </h3>
          <div style={{ overflowX: "auto", background: "#0c0c18",
            border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {missingnessPattern.slice(0, 100).map((row) => (
                <div key={row.rowIndex} title={`Row ${row.rowIndex}: ${row.colsWithNull.join(", ")} null`}
                  style={{ width: 8, height: 8, borderRadius: 2,
                    background: row.colsWithNull.length > 2 ? ROSE :
                      row.colsWithNull.length > 1 ? AMBER : "#fbbf2460",
                    cursor: "pointer" }} />
              ))}
            </div>
            <p style={{ fontSize: 10, color: TX3, marginTop: 8 }}>
              Each dot = one row with missing values. Hover for details.
            </p>
          </div>
        </div>
      )}

      {/* Co-occurrence */}
      {topCoOccurrence.length > 0 && (
        <div style={{ background: "rgba(251,113,133,0.05)",
          border: "1px solid rgba(251,113,133,0.2)", borderRadius: 12, padding: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: ROSE, marginBottom: 8,
            textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Correlated Missingness
          </p>
          {topCoOccurrence.map(([key, count]) => {
            const [a, b] = key.split("|");
            const pct = missingnessPattern.length > 0
              ? Math.round(count / missingnessPattern.length * 100)
              : 0;
            return (
              <p key={key} style={{ fontSize: 12, color: TX2, margin: "4px 0" }}>
                <code style={{ color: AMBER }}>{a}</code> and{" "}
                <code style={{ color: AMBER }}>{b}</code> are both null in{" "}
                <strong style={{ color: TX1 }}>{pct}%</strong> of missing rows — likely from the same data source gap.
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit the four new tab components**

```bash
git add components/datalab/DistributionsTab.tsx components/datalab/CorrelationsTab.tsx \
  components/datalab/OutliersTab.tsx components/datalab/MissingTab.tsx
git commit -m "feat(datalab): add Distributions, Correlations, Outliers, Missing EDA tab components"
```

---

### Task 5: Create DS Workflow and Report tab components

**Files:**
- Create: `components/datalab/DSWorkflowTab.tsx`
- Create: `components/datalab/ReportTab.tsx`

- [ ] **Step 1: Create `DSWorkflowTab.tsx`**

```tsx
"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Lock, Loader2, Circle } from "lucide-react";
import type { DatasetSummary } from "@/lib/datalab";

const TX1 = "#e8edf5", TX2 = "#9ba8bc", TX3 = "#5c6a80";
const VIOLET = "#8b5cf6", CYAN = "#22d3ee", GREEN = "#34d399";
const AMBER = "#fbbf24", BORDER = "rgba(255,255,255,0.07)";

export interface WorkflowStep {
  id: string;
  number: number;
  title: string;
  status: "done" | "active" | "locked";
  agentName: string;
  output?: string;
  code?: string;
}

interface Props {
  summary: DatasetSummary;
  steps?: WorkflowStep[];
  analysisComplete: boolean;
}

const DEFAULT_STEPS: WorkflowStep[] = [
  { id: "ingest", number: 1, title: "Data Ingestion & Schema Validation", status: "done",
    agentName: "Data Quality", output: "Schema validated. Auto-detected column types. Ready for EDA." },
  { id: "eda", number: 2, title: "Exploratory Data Analysis", status: "done",
    agentName: "Data Analyst", output: "EDA complete. See Distributions, Correlations and Outliers tabs for full results." },
  { id: "quality", number: 3, title: "Data Quality & Cleaning", status: "active",
    agentName: "Data Quality",
    code: "# Auto-generated cleaning pipeline\nimport pandas as pd\nfrom sklearn.impute import SimpleImputer\n\n# Drop columns with >50% nulls\ndf = df.dropna(thresh=len(df)*0.5, axis=1)\n\n# Impute remaining nulls\nnum_imputer = SimpleImputer(strategy='median')\ncat_imputer = SimpleImputer(strategy='most_frequent')" },
  { id: "features", number: 4, title: "Feature Engineering", status: "active",
    agentName: "Feature Engineer", output: "Waiting for agent output..." },
  { id: "preprocessing", number: 5, title: "Preprocessing Pipeline", status: "active",
    agentName: "Feature Engineer",
    code: "from sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler, OneHotEncoder\nfrom sklearn.compose import ColumnTransformer\n\n# Configure transformer (update column lists as needed)\npreprocessor = ColumnTransformer([\n  ('num', StandardScaler(), numeric_features),\n  ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)\n])" },
  { id: "target", number: 6, title: "Target Variable Analysis", status: "locked", agentName: "Data Analyst" },
  { id: "baseline", number: 7, title: "Baseline Model & Cross-Validation", status: "locked", agentName: "ML Expert" },
  { id: "tuning", number: 8, title: "Hyperparameter Tuning (Optuna)", status: "locked", agentName: "ML Expert" },
  { id: "eval", number: 9, title: "Model Evaluation & SHAP Interpretability", status: "locked", agentName: "ML Expert" },
  { id: "deploy", number: 10, title: "Deployment Preparation & Notebook Export", status: "locked", agentName: "Code Generator" },
];

export function DSWorkflowTab({ summary, steps, analysisComplete }: Props) {
  const [expanded, setExpanded] = useState<string | null>("ingest");
  const workflowSteps = steps ?? DEFAULT_STEPS;

  function statusIcon(status: WorkflowStep["status"]) {
    if (status === "done") return <CheckCircle2 size={16} color={GREEN} />;
    if (status === "active") return <Circle size={16} color={CYAN} style={{ strokeDasharray: "4 2" }} />;
    return <Lock size={14} color={TX3} />;
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: TX3, marginBottom: 16 }}>
        End-to-end data science workflow — {analysisComplete ? "agent outputs pre-populated below" : "run analysis to populate agent outputs"}.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {workflowSteps.map((step) => {
          const isOpen = expanded === step.id;
          const isLocked = step.status === "locked";
          return (
            <div key={step.id}
              style={{ background: "#0c0c18", border: `1px solid ${
                step.status === "done" ? "rgba(52,211,153,0.2)" :
                step.status === "active" ? "rgba(34,211,238,0.2)" :
                BORDER
              }`, borderRadius: 12, overflow: "hidden" }}>
              <button
                disabled={isLocked}
                onClick={() => setExpanded(isOpen ? null : step.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", background: "transparent", border: "none",
                  cursor: isLocked ? "not-allowed" : "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: TX3,
                  background: "rgba(255,255,255,0.04)", borderRadius: 6,
                  padding: "2px 6px", minWidth: 22, textAlign: "center" }}>
                  {step.number}
                </span>
                {statusIcon(step.status)}
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600,
                  color: isLocked ? TX3 : TX1 }}>
                  {step.title}
                </span>
                <span style={{ fontSize: 10, color: TX3,
                  background: "rgba(255,255,255,0.04)", borderRadius: 20,
                  padding: "1px 8px" }}>{step.agentName}</span>
                {!isLocked && (
                  isOpen ? <ChevronDown size={14} color={TX3} /> : <ChevronRight size={14} color={TX3} />
                )}
              </button>

              {isOpen && !isLocked && (
                <div style={{ borderTop: `1px solid ${BORDER}`, padding: 14 }}>
                  {step.output && (
                    <p style={{ fontSize: 12, color: TX2, lineHeight: 1.6, marginBottom: step.code ? 12 : 0 }}>
                      {step.output}
                    </p>
                  )}
                  {step.code && (
                    <pre style={{ fontSize: 11, color: "#a5f3fc", background: "#06060e",
                      border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12,
                      overflowX: "auto", margin: 0, lineHeight: 1.7 }}>
                      {step.code}
                    </pre>
                  )}
                  {!step.output && !step.code && (
                    <p style={{ fontSize: 12, color: TX3, fontStyle: "italic" }}>
                      Run analysis to populate this step.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `ReportTab.tsx`**

```tsx
"use client";
import type { DatasetSummary } from "@/lib/datalab";

const TX1 = "#e8edf5", TX2 = "#9ba8bc", TX3 = "#5c6a80";
const VIOLET = "#8b5cf6", CYAN = "#22d3ee", GREEN = "#34d399";
const AMBER = "#fbbf24", ROSE = "#fb7185", BORDER = "rgba(255,255,255,0.07)";

interface Props {
  summary: DatasetSummary;
  findings?: string[];
  qualityScore?: number;
  recommendations?: string[];
  analysisComplete: boolean;
}

function KPICard({ label, value, color = CYAN }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: "#0c0c18", border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: "14px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: TX3, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function buildMarkdown(summary: DatasetSummary, findings: string[], qualityScore: number, recommendations: string[]): string {
  const lines: string[] = [
    `# DataLab Report — ${summary.fileName}`,
    `_Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}_`,
    "",
    "## Dataset at a Glance",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Records | ${summary.rowCount.toLocaleString()} |`,
    `| Features | ${summary.columnCount} |`,
    `| Quality Score | ${qualityScore}/100 |`,
    `| Insights Generated | ${findings.length} |`,
    "",
    "## Key Findings",
    ...findings.map((f) => `- ${f}`),
    "",
    "## Data Quality",
  ];
  const nullCols = summary.columns.filter((c) => c.nullPct > 0);
  if (nullCols.length === 0) {
    lines.push("No missing values detected. Dataset is complete.");
  } else {
    lines.push("| Column | Null % | Severity |");
    lines.push("|--------|--------|----------|");
    for (const c of nullCols) {
      lines.push(`| ${c.name} | ${c.nullPct}% | ${c.nullPct > 20 ? "High" : c.nullPct > 5 ? "Medium" : "Low"} |`);
    }
  }
  if (recommendations.length > 0) {
    lines.push("", "## Next Steps");
    recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
  }
  return lines.join("\n");
}

export function ReportTab({ summary, findings = [], qualityScore = 0, recommendations = [], analysisComplete }: Props) {
  const defaultFindings = [
    `Dataset contains ${summary.rowCount.toLocaleString()} records across ${summary.columnCount} columns.`,
    `${summary.columns.filter((c) => c.type === "numeric").length} numeric and ${summary.columns.filter((c) => c.type === "categorical").length} categorical features detected.`,
    summary.recommendedPairs.length > 0
      ? `Strongest correlation: ${summary.recommendedPairs[0].col1} × ${summary.recommendedPairs[0].col2} (r = ${summary.recommendedPairs[0].r}).`
      : "No strong linear correlations detected between numeric features.",
    `${summary.columns.filter((c) => c.nullPct > 0).length} columns have missing values — review Missing Data tab for details.`,
    `${summary.columns.filter((c) => (c.outlierCount ?? 0) > 0).length} columns contain outliers detected via IQR method.`,
  ];
  const activeFindings = findings.length > 0 ? findings : defaultFindings;

  const defaultRecs = [
    "Address missing values before modeling — see Preprocessing tab for recommended imputation strategy.",
    "Investigate outlier columns — consider capping or log-transforming skewed features.",
    "Run the DS Workflow tab to get model recommendations tailored to this dataset.",
  ];
  const activeRecs = recommendations.length > 0 ? recommendations : defaultRecs;

  function handlePrint() { window.print(); }

  function handleCopyMarkdown() {
    const md = buildMarkdown(summary, activeFindings, qualityScore, activeRecs);
    void navigator.clipboard.writeText(md);
  }

  return (
    <div>
      {/* Report header */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: TX1, margin: 0 }}>
            DataLab Report
          </h2>
          <p style={{ fontSize: 11, color: TX3, margin: "2px 0 0" }}>
            {summary.fileName} · {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleCopyMarkdown}
            style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
              background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)",
              color: VIOLET }}>
            Copy Markdown
          </button>
          <button onClick={handlePrint}
            style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
              background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)",
              color: CYAN }}>
            Export PDF
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        <KPICard label="Records" value={summary.rowCount.toLocaleString()} color={CYAN} />
        <KPICard label="Features" value={summary.columnCount} color={VIOLET} />
        <KPICard label="Quality Score" value={`${qualityScore}/100`}
          color={qualityScore >= 80 ? GREEN : qualityScore >= 60 ? AMBER : ROSE} />
        <KPICard label="AI Insights" value={activeFindings.length} color={GREEN} />
      </div>

      {/* Key Findings */}
      <div style={{ background: "#0c0c18", border: `1px solid ${BORDER}`,
        borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.1em", color: TX3, marginBottom: 12 }}>Key Findings</h3>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {activeFindings.map((f, i) => (
            <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start",
              padding: "6px 0", borderBottom: i < activeFindings.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <span style={{ color: CYAN, flexShrink: 0, marginTop: 1 }}>▸</span>
              <span style={{ fontSize: 13, color: TX2, lineHeight: 1.6 }}>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Next Steps */}
      <div style={{ background: "#0c0c18", border: `1px solid ${BORDER}`,
        borderRadius: 14, padding: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.1em", color: TX3, marginBottom: 12 }}>Next Steps</h3>
        <ol style={{ margin: 0, padding: "0 0 0 20px" }}>
          {activeRecs.map((r, i) => (
            <li key={i} style={{ fontSize: 13, color: TX2, lineHeight: 1.6,
              padding: "4px 0" }}>{r}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/datalab/DSWorkflowTab.tsx components/datalab/ReportTab.tsx
git commit -m "feat(datalab): add DSWorkflowTab (10-step) and ReportTab (PDF/markdown export)"
```

---

### Task 6: Wire new tabs into `DataLabShell.tsx`

**Files:**
- Modify: `components/datalab/DataLabShell.tsx`

- [ ] **Step 1: Update the `Tab` type at the top of `DataLabShell.tsx`**

Find: `type Tab = "overview" | "charts" | "analysis" | "code" | "chat" | "agents" | "prompt-builder" | "notes";`

Replace with:
```ts
type Tab = "overview" | "charts" | "analysis" | "code" | "chat" | "agents" | "prompt-builder" | "notes"
         | "distributions" | "correlations" | "outliers" | "missing" | "ds-workflow" | "report";
```

- [ ] **Step 2: Add new imports at the top of `DataLabShell.tsx`** (after the existing component imports)

```ts
import { DistributionsTab } from "./DistributionsTab";
import { CorrelationsTab } from "./CorrelationsTab";
import { OutliersTab } from "./OutliersTab";
import { MissingTab } from "./MissingTab";
import { DSWorkflowTab } from "./DSWorkflowTab";
import { ReportTab } from "./ReportTab";
```

Also add to the lucide-react import: `GitBranch, Layers, Activity, Workflow, FileBarChart`

- [ ] **Step 3: Add tab buttons for the 6 new tabs**

Find the existing tab button list in the JSX (the `<div>` containing the tab buttons for overview/charts/analysis etc.). After the last existing tab button (before the closing `</div>`), add:

```tsx
{summary && (
  <>
    {[
      { id: "distributions" as Tab, label: "Distributions", icon: Layers },
      { id: "correlations" as Tab, label: "Correlations", icon: GitBranch },
      { id: "outliers" as Tab, label: "Outliers", icon: Activity },
      { id: "missing" as Tab, label: "Missing", icon: AlertCircle },
      { id: "ds-workflow" as Tab, label: "DS Workflow", icon: Workflow },
      { id: "report" as Tab, label: "Report", icon: FileBarChart },
    ].map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === id ? "text-white" : ""}`}
        style={{
          background: activeTab === id ? "var(--color-bg-elevated)" : "transparent",
          color: activeTab === id ? "var(--color-text-primary)" : "var(--color-text-muted)",
        }}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    ))}
  </>
)}
```

- [ ] **Step 4: Add new tab content panels**

Find the section in the JSX that renders tab content (the part with `{activeTab === "overview" && ...}`). After the last existing tab content block, add:

```tsx
{activeTab === "distributions" && summary && (
  <DistributionsTab summary={summary} chartInsights={agentOutputs?.dataAnalyst?.chartInsights} />
)}
{activeTab === "correlations" && summary && (
  <CorrelationsTab summary={summary} chartInsights={agentOutputs?.dataAnalyst?.chartInsights} />
)}
{activeTab === "outliers" && summary && (
  <OutliersTab summary={summary} />
)}
{activeTab === "missing" && summary && (
  <MissingTab summary={summary} />
)}
{activeTab === "ds-workflow" && summary && (
  <DSWorkflowTab summary={summary} analysisComplete={pipelineDone} />
)}
{activeTab === "report" && summary && (
  <ReportTab
    summary={summary}
    qualityScore={agentOutputs?.dataQuality?.score}
    analysisComplete={pipelineDone}
  />
)}
```

Note: `agentOutputs` and `pipelineDone` need to be read from existing state in DataLabShell. Read the current state variable names from the file — they will be named something like `agentStates` and a boolean derived from pipeline stages all being `"done"`.

- [ ] **Step 5: Update `ChartPanel` call in the `"charts"` tab to pass `chartInsights`**

Find the existing `<ChartPanel summary={summary} />` call and replace with:
```tsx
<ChartPanel summary={summary} chartInsights={agentOutputs?.dataAnalyst?.chartInsights} />
```

- [ ] **Step 6: Commit**

```bash
git add components/datalab/DataLabShell.tsx
git commit -m "feat(datalab): wire Distributions, Correlations, Outliers, Missing, DS Workflow, Report tabs into DataLabShell"
```

---

## Track 3 — Email Access & Magic Links

### Task 7: Extend `lib/datalab-access.ts` with email requests and agent scope

**Files:**
- Modify: `lib/datalab-access.ts`

- [ ] **Step 1: Add `AgentScope` type and extend `PendingRequest` for email type**

Add after the existing `PendingRequest` interface:

```ts
export type AgentScope =
  | "data-analyst" | "visualization" | "ml-expert"
  | "feature-engineer" | "nlp-expert" | "time-series" | "full";

export interface EmailPendingRequest {
  type: "email";
  id: string; // random UUID
  name: string;
  email: string;
  reason?: string;
  agentScope: AgentScope[];
  requestedAt: number;
}
```

- [ ] **Step 2: Add in-memory email request store and rate limiter**

Add after the `pendingRequests` Map:

```ts
const emailPendingRequests = new Map<string, EmailPendingRequest>();

// Rate limit: max 3 requests per email per hour
const emailRequestTimestamps = new Map<string, number[]>();

export function checkEmailRateLimit(email: string): boolean {
  const now = Date.now();
  const hourAgo = now - 3_600_000;
  const timestamps = (emailRequestTimestamps.get(email) ?? []).filter((t) => t > hourAgo);
  if (timestamps.length >= 3) return false;
  timestamps.push(now);
  emailRequestTimestamps.set(email, timestamps);
  return true;
}

export function addEmailPendingRequest(req: Omit<EmailPendingRequest, "id" | "type" | "requestedAt">): string {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const full: EmailPendingRequest = { ...req, type: "email", id, requestedAt: Date.now() };
  emailPendingRequests.set(id, full);
  return id;
}

export function getEmailPendingRequests(): EmailPendingRequest[] {
  return Array.from(emailPendingRequests.values()).sort((a, b) => b.requestedAt - a.requestedAt);
}

export function removeEmailPendingRequest(id: string): void {
  emailPendingRequests.delete(id);
}

export function getEmailPendingCount(): number {
  return emailPendingRequests.size;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/datalab-access.ts
git commit -m "feat(access): add email pending request store with rate limiting and agent scope"
```

---

### Task 8: Add magic token functions to `lib/datalab-tokens.ts`

**Files:**
- Modify: `lib/datalab-tokens.ts`

- [ ] **Step 1: Add `MagicPayload`, `createMagicAccessToken`, `verifyMagicToken`**

Append to end of `lib/datalab-tokens.ts`:

```ts
export interface MagicPayload {
  type: "magic";
  name: string;
  email: string;
  agentScope: string[];
  exp: number;
}

/** Create a signed magic-link token valid for `durationDays` days. */
export function createMagicAccessToken(
  name: string,
  email: string,
  agentScope: string[],
  durationDays = 7
): string {
  const payload: MagicPayload = {
    type: "magic",
    name,
    email,
    agentScope,
    exp: Date.now() + durationDays * 86_400_000,
  };
  const data = encode(payload);
  const sig = sign(data, getSecret());
  return `${data}.${sig}`;
}

export type MagicVerifyResult =
  | { ok: true; payload: MagicPayload }
  | { ok: false; reason: "invalid" | "expired" | "wrong-type" };

/** Verify a magic-link token (does NOT mark as used — cookie TTL handles expiry). */
export function verifyMagicToken(token: string): MagicVerifyResult {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return { ok: false, reason: "invalid" };
    const data = token.slice(0, dotIdx);
    const receivedSig = token.slice(dotIdx + 1);
    const expectedSig = sign(data, getSecret());
    const a = Buffer.from(receivedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: "invalid" };
    }
    const payload = decode<MagicPayload>(data);
    if (payload.type !== "magic") return { ok: false, reason: "wrong-type" };
    if (Date.now() > payload.exp) return { ok: false, reason: "expired" };
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/datalab-tokens.ts
git commit -m "feat(tokens): add createMagicAccessToken and verifyMagicToken for email access"
```

---

### Task 9: Create email request API route

**Files:**
- Create: `app/api/datalab/request-email/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { addEmailPendingRequest, checkEmailRateLimit } from "@/lib/datalab-access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email, reason, agentScope } = body as {
    name?: string;
    email?: string;
    reason?: string;
    agentScope?: string[];
  };

  if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
    return NextResponse.json({ error: "name is required (max 100 chars)" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Valid email is required (max 200 chars)" }, { status: 400 });
  }
  if (reason && (typeof reason !== "string" || reason.length > 300)) {
    return NextResponse.json({ error: "reason must be a string (max 300 chars)" }, { status: 400 });
  }

  const scope: string[] = Array.isArray(agentScope) && agentScope.length > 0
    ? agentScope.filter((s) => typeof s === "string")
    : ["full"];

  if (!checkEmailRateLimit(email.toLowerCase())) {
    return NextResponse.json(
      { error: "Too many requests. Max 3 per email per hour." },
      { status: 429 }
    );
  }

  addEmailPendingRequest({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    reason: reason?.trim(),
    agentScope: scope as import("@/lib/datalab-access").AgentScope[],
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/datalab/request-email/route.ts
git commit -m "feat(api): add POST /api/datalab/request-email with validation and rate limiting"
```

---

### Task 10: Create magic link API routes

**Files:**
- Create: `app/api/datalab/magic/route.ts`
- Create: `app/api/admin/datalab-access/magic-link/route.ts`

- [ ] **Step 1: Create `app/api/datalab/magic/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyMagicToken } from "@/lib/datalab-tokens";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse(errorHtml("Missing token."), {
      status: 400, headers: { "Content-Type": "text/html" },
    });
  }

  const result = verifyMagicToken(token);

  if (!result.ok) {
    const msg = result.reason === "expired"
      ? "This link has expired. Please request a new one."
      : "Invalid access link. Please contact the GadaaLabs team.";
    return new NextResponse(errorHtml(msg), {
      status: 400, headers: { "Content-Type": "text/html" },
    });
  }

  const response = NextResponse.redirect(new URL("/datalab?access=granted", req.nextUrl.origin));
  response.cookies.set("datalab_magic", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 604_800, // 7 days in seconds
    path: "/",
  });
  return response;
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Access Error</title>
<style>body{font-family:system-ui;background:#06060e;color:#e8edf5;display:flex;
align-items:center;justify-content:center;min-height:100vh;margin:0;}
.card{background:#0c0c18;border:1px solid rgba(255,255,255,0.07);border-radius:14px;
padding:32px;max-width:420px;text-align:center;}
h1{color:#fb7185;font-size:20px;margin:0 0 12px;}
p{color:#9ba8bc;font-size:14px;}
a{color:#8b5cf6;}</style></head>
<body><div class="card"><h1>Access Error</h1><p>${message}</p>
<p><a href="/datalab">← Back to DataLab</a></p></div></body></html>`;
}
```

- [ ] **Step 2: Create `app/api/admin/datalab-access/magic-link/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isDataLabAdmin } from "@/lib/datalab-access";
import { createMagicAccessToken } from "@/lib/datalab-tokens";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDataLabAdmin(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const name = req.nextUrl.searchParams.get("name") ?? "";
  const email = req.nextUrl.searchParams.get("email") ?? "";
  const agentsParam = req.nextUrl.searchParams.get("agents") ?? "full";
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "7", 10);

  if (!name || !email) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const agentScope = agentsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const token = createMagicAccessToken(name, email, agentScope, days);

  const origin = process.env.NEXT_PUBLIC_URL
    ?? process.env.NEXTAUTH_URL
    ?? `https://${req.nextUrl.host}`;
  const magicUrl = `${origin}/api/datalab/magic?token=${encodeURIComponent(token)}`;

  return NextResponse.json({ magicUrl });
}
```

- [ ] **Step 3: Commit both routes**

```bash
git add app/api/datalab/magic/route.ts app/api/admin/datalab-access/magic-link/route.ts
git commit -m "feat(api): add magic link setter route and admin magic-link generator endpoint"
```

---

### Task 11: Create `EmailRequestForm` component

**Files:**
- Create: `components/datalab/EmailRequestForm.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";
import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";

type AgentScope = "data-analyst" | "visualization" | "ml-expert" | "feature-engineer" | "nlp-expert" | "time-series" | "full";

const AGENT_OPTIONS: { id: AgentScope; label: string }[] = [
  { id: "data-analyst", label: "Data Analyst" },
  { id: "visualization", label: "Visualization" },
  { id: "ml-expert", label: "ML Expert" },
  { id: "feature-engineer", label: "Feature Engineer" },
  { id: "nlp-expert", label: "NLP Expert" },
  { id: "time-series", label: "Time Series" },
  { id: "full", label: "Full Access — All Agents" },
];

type State = "idle" | "loading" | "success" | "error";

export function EmailRequestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<AgentScope[]>(["full"]);
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function toggleScope(id: AgentScope) {
    if (id === "full") {
      setScope(["full"]);
      return;
    }
    setScope((prev) => {
      const without = prev.filter((s) => s !== "full");
      if (without.includes(id)) {
        const next = without.filter((s) => s !== id);
        return next.length === 0 ? ["full"] : next;
      }
      return [...without, id];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/datalab/request-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, reason, agentScope: scope }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        setState("success");
      } else {
        setState("error");
        setErrorMsg(data.error ?? "Something went wrong.");
      }
    } catch {
      setState("error");
      setErrorMsg("Network error — please try again.");
    }
  }

  if (state === "success") {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%",
            background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={22} color="#34d399" />
          </div>
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#e8edf5", marginBottom: 6 }}>
          Request received
        </p>
        <p style={{ fontSize: 13, color: "#9ba8bc" }}>
          You&apos;ll receive an access link at <strong style={{ color: "#e8edf5" }}>{email}</strong> within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600,
          color: "#5c6a80", marginBottom: 4 }}>Full Name *</label>
        <input required value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={{ width: "100%", background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-default)", borderRadius: 10,
            padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
            outline: "none", boxSizing: "border-box" }} />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600,
          color: "#5c6a80", marginBottom: 4 }}>Email Address *</label>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ width: "100%", background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-default)", borderRadius: 10,
            padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
            outline: "none", boxSizing: "border-box" }} />
      </div>

      {/* Agent scope selector */}
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600,
          color: "#5c6a80", marginBottom: 8 }}>Access Scope</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
          {AGENT_OPTIONS.map(({ id, label }) => {
            const selected = scope.includes(id) || (id !== "full" && scope.includes("full") && id !== "full");
            // Show as selected if "full" is in scope (for visual clarity, keep it simple)
            const isSelected = scope.includes(id);
            return (
              <button key={id} type="button" onClick={() => toggleScope(id)}
                style={{ padding: "7px 10px", borderRadius: 8, fontSize: 11,
                  fontWeight: isSelected ? 600 : 400, cursor: "pointer",
                  background: isSelected ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isSelected ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.07)"}`,
                  color: isSelected ? "#8b5cf6" : "#9ba8bc",
                  gridColumn: id === "full" ? "1 / -1" : undefined }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600,
          color: "#5c6a80", marginBottom: 4 }}>
          Reason for access <span style={{ color: "#3a4558" }}>(optional)</span>
        </label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)}
          maxLength={300} rows={3} placeholder="Brief description of your use case..."
          style={{ width: "100%", background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-default)", borderRadius: 10,
            padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
            outline: "none", resize: "vertical", boxSizing: "border-box",
            fontFamily: "inherit" }} />
        <p style={{ fontSize: 10, color: "#3a4558", marginTop: 2, textAlign: "right" }}>
          {reason.length}/300
        </p>
      </div>

      {state === "error" && (
        <p style={{ fontSize: 12, color: "#fb7185", background: "rgba(251,113,133,0.08)",
          border: "1px solid rgba(251,113,133,0.25)", borderRadius: 8, padding: "8px 10px", margin: 0 }}>
          {errorMsg}
        </p>
      )}

      <button type="submit" disabled={state === "loading"}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          cursor: state === "loading" ? "not-allowed" : "pointer",
          background: "linear-gradient(135deg, var(--color-purple-700), var(--color-purple-600))",
          color: "#fff", border: "none", opacity: state === "loading" ? 0.7 : 1 }}>
        {state === "loading" ? (
          <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>
        ) : (
          <><Mail size={14} /> Request Access</>
        )}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/datalab/EmailRequestForm.tsx
git commit -m "feat(ui): add EmailRequestForm with agent scope selector"
```

---

### Task 12: Update `app/datalab/page.tsx` — email tab + magic cookie check

**Files:**
- Modify: `app/datalab/page.tsx`

- [ ] **Step 1: Add magic cookie check and tab switcher to the denied-access page**

Replace the content of `app/datalab/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { hasDataLabAccess } from "@/lib/datalab-access";
import { verifyMagicToken } from "@/lib/datalab-tokens";
import { DataLabShell } from "@/components/datalab/DataLabShell";
import { RequestAccessButton } from "@/components/datalab/RequestAccessButton";
import { EmailRequestForm } from "@/components/datalab/EmailRequestForm";
import { FlaskConical, Lock, GitBranch, Mail } from "lucide-react";
import { AccessTabSwitcher } from "@/components/datalab/AccessTabSwitcher";

export const metadata: Metadata = {
  title: "DataLab",
  description: "AI-powered data analysis agent.",
};

export default async function DataLabPage() {
  const session = await auth();
  const cookieStore = cookies();
  const magicCookie = cookieStore.get("datalab_magic");
  const magicResult = magicCookie ? verifyMagicToken(magicCookie.value) : null;
  const magicValid = magicResult?.ok === true;

  // Not signed in and no magic cookie — redirect to sign-in
  if (!session?.user?.id && !magicValid) {
    redirect("/api/auth/signin?callbackUrl=/datalab");
  }

  const userId = session?.user?.id;
  const hasGitHubAccess = userId ? hasDataLabAccess(userId) : false;
  const canAccess = hasGitHubAccess || magicValid;

  // Signed in but no access
  if (!canAccess) {
    const userName = session?.user?.name ?? session?.user?.email ?? userId ?? "";
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 py-16"
        style={{ background: "var(--color-bg-base)" }}
      >
        <div className="w-full max-w-lg">
          <div className="flex justify-center mb-6">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, var(--color-purple-800), var(--color-purple-600))",
                boxShadow: "var(--glow-purple)",
              }}
            >
              <Lock className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2" style={{ color: "var(--color-text-primary)" }}>
            DataLab —{" "}
            <span className="gradient-text">Premium Access Required</span>
          </h1>
          <p className="text-center mb-8" style={{ color: "var(--color-text-secondary)" }}>
            DataLab is our premier AI data science platform. Access is granted by the GadaaLabs team.
          </p>

          {session?.user && (
            <div
              className="rounded-2xl p-4 mb-6 flex items-center gap-3"
              style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
            >
              {session.user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt={userName}
                  className="h-10 w-10 rounded-full"
                  style={{ border: "2px solid var(--color-purple-600)" }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                  Signed in as <span style={{ color: "var(--color-purple-400)" }}>{userName}</span>
                </p>
                {session.user.email && (
                  <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                    {session.user.email}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-muted)" }}>
                <GitBranch className="h-3 w-3" />
                <span>GitHub</span>
              </div>
            </div>
          )}

          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
          >
            <AccessTabSwitcher />
          </div>
        </div>
      </div>
    );
  }

  // Has access — render DataLab
  const displayName = magicValid && magicResult?.ok
    ? magicResult.payload.name
    : (session?.user?.name ?? session?.user?.email ?? "");

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, var(--color-purple-700), var(--color-cyan-600))" }}
          >
            <FlaskConical className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              DataLab <span className="gradient-text">Agent</span>
            </h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {displayName ? `Welcome, ${displayName} · ` : ""}
              Upload any CSV or Excel file — get instant stats, charts, and AI-powered insights.
            </p>
          </div>
        </div>
      </div>
      <DataLabShell />
    </div>
  );
}
```

- [ ] **Step 2: Create `components/datalab/AccessTabSwitcher.tsx`** (client component for the GitHub/Email tab toggle)

```tsx
"use client";
import { useState } from "react";
import { GitBranch, Mail } from "lucide-react";
import { RequestAccessButton } from "./RequestAccessButton";
import { EmailRequestForm } from "./EmailRequestForm";

export function AccessTabSwitcher() {
  const [tab, setTab] = useState<"github" | "email">("github");

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
        Request Access
      </h2>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, background: "var(--color-bg-elevated)",
        borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {[
          { id: "github" as const, label: "GitHub Account", Icon: GitBranch },
          { id: "email" as const, label: "Email Request", Icon: Mail },
        ].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", border: "none", transition: "all 0.15s",
              background: tab === id ? "var(--color-bg-surface)" : "transparent",
              color: tab === id ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {tab === "github" && (
        <div>
          <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
            Send a one-click approval email — the admin can grant access instantly.
          </p>
          <RequestAccessButton />
        </div>
      )}

      {tab === "email" && <EmailRequestForm />}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/datalab/page.tsx components/datalab/AccessTabSwitcher.tsx
git commit -m "feat(datalab): add email access tab, magic cookie check, AccessTabSwitcher component"
```

---

### Task 13: Update admin dashboard with email requests and Copy Magic Link

**Files:**
- Modify: `app/dashboard/admin/page.tsx`

- [ ] **Step 1: Update `PendingRequest` interface and add `EmailPendingRequest` in admin page**

Add at top of the interfaces section in `app/dashboard/admin/page.tsx`:

```ts
interface EmailPendingRequest {
  type: "email";
  id: string;
  name: string;
  email: string;
  reason?: string;
  agentScope: string[];
  requestedAt: number;
}
```

Update the `fetchUsers` function to also fetch email requests. Change the type assertion:
```ts
const data = (await res.json()) as {
  users: DataLabUser[];
  count: number;
  pending: PendingRequest[];
  emailPending: EmailPendingRequest[];
};
```

Add state: `const [emailPending, setEmailPending] = useState<EmailPendingRequest[]>([]);`
In `fetchUsers` set: `setEmailPending(data.emailPending ?? []);`

- [ ] **Step 2: Add `CopyMagicLinkButton` component inline in admin page**

Add before `AdminDataLabPage`:

```tsx
function CopyMagicLinkButton({ req }: { req: EmailPendingRequest }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCopy() {
    setLoading(true);
    try {
      const agents = req.agentScope.join(",");
      const url = `/api/admin/datalab-access/magic-link?name=${encodeURIComponent(req.name)}&email=${encodeURIComponent(req.email)}&agents=${encodeURIComponent(agents)}&days=7`;
      const res = await fetch(url);
      const data = (await res.json()) as { magicUrl?: string; error?: string };
      if (data.magicUrl) {
        await navigator.clipboard.writeText(data.magicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => void handleCopy()}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
      style={{
        background: "rgba(52,211,153,0.12)",
        border: "1px solid rgba(52,211,153,0.3)",
        color: "#34d399",
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {loading ? "…" : copied ? "Copied!" : "Copy 7-day link"}
    </button>
  );
}
```

- [ ] **Step 3: Add email pending requests section to the JSX**

After the existing `{pending.length > 0 && (...)}` block, add:

```tsx
{emailPending.length > 0 && (
  <div
    className="rounded-2xl overflow-hidden mb-8"
    style={{
      background: "var(--color-bg-surface)",
      border: "1px solid rgba(52,211,153,0.35)",
      boxShadow: "0 0 0 3px rgba(52,211,153,0.04)",
    }}
  >
    <div
      className="px-6 py-4 flex items-center gap-2"
      style={{ borderBottom: "1px solid var(--color-border-subtle)", background: "rgba(52,211,153,0.03)" }}
    >
      <Mail className="h-5 w-5" style={{ color: "#34d399" }} />
      <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
        Email Access Requests
      </h2>
      <span
        className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}
      >
        {emailPending.length} waiting
      </span>
    </div>
    <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
      {emailPending.map((req) => (
        <div key={req.id} className="px-6 py-4 flex items-start gap-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold flex-shrink-0 mt-0.5"
            style={{ background: "var(--color-bg-elevated)", color: "#34d399" }}
          >
            {req.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{req.name}</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{req.email}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {req.agentScope.map((scope) => (
                <span key={scope}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6",
                    border: "1px solid rgba(139,92,246,0.25)" }}>
                  {scope}
                </span>
              ))}
            </div>
            {req.reason && (
              <p className="text-xs mt-1 italic" style={{ color: "var(--color-text-muted)" }}>
                &ldquo;{req.reason}&rdquo;
              </p>
            )}
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-disabled)" }}>
              {timeAgo(req.requestedAt)}
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(52,211,153,0.1)", color: "#34d399",
                border: "1px solid rgba(52,211,153,0.25)" }}>
              Email
            </span>
            <CopyMagicLinkButton req={req} />
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

Add `Mail` to the lucide-react import in the admin page.

- [ ] **Step 4: Update GET /api/admin/datalab-access to include email requests**

In `app/api/admin/datalab-access/route.ts`, import `getEmailPendingRequests` and return it:

```ts
import {
  isDataLabAdmin, getAllowedUsers, grantAccess, revokeAccess,
  getAccessCount, getPendingRequests, removePendingRequest,
  getEmailPendingRequests,
} from "@/lib/datalab-access";

// In GET handler, change the return:
return NextResponse.json({
  users,
  count: getAccessCount(),
  pending,
  emailPending: getEmailPendingRequests(),
});
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/admin/page.tsx app/api/admin/datalab-access/route.ts
git commit -m "feat(admin): show email access requests, agent scope pills, Copy 7-day magic link button"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Track 1: commit 13 content files
- ✅ Track 2A: `recommendedChart`, `outlierCount`, `skewness`, `distributionShape`, `kdePoints`, `correlationMatrix`, `recommendedPairs`, `missingnessPattern` in `lib/datalab.ts`
- ✅ Track 2B: Universal annotation standard — `ChartPanel.tsx` rewritten with `ChartCard` wrapper (header, shape badge, stats chips, AI insight)
- ✅ Track 2C: distributions, correlations, outliers, missing tabs — new component files
- ✅ Track 2D: DS Workflow tab — 10-step accordion
- ✅ Track 2E: Stakeholder Report tab — KPI cards, findings, next steps, PDF/markdown export
- ✅ Track 3A–3F: email form, request-email API, magic link setter, magic-link generator, datalab/page.tsx tab switcher + cookie check, admin dashboard updates
- ✅ ExpertHub / "agents" tab: explicitly NOT touched

**Placeholder scan:** No TBD/TODO in any code block.

**Type consistency:**
- `ChartType` defined in `lib/datalab.ts`, imported in `ChartPanel.tsx` ✅
- `DatasetSummary` gains `correlationMatrix`, `recommendedPairs`, `missingnessPattern` — all three used in tab components ✅
- `AgentScope` defined in `lib/datalab-access.ts`, used in `EmailRequestForm.tsx` and `request-email/route.ts` ✅
- `MagicPayload` defined in `lib/datalab-tokens.ts`, used in `magic/route.ts` and `datalab/page.tsx` ✅
- `EmailPendingRequest` defined in `lib/datalab-access.ts`, returned from GET admin route, rendered in admin page ✅
