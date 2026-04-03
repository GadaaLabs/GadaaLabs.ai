# DataLab World-Class Upgrade — Design Spec
**Date:** 2026-04-03
**Status:** Approved

---

## Overview

Three parallel tracks:

1. **Finish unfinished work** — commit 11 modified Python Mastery MDX files + README + gravityclaude.md
2. **World-class DataLab** — intelligent chart selection, full EDA tab suite, end-to-end DS workflow tab, stakeholder report tab
3. **Email access requests** — email-only access path with magic-link grant system (no GitHub required)

---

## Track 1: Finish Unfinished Work

Commit all currently modified files as a single "content update" commit:
- `README.md`
- `gravityclaude.md`
- `content/courses/python-mastery/lessons/` (11 MDX files: 01–05, 07, 09, 10, 13, 14, 16)

No code changes needed — these are content updates already complete in the working tree.

---

## Track 2: World-Class DataLab

### 2A. Intelligent Chart Selection (lib/datalab.ts)

The `computeStats()` output gains a `recommendedChart` field per column, and a new `recommendedPairs` array for scatter/correlation suggestions.

**Chart selection rules (agent logic, not AI — deterministic):**

| Column characteristics | Chart type |
|---|---|
| Numeric, ≤20 unique values | Bar chart (treat as discrete) |
| Numeric, >20 unique values, low outlier count | Histogram + KDE overlay |
| Numeric, >20 unique values, high outlier count (>5% IQR outliers) | Box plot |
| Numeric, any | Cumulative Distribution (CDF) — always shown as secondary |
| Categorical, ≤6 unique values | Donut chart |
| Categorical, 7–20 unique values | Horizontal bar chart |
| Categorical, >20 unique values | Top-10 horizontal bar (truncated) |
| Boolean | Donut chart |
| Datetime | Time series line chart |
| Numeric pair (correlation > 0.4 or < -0.4) | Scatter plot with trend line |
| All numeric columns ≥ 2 | Correlation heatmap |
| Any column | Violin plot if comparing against a low-cardinality categorical |

**`recommendedChart` values:** `"histogram"` | `"boxplot"` | `"bar"` | `"donut"` | `"horizontal-bar"` | `"timeseries"` | `"cdf"` | `"violin"`

**New fields added to `ColumnStats`:**
```ts
recommendedChart: ChartType
outlierCount: number       // IQR method: values outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
skewness: number           // (mean - median) / stdDev — Pearson's 2nd skewness coefficient
distributionShape: "normal" | "right-skewed" | "left-skewed" | "bimodal-hint" | "uniform" | "heavy-tailed"
kdePoints: { x: number; y: number }[]  // 50-point KDE curve for smooth density overlay
```

**New top-level fields on `DatasetSummary`:**
```ts
correlationMatrix: { col1: string; col2: string; r: number }[]  // all numeric pairs
recommendedPairs: { col1: string; col2: string; r: number }[]   // |r| > 0.3, top 6
missingnessPattern: { rowIndex: number; colsWithNull: string[] }[]  // sample of 200 rows for heatmap
```

**Skewness → distributionShape mapping:**
- |skewness| < 0.2 → `"normal"`
- skewness > 0.5 → `"right-skewed"`
- skewness < -0.5 → `"left-skewed"`
- |skewness| between 0.2–0.5 → `"heavy-tailed"` (could be bimodal; agent notes it)
- stdDev / range < 0.15 → `"uniform"`

### 2B. Chart Rendering — Universal Annotation Standard

**Every chart, regardless of type, renders with this identical structure:**

```
┌─────────────────────────────────────────────┐
│ [Column Name / Pair Name]    [Shape Badge]  │  ← header
│ [Subtitle: N records · X nulls · unit hint] │
├─────────────────────────────────────────────┤
│                                             │
│  [Chart body — histogram / box / donut /    │
│   scatter / timeseries / heatmap / violin]  │
│   with annotations overlaid:               │
│   - Mean line (dashed cyan) + μ label       │
│   - Median line (dashed pink) + M label     │  (numeric only)
│   - Trend line (scatter only)               │
│   - r + p-value label (scatter only)        │
│   - Outlier dots in red (boxplot/scatter)   │
│                                             │
├─────────────────────────────────────────────┤
│ [Stats chips: Mean · Median · Std · Outliers│  (numeric only)
│  or: Top value · Unique count · Null %]     │  (categorical)
├─────────────────────────────────────────────┤
│ AI Insight ▏ [Generated paragraph — 2-3    │
│              sentences, specific numbers,  │
│              actionable recommendation]    │
└─────────────────────────────────────────────┘
```

