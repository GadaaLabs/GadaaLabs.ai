"use client";

import { useState, useMemo, useCallback } from "react";
import { Activity, Play, Loader2, AlertTriangle, Info, Sparkles, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { DatasetSummary } from "@/lib/datalab";

type Row = Record<string, unknown>;

// ─── Pure-JS ML utilities ─────────────────────────────────────────────────────

function sigmoid(z: number) {
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
}

function normalizeFeatures(X: number[][]): { Xn: number[][]; means: number[]; stds: number[] } {
  const m = X.length;
  const n = X[0]?.length ?? 0;
  const means = new Array(n).fill(0);
  const stds  = new Array(n).fill(1);
  for (let j = 0; j < n; j++) {
    means[j] = X.reduce((s, r) => s + r[j], 0) / m;
    stds[j]  = Math.sqrt(X.reduce((s, r) => s + (r[j] - means[j]) ** 2, 0) / m) || 1;
  }
  const Xn = X.map(r => r.map((v, j) => (v - means[j]) / stds[j]));
  return { Xn, means, stds };
}

function trainLogistic(X: number[][], y: number[], lr = 0.15, iters = 400): number[] {
  const m = X.length, n = X[0].length;
  const w = new Array(n + 1).fill(0); // w[0] = bias
  for (let it = 0; it < iters; it++) {
    const g = new Array(n + 1).fill(0);
    for (let i = 0; i < m; i++) {
      let z = w[0];
      for (let j = 0; j < n; j++) z += w[j + 1] * X[i][j];
      const e = sigmoid(z) - y[i];
      g[0] += e;
      for (let j = 0; j < n; j++) g[j + 1] += e * X[i][j];
    }
    for (let j = 0; j <= n; j++) w[j] -= (lr / m) * g[j];
  }
  return w;
}

function trainLinear(X: number[][], y: number[], lr = 0.1, iters = 400): number[] {
  const m = X.length, n = X[0].length;
  const w = new Array(n + 1).fill(0);
  for (let it = 0; it < iters; it++) {
    const g = new Array(n + 1).fill(0);
    for (let i = 0; i < m; i++) {
      let pred = w[0];
      for (let j = 0; j < n; j++) pred += w[j + 1] * X[i][j];
      const e = pred - y[i];
      g[0] += e;
      for (let j = 0; j < n; j++) g[j + 1] += e * X[i][j];
    }
    for (let j = 0; j <= n; j++) w[j] -= (lr / m) * g[j];
  }
  return w;
}

function predictLogistic(X: number[][], w: number[]): number[] {
  return X.map(row => {
    let z = w[0];
    for (let j = 0; j < row.length; j++) z += w[j + 1] * row[j];
    return sigmoid(z) >= 0.5 ? 1 : 0;
  });
}

function predictLinear(X: number[][], w: number[]): number[] {
  return X.map(row => {
    let pred = w[0];
    for (let j = 0; j < row.length; j++) pred += w[j + 1] * row[j];
    return pred;
  });
}

// ─── Naive Bayes (Gaussian) ───────────────────────────────────────────────────

interface NBModel { classes: number[]; stats: Record<number, { mean: number[]; v: number[]; prior: number }> }

function trainNaiveBayes(X: number[][], y: number[]): NBModel {
  const classes = [...new Set(y)];
  const stats: NBModel["stats"] = {};
  for (const c of classes) {
    const rows = X.filter((_, i) => y[i] === c);
    const n    = rows.length;
    const mean = rows[0].map((_, j) => rows.reduce((s, r) => s + r[j], 0) / n);
    const v    = rows[0].map((_, j) => rows.reduce((s, r) => s + (r[j] - mean[j]) ** 2, 0) / n + 1e-9);
    stats[c]   = { mean, v, prior: n / y.length };
  }
  return { classes, stats };
}

function predictNaiveBayes(X: number[][], model: NBModel): number[] {
  return X.map(x => {
    let best = model.classes[0], bestP = -Infinity;
    for (const c of model.classes) {
      const { mean, v, prior } = model.stats[c];
      let lp = Math.log(prior);
      for (let j = 0; j < x.length; j++) lp += -0.5 * Math.log(2 * Math.PI * v[j]) - (x[j] - mean[j]) ** 2 / (2 * v[j]);
      if (lp > bestP) { bestP = lp; best = c; }
    }
    return best;
  });
}

// ─── K-Nearest Neighbours (k=5) ───────────────────────────────────────────────

function predictKNN(Xtr: number[][], ytr: number[], Xte: number[][], k = 5): number[] {
  return Xte.map(xq => {
    const dists = Xtr
      .map((xi, i) => ({ d: xi.reduce((s, v, j) => s + (v - xq[j]) ** 2, 0), y: ytr[i] }))
      .sort((a, b) => a.d - b.d)
      .slice(0, k);
    const votes: Record<number, number> = {};
    for (const { y } of dists) votes[y] = (votes[y] ?? 0) + 1;
    return Number(Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0]);
  });
}

