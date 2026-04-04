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
  skewness?: number;    // (mean - p50) / std — positive = right-skewed
  kdePoints?: { x: number; y: number }[]; // smoothed density estimate
  outlierCount?: number;      // count of values beyond 1.5×IQR (optional, from origin components)
  distributionShape?: string; // e.g. "normal", "right-skewed" (optional, from origin components)
  // categorical
  topValues?: { value: string; count: number }[];
  // for charts
  histogram?: { bucket: string; count: number }[];
}

export interface CorrelationPair {
  colA: string;
  colB: string;
  r: number; // Pearson r, rounded to 3dp
}

export interface TimeSeriesData {
  colName: string;
  points: { period: string; count: number }[];
}

export interface CleaningAction {
  column: string;
  action: "drop_column" | "impute_mean" | "impute_median" | "impute_mode" | "drop_rows";
  reason: string;
  count: number; // rows imputed / rows dropped (0 for column drops)
}

export interface CleaningReport {
  actions: CleaningAction[];
  originalColumns: number;
  originalRows: number;
  droppedRows: number;
}

export interface DatasetSummary {
  fileName: string;
  fileSizeKB: number;
  rowCount: number;
  columnCount: number;
  columns: ColumnStats[];
  // Enriched fields computed in computeStats
  correlations: CorrelationPair[];       // all numeric column pairs sorted by |r|
  correlationMatrix: Record<string, Record<string, number>>; // fast lookup [colA][colB]
  detectedTarget: string | null;         // heuristically detected target column
  timeSeries: TimeSeriesData[];          // monthly counts for datetime columns
  sampleRows: Record<string, number>[]; // up to 300 rows, numeric cols only (scatter)
  // Preprocessing audit trail
  cleaningReport?: CleaningReport;
  // Optional fields used by origin components (not computed by default)
  recommendedPairs?: { col1: string; col2: string; r: number }[];
  missingnessPattern?: { rowIndex: number; colsWithNull: string[] }[];
}

type Row = Record<string, unknown>;

// ─── Type inference ───────────────────────────────────────────────────────────

function inferType(values: unknown[]): ColumnStats["type"] {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonNull.length === 0) return "mixed";

  const numericCount = nonNull.filter((v) => !isNaN(parseFloat(String(v))) && isFinite(Number(v))).length;
  if (numericCount / nonNull.length > 0.9) return "numeric";

  const boolCount = nonNull.filter((v) =>
    ["true", "false", "yes", "no", "1", "0"].includes(String(v).toLowerCase())
  ).length;
  if (boolCount / nonNull.length > 0.9) return "boolean";

  const dateCount = nonNull.filter((v) => !isNaN(Date.parse(String(v)))).length;
  if (dateCount / nonNull.length > 0.8) return "datetime";

  return "categorical";
}

// ─── Percentile ───────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ─── Histogram ────────────────────────────────────────────────────────────────

function buildHistogram(nums: number[], bins = 12): { bucket: string; count: number }[] {
  if (nums.length === 0) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return [{ bucket: String(min), count: nums.length }];

  const width = (max - min) / bins;
  const buckets = Array.from({ length: bins }, (_, i) => ({
    bucket: `${(min + i * width).toFixed(2)}`,
    count: 0,
  }));
  for (const n of nums) {
    const idx = Math.min(Math.floor((n - min) / width), bins - 1);
    buckets[idx].count++;
  }
  return buckets;
}

// ─── KDE approximation (Gaussian kernel, bandwidth = Silverman's rule) ────────