**AI insight generation:** The Data Analyst agent's system prompt is updated to produce one insight paragraph per chart, containing:
- The most surprising or actionable finding specific to that column
- At least one concrete number (%, ratio, or threshold)
- One data science recommendation (e.g., "log-transform before modeling", "merge sparse categories", "flag as potential data entry error")

Insights are generated during the existing agent pipeline run and stored in `agentOutputs.dataAnalyst.chartInsights: Record<columnName, string>`.

### 2C. New Tab Structure (DataLabShell.tsx)

Existing tabs stay. New tabs added:

**`distributions` tab** — Renders all columns with their `recommendedChart`. Each chart is full-width (not a grid) so annotations are readable. Scrollable list.

**`correlations` tab** —
- Full correlation heatmap (all numeric pairs)
- Below heatmap: scatter plot for each `recommendedPairs` entry (top 6 by |r|), each with trend line, r value, p-value badge, and AI insight

**`outliers` tab** —
- Box plot for every numeric column, side by side (2-column grid)
- IQR fence lines shown
- Outlier dots individually labeled with their value
- Summary: "X total outlier values across Y columns — recommend: [action]"

**`missing` tab** —
- Missing data heatmap: rows (sampled 200) × columns — colored cell = null, white = present
- Bar chart: null % per column sorted descending
- AI insight: "Columns X and Y have correlated missingness (both null in 80% of the same rows) — likely from the same data source gap"

**`timeseries` tab** —
- Shown only if ≥1 datetime column detected (otherwise tab is hidden)
- Line chart per numeric column plotted against the datetime axis
- Rolling 7-day average overlay
- Trend direction badge: "Upward trend" / "Downward trend" / "Seasonal pattern" / "Stationary"

### 2D. DS Workflow Tab (new tab: `ds-workflow`)

A 6-step accordion panel. Each step is pre-populated by agents during the analysis pipeline. Steps are sequentially revealed as agents complete. User can edit agent outputs inline.

**Step 1 — Data Quality Assessment**
- Agent: Data Quality agent (already exists)
- Output: Quality score 0–100, list of issues with severity (critical / warning / info), specific column-level flags
- Visual: Score gauge + issue list with color-coded severity badges

**Step 2 — Preprocessing Recommendations**
- Agent: Feature Engineer agent (already exists)
- Output: Per-column preprocessing recommendations rendered as a table: Column | Issue | Recommended Action | sklearn Code
- Plus: complete generated `sklearn.Pipeline` code shown in the Code tab and copyable here

**Step 3 — Feature Engineering**
- Agent: Feature Engineer agent
- Output: List of suggested derived features with rationale, estimated signal strength (high/medium/low), example code snippet per suggestion

**Step 4 — Target Variable Analysis**
- New UI: dropdown to select target column (optional)
- If selected: task type inference, class distribution chart (classification) or target distribution chart (regression), imbalance warning if applicable, recommended evaluation metrics
- If not selected: general unsupervised analysis recommendations

**Step 5 — Model Selection**
- Agent: ML Expert agent (already exists)
- Output: Top 3 recommended models, reasoning table (dataset size fit / interpretability / speed / accuracy trade-off), estimated baseline performance range
- Visual: 3-column comparison card layout

**Step 6 — Ready-to-Run Notebook**
- Assembled from outputs of steps 1–5 + the existing code generation agent
- Full `.ipynb` structure: cells for loading, EDA, preprocessing pipeline, model training, cross-validation, evaluation, prediction export
- Download button: triggers client-side file save of JSON notebook
- "Copy to Code tab" button: pushes all cells into the existing Code tab

### 2E. Stakeholder Report Tab (new tab: `report`)

Generated after all agents complete. Assembled from agent outputs. Sections:

1. **Report header**: filename, row count, generation timestamp, GadaaLabs branding
2. **Dataset at a Glance**: 4 KPI cards (records, features, quality score, insight count)
3. **Key Findings**: 5–7 bullet points, each AI-generated from agent outputs, written for non-technical stakeholders (no jargon, concrete numbers, business framing)
4. **Chart Gallery**: top 4 most insightful charts (selected by Data Analyst agent) with their insight captions — rendered inline in report
5. **Data Quality Summary**: table of issues, severity, and recommended fixes
6. **Model Recommendations**: (only if target selected) top 3 models with plain-English reasoning
7. **Next Steps**: 3 actionable recommendations ordered by impact

**Export options:**
- **Export PDF**: uses `window.print()` with a print-optimized CSS stylesheet (no external deps)
- **Copy Markdown**: assembles full report as `.md` string → copies to clipboard