// ─── Ridge Regression (linear + L2) ──────────────────────────────────────────

function trainRidge(X: number[][], y: number[], lr = 0.1, iters = 400, lambda = 0.01): number[] {
  const m = X.length, n = X[0].length;
  const w = new Array(n + 1).fill(0);
  for (let it = 0; it < iters; it++) {
    const g = new Array(n + 1).fill(0);
    for (let i = 0; i < m; i++) {
      let pred = w[0];
      for (let j = 0; j < n; j++) pred += w[j + 1] * X[i][j];
      const e = pred - y[i];
      g[0] += e;
      for (let j = 0; j < n; j++) g[j + 1] += e * X[i][j] + lambda * w[j + 1];
    }
    for (let j = 0; j <= n; j++) w[j] -= (lr / m) * g[j];
  }
  return w;
}

// ─── AutoML result type ───────────────────────────────────────────────────────

interface AutoMLEntry {
  name: string;
  metrics: ClassMetrics | RegMetrics;
  type: "class" | "reg";
}

interface ClassMetrics { accuracy: number; precision: number; recall: number; f1: number; tp: number; fp: number; fn: number; tn: number }
interface RegMetrics   { r2: number; rmse: number; mae: number }

function classMetrics(preds: number[], truth: number[]): ClassMetrics {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (let i = 0; i < preds.length; i++) {
    if (preds[i] === 1 && truth[i] === 1) tp++;
    else if (preds[i] === 1 && truth[i] === 0) fp++;
    else if (preds[i] === 0 && truth[i] === 1) fn++;
    else tn++;
  }
  const accuracy  = (tp + tn) / preds.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall    = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1        = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
  return { accuracy, precision, recall, f1, tp, fp, fn, tn };
}

