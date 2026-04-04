"use client";

import { useState, useMemo, useCallback } from "react";
import { Play, Loader2, Download, RefreshCw, Network } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import type { DatasetSummary } from "@/lib/datalab";

type Row = Record<string, unknown>;

// ─── K-Means++ ────────────────────────────────────────────────────────────────

function kMeans(X: number[][], k: number, maxIter = 150): { labels: number[]; centroids: number[][] } {
  const n = X.length, d = X[0].length;

  // K-Means++ initialization
  const centroids: number[][] = [[...X[Math.floor(Math.random() * n)]]];
  while (centroids.length < k) {
    const dists = X.map(x => Math.min(...centroids.map(c => c.reduce((s, v, j) => s + (v - x[j]) ** 2, 0))));
    const total = dists.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < n; i++) { r -= dists[i]; if (r <= 0) { idx = i; break; } }
    centroids.push([...X[idx]]);
  }

  let labels = new Array(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    const newLabels = X.map(x => {
      let best = 0, bestD = Infinity;
      for (let ki = 0; ki < k; ki++) {
        const dist = centroids[ki].reduce((s, v, j) => s + (v - x[j]) ** 2, 0);
        if (dist < bestD) { bestD = dist; best = ki; }
      }
      return best;
    });
    if (newLabels.every((l, i) => l === labels[i])) break;
    labels = newLabels;
    for (let ki = 0; ki < k; ki++) {
      const members = X.reduce((acc, x, i) => { if (labels[i] === ki) acc.push(x); return acc; }, [] as number[][]);
      if (!members.length) continue;
      for (let j = 0; j < d; j++) centroids[ki][j] = members.reduce((s, x) => s + x[j], 0) / members.length;
    }
  }
  return { labels, centroids };
}

// Simplified silhouette approximation (sample-based, fast)
function silhouetteApprox(X: number[][], labels: number[], k: number, sampleSize = 300): number {
  const indices = X.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, sampleSize);
  let total = 0;
  for (const i of indices) {
    const myCluster = labels[i];
    const same    = indices.filter(j => j !== i && labels[j] === myCluster);
    const others  = Array.from({ length: k }, (_, ki) => ki).filter(ki => ki !== myCluster);
    if (same.length === 0 || others.length === 0) continue;
    const a = same.reduce((s, j) => s + Math.sqrt(X[i].reduce((d, v, jj) => d + (v - X[j][jj]) ** 2, 0)), 0) / same.length;
    const b = Math.min(...others.map(ki => {
      const clusterMembers = indices.filter(j => labels[j] === ki);
      if (!clusterMembers.length) return Infinity;
      return clusterMembers.reduce((s, j) => s + Math.sqrt(X[i].reduce((d, v, jj) => d + (v - X[j][jj]) ** 2, 0)), 0) / clusterMembers.length;
    }));
    total += (b - a) / Math.max(a, b);
  }
  return total / indices.length;
}

