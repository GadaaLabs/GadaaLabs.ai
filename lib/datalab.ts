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

export function computeStats(rows: Row[], fileName: string, fileSizeKB: number): DatasetSummary {
  if (rows.length === 0) {
    return { fileName, fileSizeKB, rowCount: 0, columnCount: 0, columns: [] };
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

  return { fileName, fileSizeKB, rowCount: rows.length, columnCount: keys.length, columns };
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
    } else if (col.topValues) {
      const top3 = col.topValues.slice(0, 3).map((t) => `"${t.value}"(${t.count})`).join(", ");
      line += ` top=[${top3}]`;
    }
    lines.push(line);
  }

  return lines.join("\n");
}