function buildKDE(nums: number[], points = 50): { x: number; y: number }[] {
  if (nums.length < 3) return [];
  const n = nums.length;
  const mean = nums.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(nums.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
  if (std === 0) return [];

  // Silverman bandwidth
  const h = 1.06 * std * Math.pow(n, -0.2);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const step = (max - min) / (points - 1);

  const result: { x: number; y: number }[] = [];
  for (let i = 0; i < points; i++) {
    const x = min + i * step;
    let density = 0;
    for (const xi of nums) {
      const u = (x - xi) / h;
      density += Math.exp(-0.5 * u * u);
    }
    density /= n * h * Math.sqrt(2 * Math.PI);
    result.push({ x: Math.round(x * 1000) / 1000, y: Math.round(density * 100000) / 100000 });
  }
  return result;
}

// ─── Pearson correlation ──────────────────────────────────────────────────────

function pearsonR(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  let sx = 0, sy = 0, sxy = 0, sx2 = 0, sy2 = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]; sy += ys[i]; sxy += xs[i] * ys[i];
    sx2 += xs[i] ** 2; sy2 += ys[i] ** 2;
  }
  const num = n * sxy - sx * sy;
  const den = Math.sqrt((n * sx2 - sx ** 2) * (n * sy2 - sy ** 2));
  if (den === 0) return 0;
  return Math.round((num / den) * 1000) / 1000;
}

// ─── Time series bucketing ────────────────────────────────────────────────────

function buildTimeSeries(vals: unknown[]): { period: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of vals) {
    const d = new Date(String(v));
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, count]) => ({ period, count }));
}

// ─── Target detection ─────────────────────────────────────────────────────────

const TARGET_KEYWORDS = [
  "target", "label", "churn", "survived", "outcome", "class", "y",
  "default", "fraud", "response", "converted", "clicked", "bought",
  "result", "status", "approved", "rejected", "canceled", "inactive",
];

function detectTarget(columns: ColumnStats[]): string | null {
  // 1. Name match
  for (const col of columns) {
    const lower = col.name.toLowerCase();
    if (TARGET_KEYWORDS.some((k) => lower === k || lower.endsWith(`_${k}`) || lower.startsWith(`${k}_`))) {
      return col.name;
    }
  }
  // 2. Boolean column
  const boolCol = columns.find((c) => c.type === "boolean");
  if (boolCol) return boolCol.name;
  // 3. Low-cardinality categorical (2–5 values)
  const catCandidate = columns.find(
    (c) => (c.type === "categorical") && c.unique >= 2 && c.unique <= 5
  );
  if (catCandidate) return catCandidate.name;
  return null;
}

// ─── Main compute function ────────────────────────────────────────────────────