function regMetrics(preds: number[], truth: number[]): RegMetrics {
  const n = preds.length;
  const meanY = truth.reduce((a, b) => a + b, 0) / n;
  const ssTot = truth.reduce((a, v) => a + (v - meanY) ** 2, 0);
  const ssRes = preds.reduce((a, p, i) => a + (p - truth[i]) ** 2, 0);
  const r2    = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const rmse  = Math.sqrt(ssRes / n);
  const mae   = preds.reduce((a, p, i) => a + Math.abs(p - truth[i]), 0) / n;
  return { r2, rmse, mae };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Algo = "logistic" | "linear";

interface TrainResult {
  algo: Algo;
  targetCol: string;
  featureCols: string[];
  classResult?: ClassMetrics & { class0: string; class1: string };
  regResult?: RegMetrics;
  importance: { col: string; score: number }[];
  trainSize: number;
  testSize: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  activeRows: Row[];
  summary: DatasetSummary;
}

const MAX_TRAIN = 4000; // cap for browser performance

export function ModelTrainerTab({ activeRows, summary }: Props) {
  const numericCols = useMemo(
    () => summary.columns.filter(c => c.type === "numeric").map(c => c.name),
    [summary.columns]
  );
  const allCols = useMemo(() => summary.columns.map(c => c.name), [summary.columns]);

  const [targetCol, setTargetCol] = useState<string>(summary.detectedTarget ?? numericCols[numericCols.length - 1] ?? "");
  const [featureCols, setFeatureCols] = useState<Set<string>>(
    () => new Set(numericCols.filter(c => c !== (summary.detectedTarget ?? "")))
  );
  const [splitPct, setSplitPct] = useState(80);
  const [training, setTraining] = useState(false);
  const [result, setResult] = useState<TrainResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [automlMode, setAutomlMode] = useState(false);
  const [automlResults, setAutomlResults] = useState<AutoMLEntry[] | null>(null);

  // Auto-detect algorithm from target type
  const targetStats = useMemo(
    () => summary.columns.find(c => c.name === targetCol),
    [summary.columns, targetCol]
  );
  const autoAlgo: Algo = useMemo(() => {
    if (!targetStats) return "linear";
    if (targetStats.type === "categorical" || targetStats.type === "boolean") return "logistic";
    if (targetStats.unique <= 5) return "logistic";
    return "linear";
  }, [targetStats]);

  const toggleFeature = (col: string) => {
    setFeatureCols(prev => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });
  };

  const handleTrain = useCallback(() => {
    if (!targetCol || featureCols.size === 0) return;
    setError(null);
    setTraining(true);

    setTimeout(() => {
      try {
        const features = [...featureCols];
        const algo = autoAlgo;

        // Build dataset — drop rows with nulls in target or selected features
        const allSelected = [targetCol, ...features];
        const clean = activeRows.filter(row =>
          allSelected.every(col => {
            const v = row[col];
            return v !== null && v !== undefined && v !== "" && !isNaN(Number(v));
          })
        );

        if (clean.length < 20) {
          setError(`Not enough complete rows (found ${clean.length}, need ≥ 20). Try filling nulls in the Transform tab first.`);
          setTraining(false);
          return;
        }

        // Shuffle + cap
        const shuffled = [...clean].sort(() => Math.random() - 0.5).slice(0, MAX_TRAIN);
        const splitAt = Math.floor(shuffled.length * splitPct / 100);
        const trainRows = shuffled.slice(0, splitAt);
        const testRows  = shuffled.slice(splitAt);

        if (testRows.length < 5) {
          setError("Test set too small — reduce training split or add more data.");
          setTraining(false);
          return;
        }

        const toX = (rows: Row[]) => rows.map(r => features.map(f => Number(r[f])));
        const Xtr = toX(trainRows);
        const Xte = toX(testRows);

        // Normalize (fit on train, transform both)
        const { Xn: Xtrn, means, stds } = normalizeFeatures(Xtr);
        const Xten = Xte.map(row => row.map((v, j) => (v - means[j]) / stds[j]));

        if (algo === "logistic") {
          // Encode target
          const classes = [...new Set(shuffled.map(r => String(r[targetCol] ?? "")))].sort();
          if (classes.length > 2) {
            setError(`Logistic regression requires a binary target. "${targetCol}" has ${classes.length} classes. Switch to a numeric target for regression.`);
            setTraining(false);
            return;
          }
          const [class0, class1] = classes.length === 2 ? classes : [classes[0], classes[0]];
          const toY = (rows: Row[]) => rows.map(r => String(r[targetCol]) === class1 ? 1 : 0);
          const ytr = toY(trainRows);
          const yte = toY(testRows);

          const weights = trainLogistic(Xtrn, ytr);
          const preds   = predictLogistic(Xten, weights);
          const cm      = classMetrics(preds, yte);

          // Feature importance = |coefficient| (normalized weights[1..])
          const rawScores = features.map((_, j) => Math.abs(weights[j + 1]));
          const maxScore  = Math.max(...rawScores, 1e-9);
          const importance = features
            .map((col, j) => ({ col, score: rawScores[j] / maxScore }))
            .sort((a, b) => b.score - a.score);

          setResult({ algo, targetCol, featureCols: features, classResult: { ...cm, class0, class1 }, importance, trainSize: trainRows.length, testSize: testRows.length });
        } else {
          const toY = (rows: Row[]) => rows.map(r => Number(r[targetCol]));
          const ytr = toY(trainRows);
          const yte = toY(testRows);

          const weights = trainLinear(Xtrn, ytr);
          const preds   = predictLinear(Xten, weights);
          const rm      = regMetrics(preds, yte);

          const rawScores = features.map((_, j) => Math.abs(weights[j + 1]));
          const maxScore  = Math.max(...rawScores, 1e-9);
          const importance = features
            .map((col, j) => ({ col, score: rawScores[j] / maxScore }))
            .sort((a, b) => b.score - a.score);

          setResult({ algo, targetCol, featureCols: features, regResult: rm, importance, trainSize: trainRows.length, testSize: testRows.length });
        }
      } catch (e) {
        setError((e as Error).message ?? "Training failed");
      } finally {
        setTraining(false);
      }
    }, 20);
  }, [targetCol, featureCols, splitPct, autoAlgo, activeRows]);

  const handleAutoML = useCallback(() => {
    if (!targetCol || featureCols.size === 0) return;
    setError(null);
    setTraining(true);
    setAutomlResults(null);

    setTimeout(() => {
      try {
        const features = [...featureCols];
        const isClass  = autoAlgo === "logistic";
        const allSel   = [targetCol, ...features];
        const clean    = activeRows.filter(row =>
          allSel.every(col => {
            const v = row[col];
            return v !== null && v !== undefined && v !== "" && !isNaN(Number(v));
          })
        );
        if (clean.length < 20) {
          setError(`Not enough complete rows (${clean.length}). Fill nulls first.`);
          setTraining(false);
          return;
        }
        const shuffled   = [...clean].sort(() => Math.random() - 0.5).slice(0, MAX_TRAIN);
        const splitAt    = Math.floor(shuffled.length * splitPct / 100);
        const trainRows  = shuffled.slice(0, splitAt);
        const testRows   = shuffled.slice(splitAt);
        if (testRows.length < 5) { setError("Test set too small."); setTraining(false); return; }

        const toX  = (rows: Row[]) => rows.map(r => features.map(f => Number(r[f])));
        const Xtr  = toX(trainRows);
        const Xte  = toX(testRows);
        const { Xn: Xtrn, means, stds } = normalizeFeatures(Xtr);
        const Xten = Xte.map(row => row.map((v, j) => (v - means[j]) / stds[j]));

        const entries: AutoMLEntry[] = [];

        if (isClass) {
          const classes   = [...new Set(shuffled.map(r => String(r[targetCol] ?? "")))].sort();
          if (classes.length > 2) { setError(`AutoML classification requires a binary target. Found ${classes.length} classes.`); setTraining(false); return; }
          const [, class1] = classes;
          const toY  = (rows: Row[]) => rows.map(r => String(r[targetCol]) === class1 ? 1 : 0);
          const ytr  = toY(trainRows);
          const yte  = toY(testRows);

          // 1. Logistic Regression
          const wLog  = trainLogistic(Xtrn, ytr);
          entries.push({ name: "Logistic Regression", type: "class", metrics: classMetrics(predictLogistic(Xten, wLog), yte) });

          // 2. Naive Bayes
          const nbModel = trainNaiveBayes(Xtrn, ytr);
          entries.push({ name: "Naive Bayes", type: "class", metrics: classMetrics(predictNaiveBayes(Xten, nbModel), yte) });

          // 3. KNN (k=5)
          entries.push({ name: "K-Nearest Neighbors (k=5)", type: "class", metrics: classMetrics(predictKNN(Xtrn, ytr, Xten, 5), yte) });
        } else {
          const toY  = (rows: Row[]) => rows.map(r => Number(r[targetCol]));
          const ytr  = toY(trainRows);
          const yte  = toY(testRows);

          // 1. Linear Regression
          const wLin  = trainLinear(Xtrn, ytr);
          entries.push({ name: "Linear Regression", type: "reg", metrics: regMetrics(predictLinear(Xten, wLin), yte) });

          // 2. Ridge Regression
          const wRidge = trainRidge(Xtrn, ytr);
          entries.push({ name: "Ridge Regression (λ=0.01)", type: "reg", metrics: regMetrics(predictLinear(Xten, wRidge), yte) });
        }

        // Sort by best metric
        entries.sort((a, b) => {
          if (a.type === "class") return (b.metrics as ClassMetrics).accuracy - (a.metrics as ClassMetrics).accuracy;
          return (b.metrics as RegMetrics).r2 - (a.metrics as RegMetrics).r2;
        });
        setAutomlResults(entries);
      } catch (e) {
        setError((e as Error).message ?? "AutoML failed");
      } finally {
        setTraining(false);
      }
    }, 20);
  }, [targetCol, featureCols, splitPct, autoAlgo, activeRows]);

  const fmt = (n: number, d = 3) => n.toFixed(d);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #06b6d4, #0284c7)" }}>
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>In-Browser Model Trainer</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Logistic or linear regression · pure JS · no data leaves your browser
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
          style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "#06b6d4" }}>
          <Info className="h-3.5 w-3.5 shrink-0" />
          Capped at {MAX_TRAIN.toLocaleString()} rows for speed
        </div>
      </div>

      {/* Config */}
      <div className="rounded-xl p-5 space-y-5"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>

        {/* Target + algorithm row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              Target Column
            </label>
            <select value={targetCol} onChange={e => { setTargetCol(e.target.value); setResult(null); }}
              className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
              style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}>
              {allCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              Algorithm (auto-detected)
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
              style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}>
              {autoAlgo === "logistic" ? "Logistic Regression" : "Linear Regression"}
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                style={{ background: autoAlgo === "logistic" ? "rgba(167,139,250,0.15)" : "rgba(6,182,212,0.15)", color: autoAlgo === "logistic" ? "#a78bfa" : "#06b6d4" }}>
                {autoAlgo === "logistic" ? "Classification" : "Regression"}
              </span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Feature Columns (numeric) — {featureCols.size} selected
          </label>
          <div className="flex flex-wrap gap-2">
            {numericCols.filter(c => c !== targetCol).map(col => {
              const on = featureCols.has(col);
              return (
                <button key={col} onClick={() => { toggleFeature(col); setResult(null); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: on ? "rgba(6,182,212,0.15)" : "var(--color-bg-elevated)",
                    border: `1px solid ${on ? "rgba(6,182,212,0.4)" : "var(--color-border-default)"}`,
                    color: on ? "#06b6d4" : "var(--color-text-muted)",
                  }}>
                  {col}
                </button>
              );
            })}
            {numericCols.filter(c => c !== targetCol).length === 0 && (
              <p className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
                No numeric feature columns available. Apply transforms (label/one-hot encode) first.
              </p>
            )}
          </div>
        </div>

        {/* Split slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              Train / Test Split
            </label>
            <span className="text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
              {splitPct}% / {100 - splitPct}%
            </span>
          </div>
          <input type="range" min={60} max={90} step={5} value={splitPct}
            onChange={e => { setSplitPct(Number(e.target.value)); setResult(null); }}
            className="w-full accent-cyan-400" />
        </div>

        {/* AutoML toggle */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
          <button onClick={() => { setAutomlMode(v => !v); setResult(null); setAutomlResults(null); }}
            className="flex items-center gap-2"
            role="switch" aria-checked={automlMode}>
            <div className="relative w-9 h-5 rounded-full transition-colors"
              style={{ background: automlMode ? "#a78bfa" : "var(--color-border-default)" }}>
              <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{ background: "#fff", left: automlMode ? "calc(100% - 18px)" : "2px" }} />
            </div>
          </button>
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>AutoML Mode</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {autoAlgo === "logistic"
                ? "Compare: Logistic Regression · Naive Bayes · KNN"
                : "Compare: Linear Regression · Ridge Regression"}
            </p>
          </div>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>New</span>
        </div>

        {/* Train / AutoML button */}
        {!automlMode ? (
          <button onClick={handleTrain}
            disabled={training || featureCols.size === 0 || !targetCol}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
            style={{ background: "linear-gradient(135deg, #06b6d4, #0284c7)", color: "#fff", boxShadow: "0 0 20px rgba(6,182,212,0.25)" }}>
            {training
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Training…</>
              : <><Play className="h-4 w-4" /> Train Model</>}
          </button>
        ) : (
          <button onClick={handleAutoML}
            disabled={training || featureCols.size === 0 || !targetCol}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
            style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)", color: "#fff", boxShadow: "0 0 20px rgba(167,139,250,0.25)" }}>
            {training
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Running AutoML…</>
              : <><Sparkles className="h-4 w-4" /> Run AutoML</>}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-2 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--color-error)" }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* AutoML results */}
      {automlResults && automlResults.length > 0 && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-bg-surface)", border: "1px solid rgba(167,139,250,0.3)", borderLeft: "3px solid #a78bfa" }}>
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <Trophy className="h-4 w-4" style={{ color: "#a78bfa" }} />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a78bfa" }}>
              AutoML — Algorithm Comparison
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                  <th className="px-4 py-2.5 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>Algorithm</th>
                  {automlResults[0].type === "class"
                    ? ["Accuracy", "Precision", "Recall", "F1"].map(h => <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>{h}</th>)
                    : ["R²", "RMSE", "MAE"].map(h => <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>{h}</th>)
                  }
                </tr>
              </thead>
              <tbody>
                {automlResults.map((entry, i) => {
                  const isWinner = i === 0;
                  const m = entry.metrics as ClassMetrics & RegMetrics;
                  return (
                    <tr key={entry.name}
                      style={{
                        borderBottom: "1px solid var(--color-border-subtle)",
                        background: isWinner ? "rgba(167,139,250,0.06)" : "transparent",
                      }}>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 font-semibold" style={{ color: isWinner ? "#a78bfa" : "var(--color-text-secondary)" }}>
                          {isWinner && <Trophy className="h-3.5 w-3.5 shrink-0" style={{ color: "#f59e0b" }} />}
                          {entry.name}
                        </span>
                      </td>
                      {entry.type === "class" ? (
                        <>
                          <td className="px-4 py-3 font-bold" style={{ color: "#10b981" }}>{(m.accuracy * 100).toFixed(1)}%</td>
                          <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>{m.precision?.toFixed(3)}</td>
                          <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>{m.recall?.toFixed(3)}</td>
                          <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>{m.f1?.toFixed(3)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-bold" style={{ color: "#10b981" }}>{m.r2?.toFixed(3)}</td>
                          <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>{m.rmse?.toFixed(3)}</td>
                          <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>{m.mae?.toFixed(3)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !automlMode && (
        <div className="space-y-4">
          {/* Metrics */}
          <div className="rounded-xl p-5"
            style={{ background: "var(--color-bg-surface)", border: "1px solid rgba(6,182,212,0.25)", borderLeft: "3px solid #06b6d4" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#06b6d4" }}>
              Results — {result.algo === "logistic" ? "Logistic Regression" : "Linear Regression"} · {result.targetCol}
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
              Trained on {result.trainSize.toLocaleString()} rows · tested on {result.testSize.toLocaleString()} rows
            </p>

            {result.classResult && (
              <>
                {/* Classification metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: "Accuracy",  val: `${(result.classResult.accuracy  * 100).toFixed(1)}%`, color: "#10b981" },
                    { label: "Precision", val: fmt(result.classResult.precision),                     color: "#06b6d4" },
                    { label: "Recall",    val: fmt(result.classResult.recall),                        color: "#a78bfa" },
                    { label: "F1 Score",  val: fmt(result.classResult.f1),                            color: "#f59e0b" },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl p-3 text-center"
                      style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
                      <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>{m.label}</p>
                      <p className="text-xl font-bold" style={{ color: m.color }}>{m.val}</p>
                    </div>
                  ))}
                </div>

                {/* Confusion matrix */}
                <div className="mb-5">
                  <p className="text-xs font-semibold mb-3" style={{ color: "var(--color-text-secondary)" }}>Confusion Matrix</p>
                  <div className="inline-grid gap-px rounded-xl overflow-hidden text-xs"
                    style={{ gridTemplateColumns: "auto 1fr 1fr", background: "var(--color-border-default)" }}>
                    {[
                      { content: "",                       style: { background: "var(--color-bg-elevated)", width: 90 } },
                      { content: `Pred: ${result.classResult.class0}`, style: { background: "var(--color-bg-elevated)", color: "var(--color-text-muted)", padding: "6px 12px", textAlign: "center" as const } },
                      { content: `Pred: ${result.classResult.class1}`, style: { background: "var(--color-bg-elevated)", color: "var(--color-text-muted)", padding: "6px 12px", textAlign: "center" as const } },
                      { content: `Act: ${result.classResult.class0}`,  style: { background: "var(--color-bg-elevated)", color: "var(--color-text-muted)", padding: "6px 12px" } },
                      { content: String(result.classResult.tn),        style: { background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 700, padding: "10px 20px", textAlign: "center" as const, fontSize: 16 } },
                      { content: String(result.classResult.fp),        style: { background: "rgba(239,68,68,0.08)",  color: "#ef4444", fontWeight: 700, padding: "10px 20px", textAlign: "center" as const, fontSize: 16 } },
                      { content: `Act: ${result.classResult.class1}`,  style: { background: "var(--color-bg-elevated)", color: "var(--color-text-muted)", padding: "6px 12px" } },
                      { content: String(result.classResult.fn),        style: { background: "rgba(239,68,68,0.08)",  color: "#ef4444", fontWeight: 700, padding: "10px 20px", textAlign: "center" as const, fontSize: 16 } },
                      { content: String(result.classResult.tp),        style: { background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 700, padding: "10px 20px", textAlign: "center" as const, fontSize: 16 } },
                    ].map((cell, i) => (
                      <div key={i} className="text-xs" style={cell.style}>{cell.content}</div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {result.regResult && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "R² Score",  val: fmt(result.regResult.r2,   3), color: "#10b981", note: result.regResult.r2 >= 0.8 ? "strong fit" : result.regResult.r2 >= 0.5 ? "moderate" : "weak fit" },
                  { label: "RMSE",      val: fmt(result.regResult.rmse, 3), color: "#06b6d4", note: "root mean sq. error" },
                  { label: "MAE",       val: fmt(result.regResult.mae,  3), color: "#a78bfa", note: "mean abs. error" },
                ].map(m => (
                  <div key={m.label} className="rounded-xl p-3 text-center"
                    style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>{m.label}</p>
                    <p className="text-xl font-bold" style={{ color: m.color }}>{m.val}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-disabled)" }}>{m.note}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Feature importance */}
            <div>
              <p className="text-xs font-semibold mb-3" style={{ color: "var(--color-text-secondary)" }}>
                Feature Importance (coefficient magnitude)
              </p>
              <div className="space-y-2">
                {result.importance.map((item, i) => (
                  <div key={item.col} className="flex items-center gap-3">
                    <code className="text-xs w-32 shrink-0 truncate" style={{ color: "var(--color-text-secondary)" }}>
                      {item.col}
                    </code>
                    <div className="flex-1 rounded-full overflow-hidden"
                      style={{ height: 8, background: "var(--color-bg-elevated)" }}>
                      <div style={{
                        height: "100%",
                        width: `${item.score * 100}%`,
                        background: i === 0 ? "#06b6d4" : i === 1 ? "#a78bfa" : i === 2 ? "#10b981" : "#f59e0b",
                        borderRadius: 4,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                    <span className="text-xs font-mono shrink-0 w-10 text-right"
                      style={{ color: "var(--color-text-muted)" }}>
                      {(item.score * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
