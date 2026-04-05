# DataLab Tier 8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new DataLab tabs — Scatter Matrix (pairwise numeric scatter grid) in the Explore category and Feature Importance (Pearson |r| bar chart) in the Model category.

**Architecture:** Two new standalone components (`ScatterMatrixTab`, `FeatureImportanceTab`) receive `summary` + `activeRows` props from DataLabShell. No changes to `lib/datalab.ts` or any existing tab component. DataLabShell gets two new entries in its `Tab` type, `CATEGORIES`, `TAB_META`, and render block.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Recharts (ScatterChart, BarChart) · Lucide React · CSS custom properties from `globals.css`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `components/datalab/ScatterMatrixTab.tsx` | N×N pairwise scatter grid, top-6 numeric cols, capped at 500 rows |
| Create | `components/datalab/FeatureImportanceTab.tsx` | Pearson \|r\| importance bar chart vs detected target, capped at 5,000 rows |
| Modify | `components/datalab/DataLabShell.tsx` | Wire both new tabs into types, nav, and render |

---

## Task 1: Create ScatterMatrixTab

**Files:**
- Create: `components/datalab/ScatterMatrixTab.tsx`

- [ ] **Step 1: Create the file with the complete implementation**

```tsx
// components/datalab/ScatterMatrixTab.tsx
"use client";

import { useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { DatasetSummary } from "@/lib/datalab";

type Row = Record<string, unknown>;

const TOOLTIP_STYLE = {
  contentStyle: { background: "#161625", border: "1px solid #2a2a45", borderRadius: 8, fontSize: 11 },
  labelStyle: { color: "#f0f0ff", fontWeight: 600 },
  itemStyle: { color: "#a8a8c0" },
};

const ROW_CAP = 500;
const COL_CAP = 6;

interface ScatterMatrixTabProps {
  summary: DatasetSummary;
  activeRows: Row[];
}

export function ScatterMatrixTab({ summary, activeRows }: ScatterMatrixTabProps) {
  const cols = useMemo(() => {
    return summary.columns
      .filter(c => c.type === "numeric")
      .sort((a, b) => (b.count - b.nullCount) - (a.count - a.nullCount))
      .slice(0, COL_CAP)
      .map(c => c.name);
  }, [summary]);

  const sampledRows = useMemo(() => activeRows.slice(0, ROW_CAP), [activeRows]);

  if (activeRows.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-20 rounded-xl"
        style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}
      >
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Upload a dataset and the scatter matrix will appear here.
        </p>
      </div>
    );
  }

  if (cols.length < 2) {
    return (
      <div
        className="flex items-center justify-center py-20 rounded-xl"
        style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}
      >
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Need at least 2 numeric columns to build a scatter matrix.
        </p>
      </div>
    );
  }

  const N = cols.length;
  const isCapped = activeRows.length > ROW_CAP;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
            Scatter Matrix
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Pairwise relationships across {N} numeric columns
            {isCapped && ` · Showing ${ROW_CAP} of ${activeRows.length.toLocaleString()} rows`}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
          gap: "4px",
        }}
      >
        {cols.map((rowCol, i) =>
          cols.map((colCol, j) => {
            if (i === j) {
              return (
                <div
                  key={`${i}-${j}`}
                  className="flex items-center justify-center rounded-lg"
                  style={{
                    height: 120,
                    background: "rgba(124,58,237,0.08)",
                    border: "1px solid rgba(124,58,237,0.2)",
                  }}
                >
                  <p
                    className="text-[10px] font-mono font-bold text-center px-2 break-all"
                    style={{ color: "var(--color-purple-400)" }}
                  >
                    {rowCol}
                  </p>
                </div>
              );
            }

            const data = sampledRows
              .map(r => {
                const x = Number(r[colCol]);
                const y = Number(r[rowCol]);
                return isFinite(x) && isFinite(y) ? { x, y } : null;
              })
              .filter((d): d is { x: number; y: number } => d !== null);

            return (
              <div
                key={`${i}-${j}`}
                className="rounded-lg overflow-hidden"
                style={{
                  height: 120,
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-default)",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <XAxis dataKey="x" type="number" hide />
                    <YAxis dataKey="y" type="number" hide />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      formatter={(v: unknown, name: unknown) => [
                        typeof v === "number" ? v.toFixed(3) : String(v),
                        name === "x" ? colCol : rowCol,
                      ]}
                    />
                    <Scatter data={data} fill="#7c3aed" fillOpacity={0.5} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build to verify TypeScript compiles**

```bash
npm run build
```

Expected: build succeeds (component not yet wired into shell, but must compile cleanly).

- [ ] **Step 3: Commit**

```bash
git add components/datalab/ScatterMatrixTab.tsx
git commit -m "feat(datalab): add ScatterMatrixTab — pairwise scatter grid for numeric columns"
```

---

## Task 2: Create FeatureImportanceTab

**Files:**
- Create: `components/datalab/FeatureImportanceTab.tsx`

- [ ] **Step 1: Create the file with the complete implementation**

```tsx
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
```

- [ ] **Step 2: Build to verify TypeScript compiles**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/datalab/FeatureImportanceTab.tsx
git commit -m "feat(datalab): add FeatureImportanceTab — Pearson |r| importance bar chart"
```