export function computeStats(rows: Row[], fileName: string, fileSizeKB: number): DatasetSummary {
  if (rows.length === 0) {
    return {
      fileName, fileSizeKB, rowCount: 0, columnCount: 0, columns: [],
      correlations: [], correlationMatrix: {}, detectedTarget: null,
      timeSeries: [], sampleRows: [],
    };
  }

  const sample = rows.slice(0, 100_000);
  const keys = Object.keys(rows[0]);

  // ── Column stats ────────────────────────────────────────────────────────────
  const columns: ColumnStats[] = keys.map((name) => {
    const vals = sample.map((r) => r[name]);
    const nonNull = vals.filter((v) => v !== null && v !== undefined && v !== "");
    const nullCount = vals.length - nonNull.length;
    const unique = new Set(nonNull.map(String)).size;
    const type = inferType(nonNull);

    const base: ColumnStats = {
      name, type,
      count: sample.length,
      nullCount,
      nullPct: Math.round((nullCount / sample.length) * 1000) / 10,
      unique,
    };

    if (type === "numeric") {
      const nums = nonNull.map((v) => parseFloat(String(v))).filter(isFinite).sort((a, b) => a - b);
      if (nums.length > 0) {
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = sum / nums.length;
        const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
        const std = Math.sqrt(variance);
        base.mean = Math.round(mean * 1000) / 1000;
        base.std = Math.round(std * 1000) / 1000;
        base.min = nums[0];
        base.max = nums[nums.length - 1];
        base.p25 = Math.round(percentile(nums, 25) * 1000) / 1000;
        base.p50 = Math.round(percentile(nums, 50) * 1000) / 1000;
        base.p75 = Math.round(percentile(nums, 75) * 1000) / 1000;
        base.skewness = std > 0 ? Math.round(((mean - base.p50) / std) * 1000) / 1000 : 0;
        base.histogram = buildHistogram(nums);
        // KDE on a subsample (max 2000 for performance)
        const kdeSample = nums.length > 2000
          ? Array.from({ length: 2000 }, (_, i) => nums[Math.floor(i * nums.length / 2000)])
          : nums;
        base.kdePoints = buildKDE(kdeSample);
      }
    }

    if (type === "categorical" || type === "boolean") {
      const freq = new Map<string, number>();
      for (const v of nonNull) {
        const k = String(v);
        freq.set(k, (freq.get(k) ?? 0) + 1);
      }
      base.topValues = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, count }));
      base.histogram = base.topValues.slice(0, 8).map(({ value, count }) => ({ bucket: value, count }));
    }

    return base;
  });

  // ── Pearson correlations ─────────────────────────────────────────────────────
  const numericCols = columns.filter((c) => c.type === "numeric").slice(0, 20);
  const correlations: CorrelationPair[] = [];
  const correlationMatrix: Record<string, Record<string, number>> = {};

  // Diagonal = 1
  for (const col of numericCols) correlationMatrix[col.name] = { [col.name]: 1.0 };

  if (numericCols.length >= 2) {
    // Use a sample of 5000 rows for correlation (performance)
    const corrSample = sample.length > 5000
      ? sample.filter((_, i) => i % Math.floor(sample.length / 5000) === 0).slice(0, 5000)
      : sample;

    const numericValues: Record<string, number[]> = {};
    for (const col of numericCols) {
      numericValues[col.name] = corrSample
        .map((r) => parseFloat(String(r[col.name])))
        .filter(isFinite);
    }

    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const colA = numericCols[i].name;
        const colB = numericCols[j].name;
        const r = pearsonR(numericValues[colA], numericValues[colB]);
        if (!isNaN(r)) {
          correlations.push({ colA, colB, r });
          correlationMatrix[colA] = { ...(correlationMatrix[colA] ?? {}), [colB]: r };
          correlationMatrix[colB] = { ...(correlationMatrix[colB] ?? {}), [colA]: r };
        }
      }
    }
    correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  }

  // ── Time series ──────────────────────────────────────────────────────────────
  const datetimeCols = columns.filter((c) => c.type === "datetime").slice(0, 3);
  const timeSeries: TimeSeriesData[] = datetimeCols.map((col) => ({
    colName: col.name,
    points: buildTimeSeries(sample.map((r) => r[col.name])),
  })).filter((ts) => ts.points.length > 1);

  // ── Target detection ─────────────────────────────────────────────────────────
  const detectedTarget = detectTarget(columns);

  // ── Sample rows for scatter plots (numeric cols only, max 300) ────────────────
  const numericColNames = numericCols.map((c) => c.name);
  const step = Math.max(1, Math.floor(sample.length / 300));
  const sampleRows = sample
    .filter((_, i) => i % step === 0)
    .slice(0, 300)
    .map((row) => {
      const r: Record<string, number> = {};
      for (const name of numericColNames) {
        const v = parseFloat(String(row[name]));
        if (isFinite(v)) r[name] = v;
      }
      return r;
    });

  return {
    fileName, fileSizeKB,
    rowCount: rows.length,
    columnCount: keys.length,
    columns,
    correlations,
    correlationMatrix,
    detectedTarget,
    timeSeries,
    sampleRows,
  };
}

// ─── JSON/JSONL normalisation ─────────────────────────────────────────────────

function flattenObject(obj: unknown, prefix = ""): Record<string, unknown> {
  if (typeof obj !== "object" || obj === null) return { value: obj };
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(val)) {
      result[fullKey] = JSON.stringify(val);
    } else if (typeof val === "object" && val !== null) {
      Object.assign(result, flattenObject(val, fullKey));
    } else {
      result[fullKey] = val;
    }
  }
  return result;
}

