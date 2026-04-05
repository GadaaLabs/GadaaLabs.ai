# DataLab Tier 8 — Design Spec
**Date:** 2026-04-05
**Author:** Seifedin Hussen / GadaaLabs

---

## Context

DataLab is a full client-side data science workbench at `/datalab`. As of Tier 7, it has 16 tabs across 6 categories. Tier 8 adds 2 new tabs:

1. **Scatter Matrix** — pairwise scatter plot grid for top-6 numeric columns (Explore category)
2. **Feature Importance** — correlation-based importance bar chart for the detected target column (Model category)

Note: Outlier visualization on box plots was identified as a Tier 8 candidate but is already fully implemented in `EDADashboard.tsx` — `BoxPlot` already renders IQR outlier dots from `sampleRows`. No work needed there.

---

## Architecture

### Files Created

| File | Responsibility |
|------|---------------|
| `components/datalab/ScatterMatrixTab.tsx` | N×N pairwise scatter grid, top-6 numeric columns, capped at 500 rows |
| `components/datalab/FeatureImportanceTab.tsx` | Correlation-based feature importance bar chart, capped at 5,000 rows |

### Files Modified

| File | Change |
|------|--------|
| `components/datalab/DataLabShell.tsx` | Add `"scatter"` and `"importance"` to `Tab` type, `CATEGORIES`, `TAB_META`, and tab content render |

### No changes to:
- `lib/datalab.ts` — no new fields needed
- `EDADashboard.tsx` — outlier dots already implemented
- `DataScienceAgent.tsx` — never touched
- Any existing tab component

---

## Feature 1: Scatter Matrix Tab

### Location
- Tab ID: `"scatter"`
- Category: `"explore"` — appended after `"pivot"` → explore tabs become `["overview", "charts", "explorer", "pivot", "scatter"]`
- Label: `"Scatter Matrix"`, icon: `Combine` (Lucide)

### Props
```ts
interface ScatterMatrixTabProps {
  summary: DatasetSummary;
  activeRows: Record<string, unknown>[];
}
```

### Behavior

**Column selection:** Pick top-6 numeric columns by non-null count (`col.count - col.nullCount`, descending). If fewer than 2 numeric columns exist, show an empty state: "Need at least 2 numeric columns to build a scatter matrix."

**Row cap:** Sample `activeRows` down to 500 rows (first 500). Show a muted label "Showing 500 of N rows" when capped.

**Grid layout:** N×N grid where N = number of selected columns (2–6).
- **Diagonal cells:** Column name label only — dark card, column name in mono font, no chart.
- **Off-diagonal cells:** Recharts `ScatterChart` plotting col_x (row index) vs col_y (column index). X-axis = column at that column index, Y-axis = column at that row index.
- Grid uses CSS grid: `grid-cols-2` for N=2, `grid-cols-3` for N=3–4, `grid-cols-3` for N=5–6 (wraps).

Actually: use `grid-cols-N` with inline style `gridTemplateColumns: repeat(N, minmax(0, 1fr))` so it's always exactly N columns wide.

**Scatter chart per cell:**
- `ScatterChart` with no axis labels (too cramped in small cells), no legend
- Single `Scatter` series, purple dots (`fill="#7c3aed"` at `fillOpacity=0.5`, `r=2`)
- `Tooltip` showing the two column names and values
- Fixed height: 120px per cell
- No `CartesianGrid` — too noisy at small size

**Data preparation:** For each cell (i, j), extract `[x, y]` pairs from the 500-row sample where both values are finite numbers. Filter out nulls.

**Empty-state guard:** If `activeRows.length === 0`, show: "Upload a dataset and the scatter matrix will appear here."

### Performance cap
| Cap | Value | Reason |
|-----|-------|--------|
| Rows | 500 | N² charts × N points each — quadratic rendering cost |
| Columns | 6 | 6×6 = 36 cells max — beyond that the grid is unreadable |

---

## Feature 2: Feature Importance Tab

### Location
- Tab ID: `"importance"`
- Category: `"model"` — inserted after `"train"` → model tabs become `["train", "importance", "analysis", "code"]`
- Label: `"Feature Importance"`, icon: `BarChart2` (Lucide — already imported in shell)

### Props
```ts
interface FeatureImportanceTabProps {
  summary: DatasetSummary;
  activeRows: Record<string, unknown>[];
}
```

### Behavior

**Target detection:** Use `summary.detectedTarget`. If null → show empty state: "No target column detected. Name a column `target`, `label`, `y`, or `class` to enable this tab."

**No raw data guard:** If `activeRows.length === 0` → show empty state: "Raw data not available. Re-upload your dataset to compute feature importance." (This happens when a session is restored from localStorage — raw rows are not persisted.)

**Computation:** For each numeric column (excluding the target):
1. Extract paired `[featureVal, targetVal]` from `activeRows`, capped at 5,000 rows
2. Compute Pearson r: `r = Σ((x-x̄)(y-ȳ)) / (n·σx·σy)`
3. Importance = `|r|` (absolute value — sign indicates direction, not magnitude)
4. Sort descending by importance

**Target type handling:**
- If target is numeric → compute Pearson r directly
- If target is categorical/boolean → encode as integers (unique sorted values → 0, 1, 2…) then compute Pearson r

**Chart:** Recharts `BarChart` with `layout="vertical"`:
- `YAxis` = feature names (mono font, 12px)
- `XAxis` = importance 0–1 domain
- Each bar colored by rank: top 3 bars use purple (`#7c3aed`), rest use muted purple (`rgba(124,58,237,0.4)`)
- `Tooltip` showing feature name + `|r| = 0.XX` + direction label ("positively correlated" / "negatively correlated")
- Show all features (no cap on bar count — if 30 features, show 30 bars, chart scrolls)

**Context card:** Below the chart, a small info card: "Target: `{detectedTarget}` ({type}) · {N} features ranked · computed on {min(rowCount, 5000)} rows · Method: Pearson |r|"

**Caveat note:** Small muted text: "Pearson correlation measures linear association. For non-linear relationships, train a model in the Train Model tab for weights-based importance."

### Performance cap
| Cap | Value | Reason |
|-----|-------|--------|
| Rows | 5,000 | Pearson computation is O(n) per feature — fast enough at 5k |

---

## DataLabShell Changes

### Tab type
Add `"scatter"` and `"importance"` to the `Tab` union type.

### CATEGORIES
```ts
{ id: "explore", ..., tabs: ["overview", "charts", "explorer", "pivot", "scatter"] },
{ id: "model",   ..., tabs: ["train", "importance", "analysis", "code"] },
```

### TAB_META additions
```ts
"scatter":    { label: "Scatter Matrix",     icon: Combine },
"importance": { label: "Feature Importance", icon: BarChart2 },
```

`Combine` must be added to the Lucide import. `BarChart2` is already imported.

### Tab content render additions
```tsx
{tab === "scatter" && (
  <ScatterMatrixTab activeRows={activeRows} summary={summary} />
)}

{tab === "importance" && (
  <FeatureImportanceTab activeRows={activeRows} summary={summary} />
)}
```

Both components must be imported at the top of DataLabShell.tsx.

---

## Out of Scope

- Time series forecasting
- AutoML hyperparameter tuning
- Distribution comparison overlay
- Any changes to existing tabs or the DS Agent

---

## Success Criteria

- Scatter matrix renders for any dataset with ≥2 numeric columns, showing correct pairwise plots
- Feature importance renders for any dataset with a detected target column and raw rows present
- Both tabs handle edge cases gracefully (empty state, no raw data, no target)
- Build and lint pass with zero new errors