---

## Task 3: Wire both tabs into DataLabShell

**Files:**
- Modify: `components/datalab/DataLabShell.tsx`

This task makes 5 targeted edits to `DataLabShell.tsx`. Read the file before editing.

- [ ] **Step 1: Add the two new component imports**

Find the existing import block (lines 4–20). After the last datalab component import (`import { DataQualityTab } from "./DataQualityTab";`), add:

```tsx
import { ScatterMatrixTab } from "./ScatterMatrixTab";
import { FeatureImportanceTab } from "./FeatureImportanceTab";
```

- [ ] **Step 2: Add `Combine` to the Lucide import**

Find the Lucide import line that starts:
```tsx
import {
  BarChart2, Brain, MessageSquare, AlertCircle, Loader2, Send,
```

Add `Combine` to this import. The full line becomes (add it anywhere in the list, e.g. after `ShieldCheck`):
```tsx
import {
  BarChart2, Brain, MessageSquare, AlertCircle, Loader2, Send,
  RotateCcw, CheckCircle2, Zap, TrendingUp, Cpu,
  Sparkles, StickyNote, FlaskConical, Cpu as CpuIcon, Microscope,
  FileText, Users, Wand2, Activity, GitCompare, Table2, Network, LayoutGrid, History,
  AlertTriangle, ShieldCheck, Combine,
} from "lucide-react";
```

- [ ] **Step 3: Update the `Tab` type**

Find:
```tsx
type Tab = "overview" | "charts" | "explorer" | "pivot" | "cluster" | "anomaly" | "quality" | "analysis" | "tech-report" | "stakeholder-report" | "code" | "chat" | "notes" | "transform" | "train" | "compare";
```

Replace with:
```tsx
type Tab = "overview" | "charts" | "explorer" | "pivot" | "scatter" | "cluster" | "anomaly" | "quality" | "analysis" | "tech-report" | "stakeholder-report" | "code" | "chat" | "notes" | "transform" | "train" | "importance" | "compare";
```

- [ ] **Step 4: Update CATEGORIES**

Find:
```tsx
{ id: "explore",  label: "Explore",  color: "#06b6d4", tabs: ["overview", "charts", "explorer", "pivot"] },
```
Replace with:
```tsx
{ id: "explore",  label: "Explore",  color: "#06b6d4", tabs: ["overview", "charts", "explorer", "pivot", "scatter"] },
```

Find:
```tsx
{ id: "model",    label: "Model",    color: "#10b981", tabs: ["train", "analysis", "code"] },
```
Replace with:
```tsx
{ id: "model",    label: "Model",    color: "#10b981", tabs: ["train", "importance", "analysis", "code"] },
```

- [ ] **Step 5: Update TAB_META**

Find the `TAB_META` object. After the `"pivot"` entry, add the `"scatter"` entry:
```tsx
"scatter":            { label: "Scatter Matrix",     icon: Combine },
```