export function normalizeJsonToRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.map((item) => flattenObject(item));
  if (typeof data === "object" && data !== null) {
    for (const val of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(val) && val.length > 0) return val.map((item) => flattenObject(item));
    }
    return [flattenObject(data)];
  }
  return [];
}

// ─── XML → rows ───────────────────────────────────────────────────────────────

export function normalizeXmlToRows(xmlString: string): Record<string, unknown>[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("XML parse error");
    const root = doc.documentElement;
    const children = Array.from(root.children);
    if (children.length === 0) return [{ content: root.textContent?.trim() ?? "" }];
    const tagCounts: Record<string, number> = {};
    for (const child of children) tagCounts[child.tagName] = (tagCounts[child.tagName] ?? 0) + 1;
    const rowTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0][0];
    const rowElements = Array.from(root.querySelectorAll(`:scope > ${rowTag}`));
    return rowElements.map((el) => {
      const row: Record<string, unknown> = {};
      for (const attr of Array.from(el.attributes)) row[`@${attr.name}`] = attr.value;
      for (const child of Array.from(el.children)) row[child.tagName] = child.textContent?.trim() ?? "";
      if (el.children.length === 0) row["_text"] = el.textContent?.trim() ?? "";
      return row;
    });
  } catch {
    return [{ raw: xmlString.slice(0, 500) }];
  }
}

// ─── Auto-preprocessing ───────────────────────────────────────────────────────
//
// Runs before computeStats so every downstream tab (EDA, agent, ML) sees
// clean data automatically. A principal data scientist doesn't ask permission
// to drop a 100%-null column.
//
// Rules applied in order:
//   1. Drop blank rows (every cell null / empty / whitespace)
//   2. Drop columns: 100% null, constant (unique ≤ 1), or >80% missing
//   3. Impute numerics: median if |Pearson skew| > 0.75, else mean
//   4. Impute categoricals/booleans: mode (most frequent value)

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === "";
}

