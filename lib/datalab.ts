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
  scatterSamples: { col1: string; col2: string; points: { x: number; y: number }[] }[];
}

type Row = Record<string, unknown>;

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

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function buildHistogram(nums: number[], bins = 10): { bucket: string; count: number }[] {
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
  if (range > 0 && std / range > 0.25) return "uniform";
  if (skewness > 0.5) return "right-skewed";
  if (skewness < -0.5) return "left-skewed";
  if (Math.abs(skewness) < 0.2) return "normal";
  return "heavy-tailed";
}

function computeKDE(nums: number[], std: number, points = 50): { x: number; y: number }[] {
  if (nums.length === 0 || std <= 0) return [];
  const min = nums[0];
  const max = nums[nums.length - 1];
  if (min === max) return [];
  const sample = nums.length > 5000 ? nums.filter((_, i) => i % Math.ceil(nums.length / 5000) === 0) : nums;
  const h = 1.06 * std * sample.length ** -0.2;
  const step = (max - min) / (points - 1);
  return Array.from({ length: points }, (_, i) => {
    const x = min + i * step;
    const y = sample.reduce((sum, xi) => {
      const u = (x - xi) / h;
      return sum + Math.exp(-0.5 * u * u);
    }, 0) / (sample.length * h * Math.sqrt(2 * Math.PI));
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

export function computeStats(rows: Row[], fileName: string, fileSizeKB: number): DatasetSummary {
  if (rows.length === 0) {
    return { fileName, fileSizeKB, rowCount: 0, columnCount: 0, columns: [], correlationMatrix: [], recommendedPairs: [], missingnessPattern: [], scatterSamples: [] };
  }

  const sample = rows.slice(0, 100_000); // cap at 100k rows for perf
  const keys = Object.keys(rows[0]);

  const columns: ColumnStats[] = keys.map((name) => {
    const vals = sample.map((r) => r[name]);
    const nonNull = vals.filter((v) => v !== null && v !== undefined && v !== "");
    const nullCount = vals.length - nonNull.length;
    const unique = new Set(nonNull.map(String)).size;
    const type = inferType(nonNull);

    const base: ColumnStats = {
      name,
      type,
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
        base.mean = Math.round(mean * 1000) / 1000;
        base.std = Math.round(Math.sqrt(variance) * 1000) / 1000;
        base.min = nums[0];
        base.max = nums[nums.length - 1];
        base.p25 = Math.round(percentile(nums, 25) * 1000) / 1000;
        base.p50 = Math.round(percentile(nums, 50) * 1000) / 1000;
        base.p75 = Math.round(percentile(nums, 75) * 1000) / 1000;
        base.histogram = buildHistogram(nums);
        const q1 = base.p25 ?? 0;
        const q3 = base.p75 ?? 0;
        const outlierCount = computeOutlierCount(nums, q1, q3);
        const skewness = base.mean !== undefined && base.p50 !== undefined && base.std !== undefined
          ? computeSkewness(base.mean, base.p50, base.std)
          : 0;
        base.outlierCount = outlierCount;
        base.skewness = Math.round(skewness * 1000) / 1000;
        base.distributionShape = classifyShape(skewness, base.std ?? 0, (base.max ?? 0) - (base.min ?? 0));
        base.kdePoints = computeKDE(nums, base.std ?? 0);
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
      base.histogram = base.topValues.slice(0, 8).map(({ value, count }) => ({
        bucket: value,
        count,
      }));
    }

    return base;
  });

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
      const paired = sample
        .map((r) => [parseFloat(String(r[colA.name])), parseFloat(String(r[colB.name]))] as [number, number])
        .filter(([x, y]) => isFinite(x) && isFinite(y));
      if (paired.length < 3) continue;
      const r = pearsonR(paired.map(([x]) => x), paired.map(([, y]) => y));
      correlationMatrix.push({ col1: colA.name, col2: colB.name, r });
    }
  }

  const recommendedPairs = correlationMatrix
    .filter((p) => Math.abs(p.r) > 0.3)
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
    .slice(0, 6);

  // Scatter samples — up to 200 points per recommended pair for scatter plots
  const scatterSamples: DatasetSummary["scatterSamples"] = recommendedPairs.map((pair) => {
    const stride = Math.max(1, Math.floor(sample.length / 200));
    const points = sample
      .filter((_, i) => i % stride === 0)
      .map((r) => ({
        x: parseFloat(String(r[pair.col1])),
        y: parseFloat(String(r[pair.col2])),
      }))
      .filter((p) => isFinite(p.x) && isFinite(p.y))
      .slice(0, 200);
    return { col1: pair.col1, col2: pair.col2, points };
  });

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
    scatterSamples,
  };
}

// ---------------------------------------------------------------------------
// JSON / JSONL normalisation — flatten nested objects to tabular rows
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// XML → rows: each repeated child element of the root becomes one row
// ---------------------------------------------------------------------------

export function normalizeXmlToRows(xmlString: string): Record<string, unknown>[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("XML parse error");

    const root = doc.documentElement;
    const children = Array.from(root.children);
    if (children.length === 0) return [{ content: root.textContent?.trim() ?? "" }];

    // Find the most frequent child tag name → those are the "rows"
    const tagCounts: Record<string, number> = {};
    for (const child of children) tagCounts[child.tagName] = (tagCounts[child.tagName] ?? 0) + 1;
    const rowTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0][0];
    const rowElements = Array.from(root.querySelectorAll(`:scope > ${rowTag}`));

    return rowElements.map((el) => {
      const row: Record<string, unknown> = {};
      // attributes
      for (const attr of Array.from(el.attributes)) row[`@${attr.name}`] = attr.value;
      // child text nodes
      for (const child of Array.from(el.children)) {
        row[child.tagName] = child.textContent?.trim() ?? "";
      }
      if (el.children.length === 0) row["_text"] = el.textContent?.trim() ?? "";
      return row;
    });
  } catch {
    return [{ raw: xmlString.slice(0, 500) }];
  }
}

export function summaryToPrompt(summary: DatasetSummary): string {
  const lines: string[] = [
    `Dataset: ${summary.fileName} (${summary.rowCount} rows × ${summary.columnCount} columns, ${summary.fileSizeKB} KB)`,
    "",
    "Column Statistics:",
  ];

  for (const col of summary.columns) {
    let line = `- ${col.name} [${col.type}] nulls=${col.nullPct}% unique=${col.unique}`;
    if (col.type === "numeric") {
      line += ` mean=${col.mean} std=${col.std} min=${col.min} max=${col.max} p50=${col.p50}`;
      if (col.outlierCount !== undefined) line += ` outliers=${col.outlierCount}`;
      if (col.distributionShape) line += ` shape=${col.distributionShape}`;
      if (col.skewness !== undefined) line += ` skew=${col.skewness}`;
    } else if (col.topValues) {
      const top3 = col.topValues.slice(0, 3).map((t) => `"${t.value}"(${t.count})`).join(", ");
      line += ` top=[${top3}]`;
    }
    lines.push(line);
  }

  if (summary.recommendedPairs.length > 0) {
    lines.push("");
    lines.push("Strong correlations:");
    for (const p of summary.recommendedPairs) {
      lines.push(`- ${p.col1} × ${p.col2}: r=${p.r}`);
    }
  }

  return lines.join("\n");
}