After the `"train"` entry, add the `"importance"` entry:
```tsx
"importance":         { label: "Feature Importance", icon: BarChart2 },
```

The complete updated `TAB_META` (for reference — match existing indentation exactly):
```tsx
const TAB_META: Record<Tab, { label: string; icon: React.ElementType }> = {
  "overview":           { label: "Overview",           icon: BarChart2 },
  "charts":             { label: "EDA Dashboard",      icon: TrendingUp },
  "explorer":           { label: "Data Explorer",      icon: Table2 },
  "pivot":              { label: "Pivot Table",        icon: LayoutGrid },
  "scatter":            { label: "Scatter Matrix",     icon: Combine },
  "cluster":            { label: "Clusters",           icon: Network },
  "anomaly":            { label: "Anomaly Detection",  icon: AlertTriangle },
  "quality":            { label: "Quality Scorecard",  icon: ShieldCheck },
  "transform":          { label: "Transform",          icon: Wand2 },
  "compare":            { label: "Compare",            icon: GitCompare },
  "train":              { label: "Train Model",        icon: Activity },
  "importance":         { label: "Feature Importance", icon: BarChart2 },
  "analysis":           { label: "DS Agent",           icon: Microscope },
  "code":               { label: "ML Code",            icon: Cpu },
  "tech-report":        { label: "Tech Report",        icon: FileText },
  "stakeholder-report": { label: "Exec Report",        icon: Users },
  "chat":               { label: "Ask Agent",          icon: MessageSquare },
  "notes":              { label: "Notes",              icon: StickyNote },
};
```

- [ ] **Step 6: Add render blocks for both new tabs**

In the tab content section (after `{tab === "pivot" && ...}`), add:

```tsx
{tab === "scatter" && (
  <ScatterMatrixTab activeRows={activeRows} summary={summary} />
)}
```

And after `{tab === "train" && ...}`, add:

```tsx
{tab === "importance" && (
  <FeatureImportanceTab activeRows={activeRows} summary={summary} />
)}
```

- [ ] **Step 7: Build to verify no TypeScript errors**

```bash
npm run build
```

Expected: build succeeds. `/datalab` should now show "Scatter Matrix" in the Explore category and "Feature Importance" in the Model category.

- [ ] **Step 8: Run lint**

```bash
npm run lint
```

Expected: no new errors in DataLabShell, ScatterMatrixTab, or FeatureImportanceTab.

- [ ] **Step 9: Commit**

```bash
git add components/datalab/DataLabShell.tsx
git commit -m "feat(datalab): Tier 8 — Scatter Matrix and Feature Importance tabs"
```

---

## Self-Review

**Spec coverage:**
- [x] `ScatterMatrixTab` — Task 1: top-6 numeric cols, N×N grid, diagonal labels, scatter cells, 500-row cap, empty states
- [x] `FeatureImportanceTab` — Task 2: Pearson |r|, categorical target encoding, 5,000-row cap, horizontal bar chart, top-3 purple, context card, all 3 empty states
- [x] `Tab` type additions (`"scatter"`, `"importance"`) — Task 3, Step 3
- [x] `CATEGORIES` updates — Task 3, Step 4
- [x] `TAB_META` additions — Task 3, Step 5
- [x] `Combine` icon import — Task 3, Step 2
- [x] Component imports — Task 3, Step 1
- [x] Render blocks — Task 3, Step 6

**Placeholder scan:** No TBDs, no "implement later", no vague steps. All code blocks are complete.

**Type consistency:**
- `ScatterMatrixTabProps` uses `DatasetSummary` and `Row` — both defined in the same file.
- `FeatureImportanceTabProps` uses `DatasetSummary` and `Row` — both defined in the same file.
- `pearsonR(xs: number[], ys: number[]): number` defined and called in the same file.
- DataLabShell render block passes `activeRows={activeRows} summary={summary}` — matches both component prop interfaces exactly.
- `TAB_META` keys now include all 18 `Tab` union members — TypeScript's `Record<Tab, ...>` will catch any mismatch at build time.