export function preprocessAndCompute(
  rows: Row[],
  fileName: string,
  sizeKB: number
): { summary: DatasetSummary; cleanedRows: Row[] } {
  if (rows.length === 0) {
    return { cleanedRows: [], summary: computeStats([], fileName, sizeKB) };
  }

  const actions: CleaningAction[] = [];
  const originalRows = rows.length;
  const originalColumns = Object.keys(rows[0]).length;

  // ── Step 1: Drop fully blank rows ────────────────────────────────────────────
  let working = rows.filter(row => {
    const vals = Object.values(row);
    return !vals.every(isBlank);
  });
  const droppedRows = originalRows - working.length;
  if (droppedRows > 0) {
    actions.push({ column: "(rows)", action: "drop_rows", reason: "all cells null/empty", count: droppedRows });
  }

  // ── Step 2: Identify columns to drop ─────────────────────────────────────────
  const allCols = Object.keys(rows[0]);
  const n = working.length || 1;
  const colsToDrop = new Set<string>();

  for (const col of allCols) {
    const vals = working.map(r => r[col]);
    const nonNull = vals.filter(v => !isBlank(v));
    const nullRate = 1 - nonNull.length / n;
    const unique = new Set(nonNull.map(String)).size;

    if (nullRate >= 1.0) {
      colsToDrop.add(col);
      actions.push({ column: col, action: "drop_column", reason: "100% null — no data", count: 0 });
    } else if (unique <= 1) {
      colsToDrop.add(col);
      const val = nonNull.length > 0 ? `"${String(nonNull[0])}"` : "empty";
      actions.push({ column: col, action: "drop_column", reason: `constant value ${val} — zero variance`, count: 0 });
    } else if (nullRate > 0.8) {
      colsToDrop.add(col);
      actions.push({ column: col, action: "drop_column", reason: `${(nullRate * 100).toFixed(0)}% missing — imputing >80% fabricates data`, count: 0 });
    }
  }

  // Remove dropped columns from every row
  if (colsToDrop.size > 0) {
    working = working.map(row => {
      const r = { ...row };
      for (const col of colsToDrop) delete r[col];
      return r;
    });
  }

  // ── Step 3 & 4: Impute remaining missing values ───────────────────────────────
  const remainingCols = allCols.filter(c => !colsToDrop.has(c));

  for (const col of remainingCols) {
    const vals = working.map(r => r[col]);
    const nonNull = vals.filter(v => !isBlank(v));
    const nullCount = vals.length - nonNull.length;
    if (nullCount === 0) continue; // nothing to impute

    // Detect numeric
    const numericVals = nonNull.map(v => parseFloat(String(v))).filter(isFinite);
    const isNumeric = numericVals.length / nonNull.length > 0.9 && numericVals.length > 0;

    let fillValue: unknown;
    let actionType: CleaningAction["action"];
    let reason: string;

    if (isNumeric) {
      const sorted = [...numericVals].sort((a, b) => a - b);
      const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const idx = (sorted.length - 1) / 2;
      const median = sorted[Math.floor(idx)] + (sorted[Math.ceil(idx)] - sorted[Math.floor(idx)]) * (idx - Math.floor(idx));
      const std = Math.sqrt(sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / sorted.length);
      const skewness = std > 0 ? (mean - median) / std : 0;

      if (Math.abs(skewness) > 0.75) {
        fillValue = Math.round(median * 1000) / 1000;
        actionType = "impute_median";
        reason = `skew=${skewness.toFixed(2)} — median is more robust`;
      } else {
        fillValue = Math.round(mean * 1000) / 1000;
        actionType = "impute_mean";
        reason = `approx. normal (skew=${skewness.toFixed(2)}) — mean used`;
      }
    } else {
      // Categorical / boolean / datetime → mode
      const freq = new Map<string, number>();
      for (const v of nonNull) {
        const k = String(v);
        freq.set(k, (freq.get(k) ?? 0) + 1);
      }
      const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
      fillValue = sorted[0]?.[0] ?? "";
      actionType = "impute_mode";
      reason = `categorical — mode "${fillValue}" (${sorted[0]?.[1]} occurrences)`;
    }

    working = working.map(row => {
      if (!isBlank(row[col])) return row;
      return { ...row, [col]: fillValue };
    });

    actions.push({ column: col, action: actionType, reason, count: nullCount });
  }

  // ── Build summary with cleaning report ───────────────────────────────────────
  const summary = computeStats(working, fileName, sizeKB);
  summary.cleaningReport = { actions, originalColumns, originalRows, droppedRows };

  return { summary, cleanedRows: working };
}

// ─── Summary → prompt text for AI ────────────────────────────────────────────

export function summaryToPrompt(summary: DatasetSummary): string {
  const lines: string[] = [
    `Dataset: ${summary.fileName} (${summary.rowCount} rows × ${summary.columnCount} columns, ${summary.fileSizeKB} KB)`,
    `Detected target column: ${summary.detectedTarget ?? "none"}`,
    "",
    "Column Statistics:",
  ];

  for (const col of summary.columns) {
    let line = `- ${col.name} [${col.type}] nulls=${col.nullPct}% unique=${col.unique}`;
    if (col.type === "numeric") {
      line += ` mean=${col.mean} std=${col.std} min=${col.min} max=${col.max} p50=${col.p50}`;
      if (col.skewness !== undefined) line += ` skew=${col.skewness}`;
    } else if (col.topValues) {
      const top3 = col.topValues.slice(0, 3).map((t) => `"${t.value}"(${t.count})`).join(", ");
      line += ` top=[${top3}]`;
    }
    lines.push(line);
  }

  if (summary.correlations.length > 0) {
    lines.push("", "Top Correlations (Pearson r):");
    for (const { colA, colB, r } of summary.correlations.slice(0, 10)) {
      lines.push(`- ${colA} ↔ ${colB}: r=${r}`);
    }
  }

  return lines.join("\n");
}