---

## Track 3: Email Access Request

### 3A. UI Changes (app/datalab/page.tsx)

The denied-access page gains a tab switcher between:
- `GitHub Account` tab — existing `RequestAccessButton` component, unchanged
- `Email Request` tab — new `EmailRequestForm` component

The tab state is local React state, default `"github"`.

### 3B. EmailRequestForm Component (components/datalab/EmailRequestForm.tsx)

Fields:
- Full Name (required)
- Email Address (required, validated)
- Reason for access (optional, textarea, max 300 chars)

On submit: `POST /api/datalab/request-email`

Success state: replaces form with confirmation message — "Request received. You'll receive an access link at [email] within 24 hours."

Error state: inline error below submit button.

No auth required — this form is shown to unauthenticated users too.

### 3C. Email Request API (app/api/datalab/request-email/route.ts)

`POST` — accepts `{ name, email, reason? }`

Validation:
- name: non-empty, max 100 chars
- email: basic regex validation, max 200 chars
- reason: optional, max 300 chars

Actions:
1. Calls `addPendingRequest()` with type `"email"`, stores `{ name, email, reason, requestedAt }`
2. Returns `{ ok: true }`

Rate limiting: max 3 requests per email per hour (in-memory, same pattern as existing rate limiter).

### 3D. Magic Link System (lib/datalab-tokens.ts + new route)

**Token generation** — new `createMagicAccessToken(name, email, durationDays)` function added to `lib/datalab-tokens.ts`:
- Encodes: `{ name, email, exp: Date.now() + days*86400000, type: "magic" }`
- Same HMAC-SHA256 signing as existing tokens

**Magic link route** — `app/api/datalab/magic/route.ts`:
- `GET /api/datalab/magic?token=...`
- Verifies token with `verifyToken()`
- On success: sets `Set-Cookie: datalab_magic=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`
- Redirects to `/datalab?access=granted`
- On failure: returns styled HTML error page (same pattern as existing approve route)

### 3E. Access Check Update (app/datalab/page.tsx)

Server component reads cookies alongside session:

```ts
// Existing check
const hasAccess = session && hasDataLabAccess(session.user.id)

// New: also check magic cookie
const magicCookie = cookies().get('datalab_magic')
const magicValid = magicCookie ? verifyMagicToken(magicCookie.value) : false

const canAccess = hasAccess || magicValid
```

`verifyMagicToken` — new function in `lib/datalab-tokens.ts`, same as `verifyToken` but checks `type === "magic"` and validates expiry. Returns `{ ok: boolean; name?: string; email?: string }`.

If magic token is valid, DataLabShell renders normally. The user's display name in the shell header comes from the token payload (name + email) instead of GitHub session.

### 3F. Admin Dashboard Updates (app/dashboard/admin/page.tsx)

Pending requests table gains:
- `Type` column: `GitHub` badge (blue) or `Email` badge (green)
- For GitHub requests: existing "Approve" button (opens approval URL)
- For email requests: "Copy Magic Link" button — calls `GET /api/admin/datalab-access/magic-link?name=...&email=...` → returns `{ magicUrl }` → copies to clipboard
- Admin manually pastes the URL into an email to the user

**New admin API endpoint** — `GET /api/admin/datalab-access/magic-link`:
- Requires admin session
- Params: `name`, `email`, `days` (default 7)
- Returns `{ magicUrl: string }` — full URL of the magic link
- Admin copies and sends to user manually

---

## What is NOT changing

- Existing GitHub OAuth flow — untouched
- Existing approval token system — untouched
- Existing agent system (11 agents, orchestrator pattern) — agents get better prompts, not a structural change
- Chart library — stays Recharts, no new dependencies
- All existing tabs (overview, analysis, code, chat, agents, prompt-builder, notes) — unchanged

---

## Files Created / Modified

**New files:**
- `components/datalab/EmailRequestForm.tsx`
- `app/api/datalab/request-email/route.ts`
- `app/api/datalab/magic/route.ts`
- `app/api/admin/datalab-access/magic-link/route.ts` (or query param on existing route)

**Modified files:**
- `lib/datalab.ts` — new stats fields, chart selection logic, correlation matrix, KDE
- `components/datalab/ChartPanel.tsx` — full rewrite of chart rendering with universal annotation standard
- `components/datalab/DataLabShell.tsx` — new tabs, DS workflow, report tab
- `lib/datalab-tokens.ts` — `createMagicAccessToken`, `verifyMagicToken`
- `app/datalab/page.tsx` — email tab, magic cookie check
- `app/dashboard/admin/page.tsx` — email request display, copy magic link button
