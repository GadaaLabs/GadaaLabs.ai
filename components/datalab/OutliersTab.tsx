"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { DatasetSummary } from "@/lib/datalab";

const TX1 = "#e8edf5", TX2 = "#9ba8bc", TX3 = "#5c6a80";
const ROSE = "#fb7185", GREEN = "#34d399", AMBER = "#fbbf24", VIOLET = "#8b5cf6";
const CYAN = "#22d3ee", BLUE = "#60a5fa";
const BORDER = "rgba(255,255,255,0.07)";

interface Props { summary: DatasetSummary }

export function OutliersTab({ summary }: Props) {
  const numericCols = summary.columns.filter((c) => c.type === "numeric");
  const colsWithOutlierField = numericCols.map((c) => ({ ...c, outlierCount: c.outlierCount ?? 0 }));
  const totalOutliers = colsWithOutlierField.reduce((s, c) => s + c.outlierCount, 0);

  if (numericCols.length === 0) {
    return (
      <p style={{ color: TX3, textAlign: "center", padding: "40px 0", fontSize: 13 }}>
        No numeric columns found.
      </p>
    );
  }

  const sorted = [...colsWithOutlierField].sort(
    (a, b) => b.outlierCount - a.outlierCount
  );

  return (
    <div>
      {/* Summary banner */}
      <div style={{ background: "#0c0c18", border: `1px solid ${BORDER}`,
        borderRadius: 12, padding: "12px 16px", marginBottom: 16,
        display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: TX2 }}>
          <span style={{ fontSize: 18, fontWeight: 700,
            color: totalOutliers > 0 ? ROSE : GREEN }}>
            {totalOutliers}
          </span>{" "}total outlier values across{" "}
          <strong style={{ color: TX1 }}>{numericCols.length}</strong> numeric columns
        </span>
        {totalOutliers > 0 && (
          <span style={{ fontSize: 11, color: AMBER,
            background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)",
            borderRadius: 8, padding: "3px 10px" }}>
            Recommend: investigate or cap outliers before modeling
          </span>
        )}
      </div>

      {/* Per-column box summary grid */}
      <div style={{ display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
        {sorted.map((col) => {
          const outliers = col.outlierCount;
          const pct = col.count > 0
            ? Math.round((outliers / col.count) * 1000) / 10
            : 0;
          const boxData = [
            { label: "Min",    value: col.min ?? 0 },
            { label: "Q1",     value: col.p25 ?? 0 },
            { label: "Median", value: col.p50 ?? 0 },
            { label: "Mean",   value: col.mean ?? 0 },
            { label: "Q3",     value: col.p75 ?? 0 },
            { label: "Max",    value: col.max ?? 0 },
          ];
          const hasOutliers = outliers > 0;
          return (
            <div key={col.name} style={{ background: "#0c0c18",
              border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: TX1,
                  fontFamily: "monospace" }}>{col.name}</span>
                <span style={{ fontSize: 11,
                  color: hasOutliers ? ROSE : GREEN,
                  background: hasOutliers ? "rgba(251,113,133,0.12)" : "rgba(52,211,153,0.1)",
                  border: `1px solid ${hasOutliers ? "rgba(251,113,133,0.3)" : "rgba(52,211,153,0.25)"}`,
                  borderRadius: 20, padding: "2px 8px" }}>
                  {outliers} outliers ({pct}%)
                </span>
              </div>
              <div style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={boxData}
                    margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: TX3 }} />
                    <YAxis tick={{ fontSize: 9, fill: TX3 }} width={40} />
                    <Tooltip contentStyle={{ background: "#10101e",
                      border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: TX1 }} itemStyle={{ color: TX2 }} />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {boxData.map((d, i) => (
                        <Cell key={i} fill={
                          d.label === "Median" ? VIOLET :
                          d.label === "Mean"   ? CYAN :
                          d.label === "Min" || d.label === "Max" ? ROSE : BLUE
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
