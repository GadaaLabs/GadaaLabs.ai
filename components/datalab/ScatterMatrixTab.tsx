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

  // Hooks must precede early returns (React rules of hooks). Both memos are cheap on empty input.
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