function exportCSV(rows: { [key: string]: unknown }[], name: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => { const s = String(v ?? ""); return s.includes(",") ? `"${s}"` : s; };
  const csv = [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name; a.click();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLUSTER_COLORS = ["#06b6d4", "#a78bfa", "#10b981", "#f59e0b", "#f472b6", "#ef4444", "#38bdf8", "#34d399", "#fb923c", "#c084fc"];
const MAX_POINTS = 2000;

// ─── Component ────────────────────────────────────────────────────────────────

interface ClusterResult {
  labels: number[];
  centroids: number[][];
  silhouette: number;
  clusterSizes: number[];
  featureCols: string[];
  k: number;
}

interface Props {
  activeRows: Row[];
  summary: DatasetSummary;
}

export function ClusterAnalysisTab({ activeRows, summary }: Props) {
  const numericCols = useMemo(
    () => summary.columns.filter(c => c.type === "numeric").map(c => c.name),
    [summary.columns]
  );

  const [k, setK] = useState(3);
  const [featureCols, setFeatureCols] = useState<Set<string>>(() => new Set(numericCols.slice(0, 6)));
  const [xAxis, setXAxis] = useState<string>(() => numericCols[0] ?? "");
  const [yAxis, setYAxis] = useState<string>(() => numericCols[1] ?? numericCols[0] ?? "");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ClusterResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleFeature = (col: string) => {
    setFeatureCols(prev => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });
    setResult(null);
  };

  const handleRun = useCallback(() => {
    if (featureCols.size < 2) { setError("Select at least 2 feature columns."); return; }
    setRunning(true);
    setError(null);

    setTimeout(() => {
      try {
        const features = [...featureCols];
        const clean = activeRows.filter(row =>
          features.every(col => {
            const v = row[col];
            return v !== null && v !== undefined && v !== "" && !isNaN(Number(v));
          })
        );

        if (clean.length < k * 3) {
          setError(`Need at least ${k * 3} complete rows, found ${clean.length}.`);
          setRunning(false);
          return;
        }

        // Sample for performance
        const sample = clean.length > MAX_POINTS
          ? clean.filter((_, i) => i % Math.floor(clean.length / MAX_POINTS) === 0).slice(0, MAX_POINTS)
          : clean;

        // Normalize features for clustering
        const rawX = sample.map(row => features.map(f => Number(row[f])));
        const means = features.map((_, j) => rawX.reduce((s, r) => s + r[j], 0) / rawX.length);
        const stds  = features.map((_, j) => Math.sqrt(rawX.reduce((s, r) => s + (r[j] - means[j]) ** 2, 0) / rawX.length) || 1);
        const X     = rawX.map(row => row.map((v, j) => (v - means[j]) / stds[j]));

        const { labels, centroids } = kMeans(X, k);
        const sil = silhouetteApprox(X, labels, k);

        // Denormalize centroids back to original scale
        const denormCentroids = centroids.map(c => c.map((v, j) => v * stds[j] + means[j]));

        const clusterSizes = Array.from({ length: k }, (_, ki) => labels.filter(l => l === ki).length);

        setResult({ labels, centroids: denormCentroids, silhouette: sil, clusterSizes, featureCols: features, k });
      } catch (e) {
        setError((e as Error).message ?? "Clustering failed");
      } finally {
        setRunning(false);
      }
    }, 20);
  }, [featureCols, k, activeRows]);

  // Build scatter data for visualization
  const scatterData = useMemo(() => {
    if (!result) return [];
    const features = result.featureCols;
    const xIdx = features.indexOf(xAxis);
    const yIdx = features.indexOf(yAxis);
    if (xIdx === -1 || yIdx === -1) return [];

    const clean = activeRows.filter(row =>
      features.every(col => row[col] !== null && row[col] !== undefined && row[col] !== "" && !isNaN(Number(row[col])))
    );
    const sample = clean.length > MAX_POINTS
      ? clean.filter((_, i) => i % Math.floor(clean.length / MAX_POINTS) === 0).slice(0, MAX_POINTS)
      : clean;

    return Array.from({ length: result.k }, (_, ki) =>
      sample
        .filter((_, i) => result.labels[i] === ki)
        .map(row => ({ x: Number(row[xAxis]), y: Number(row[yAxis]) }))
    );
  }, [result, xAxis, yAxis, activeRows]);

  const handleExport = useCallback(() => {
    if (!result) return;
    const features = result.featureCols;
    const clean = activeRows.filter(row =>
      features.every(col => row[col] !== null && row[col] !== undefined && row[col] !== "" && !isNaN(Number(row[col])))
    );
    const sample = clean.length > MAX_POINTS
      ? clean.filter((_, i) => i % Math.floor(clean.length / MAX_POINTS) === 0).slice(0, MAX_POINTS)
      : clean;

    const rows = sample.map((row, i) => ({ ...row, cluster: result.labels[i] }));
    exportCSV(rows, summary.fileName.replace(/\.[^.]+$/, "") + `_k${result.k}_clusters.csv`);
  }, [result, activeRows, summary.fileName]);

  const noRows = activeRows.length === 0;

  if (noRows || numericCols.length < 2) {
    return (
      <div className="rounded-xl p-10 text-center"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <Network className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--color-text-disabled)" }} />
        <p className="font-semibold text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
          {noRows ? "Re-upload your file" : "Need ≥ 2 numeric columns"}
        </p>
        <p className="text-xs max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
          {noRows
            ? "Cluster analysis uses the full dataset. Upload your file to enable this tab."
            : "Cluster analysis requires at least 2 numeric columns."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <Network className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>Cluster Analysis</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              K-Means++ · pure JS · {activeRows.length > MAX_POINTS ? `sampling ${MAX_POINTS.toLocaleString()} of ${activeRows.length.toLocaleString()} rows` : `${activeRows.length.toLocaleString()} rows`}
            </p>
          </div>
        </div>
        {result && (
          <button onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
            <Download className="h-3.5 w-3.5" /> Export with cluster labels
          </button>
        )}
      </div>

      {/* Config */}
      <div className="rounded-xl p-5 space-y-5"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>

        {/* K slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              Number of Clusters (k)
            </label>
            <span className="text-lg font-bold" style={{ color: "#f59e0b" }}>{k}</span>
          </div>
          <input type="range" min={2} max={10} step={1} value={k}
            onChange={e => { setK(Number(e.target.value)); setResult(null); }}
            className="w-full accent-amber-400" />
          <div className="flex justify-between text-xs mt-1" style={{ color: "var(--color-text-disabled)" }}>
            <span>2</span><span>10</span>
          </div>
        </div>

        {/* Feature columns */}
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Feature Columns — {featureCols.size} selected
          </label>
          <div className="flex flex-wrap gap-2">
            {numericCols.map(col => {
              const on = featureCols.has(col);
              return (
                <button key={col} onClick={() => toggleFeature(col)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: on ? "rgba(245,158,11,0.15)" : "var(--color-bg-elevated)",
                    border: `1px solid ${on ? "rgba(245,158,11,0.4)" : "var(--color-border-default)"}`,
                    color: on ? "#f59e0b" : "var(--color-text-muted)",
                  }}>
                  {col}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="text-xs" style={{ color: "var(--color-error)" }}>{error}</p>
        )}

        <button onClick={handleRun} disabled={running || featureCols.size < 2}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", boxShadow: "0 0 20px rgba(245,158,11,0.25)" }}>
          {running
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Running K-Means…</>
            : <><Play className="h-4 w-4" /> Run Clustering</>}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl p-3 text-center"
              style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Clusters</p>
              <p className="text-2xl font-bold" style={{ color: "#f59e0b" }}>{result.k}</p>
            </div>
            <div className="rounded-xl p-3 text-center"
              style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Silhouette Score</p>
              <p className="text-2xl font-bold" style={{ color: result.silhouette >= 0.5 ? "#10b981" : result.silhouette >= 0.25 ? "#f59e0b" : "#ef4444" }}>
                {result.silhouette.toFixed(3)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-disabled)" }}>
                {result.silhouette >= 0.5 ? "strong" : result.silhouette >= 0.25 ? "moderate" : "weak"}
              </p>
            </div>
            <div className="rounded-xl p-3 text-center"
              style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Features Used</p>
              <p className="text-2xl font-bold" style={{ color: "#a78bfa" }}>{result.featureCols.length}</p>
            </div>
            <div className="rounded-xl p-3 text-center"
              style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Smallest Cluster</p>
              <p className="text-2xl font-bold" style={{ color: "#06b6d4" }}>
                {Math.min(...result.clusterSizes)}
              </p>
            </div>
          </div>

          {/* Cluster size bars */}
          <div className="rounded-xl p-5"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--color-text-muted)" }}>
              Cluster Sizes
            </p>
            <div className="space-y-2">
              {result.clusterSizes.map((size, ki) => {
                const pct = (size / result.labels.length) * 100;
                return (
                  <div key={ki} className="flex items-center gap-3">
                    <span className="text-xs font-semibold w-16 shrink-0" style={{ color: CLUSTER_COLORS[ki] }}>
                      Cluster {ki}
                    </span>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height: 10, background: "var(--color-bg-elevated)" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: CLUSTER_COLORS[ki], borderRadius: 5 }} />
                    </div>
                    <span className="text-xs w-16 text-right shrink-0" style={{ color: "var(--color-text-muted)" }}>
                      {size} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scatter plot */}
          {scatterData.length > 0 && (
            <div className="rounded-xl p-5"
              style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                  Cluster Scatter
                </p>
                <div className="flex items-center gap-2 ml-auto">
                  <select value={xAxis} onChange={e => setXAxis(e.target.value)}
                    className="text-xs rounded-lg px-2 py-1.5 outline-none"
                    style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
                    {result.featureCols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>vs</span>
                  <select value={yAxis} onChange={e => setYAxis(e.target.value)}
                    className="text-xs rounded-lg px-2 py-1.5 outline-none"
                    style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
                    {result.featureCols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ height: 320, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="x" name={xAxis} type="number" tick={{ fill: "var(--color-text-disabled)", fontSize: 10 }}
                      label={{ value: xAxis, position: "insideBottom", offset: -8, fill: "var(--color-text-muted)", fontSize: 10 }} />
                    <YAxis dataKey="y" name={yAxis} type="number" tick={{ fill: "var(--color-text-disabled)", fontSize: 10 }}
                      label={{ value: yAxis, angle: -90, position: "insideLeft", fill: "var(--color-text-muted)", fontSize: 10 }} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.1)" }}
                      contentStyle={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: unknown) => [(v as number).toFixed(3)]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: "var(--color-text-muted)" }} />
                    {scatterData.map((pts, ki) => (
                      <Scatter key={ki} name={`Cluster ${ki}`} data={pts} fill={CLUSTER_COLORS[ki]} opacity={0.7} r={3} />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Centroid table */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                Cluster Centroids
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                    <th className="px-4 py-2.5 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>Cluster</th>
                    <th className="px-4 py-2.5 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>Size</th>
                    {result.featureCols.map(col => (
                      <th key={col} className="px-4 py-2.5 text-left font-semibold whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.centroids.map((centroid, ki) => (
                    <tr key={ki} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2 font-bold" style={{ color: CLUSTER_COLORS[ki] }}>
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CLUSTER_COLORS[ki] }} />
                          Cluster {ki}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                        {result.clusterSizes[ki]}
                      </td>
                      {centroid.map((val, j) => (
                        <td key={j} className="px-4 py-2.5 font-mono" style={{ color: "var(--color-text-secondary)" }}>
                          {val.toFixed(3)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
