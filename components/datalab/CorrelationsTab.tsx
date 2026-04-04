"use client";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { DatasetSummary } from "@/lib/datalab";

const TX1 = "#e8edf5", TX2 = "#9ba8bc", TX3 = "#5c6a80";
const VIOLET = "#8b5cf6", CYAN = "#22d3ee", ROSE = "#fb7185", AMBER = "#fbbf24";
const BORDER = "rgba(255,255,255,0.07)";

interface Props {
  summary: DatasetSummary;
  chartInsights?: Record<string, string>;
}

function rColor(r: number): string {
  if (r > 0.7) return VIOLET;
  if (r > 0.4) return CYAN;
  if (r < -0.7) return ROSE;
  if (r < -0.4) return AMBER;
  return TX3;
}

export function CorrelationsTab({ summary, chartInsights = {} }: Props) {
  const { correlations = [], correlationMatrix = {}, columns } = summary;
  // Map our CorrelationPair {colA,colB,r} → local {col1,col2,r} shape
  const recommendedPairs = correlations.map((p) => ({ col1: p.colA, col2: p.colB, r: p.r }));
  const numericCols = columns.filter((c) => c.type === "numeric");
  const colNames = numericCols.map((c) => c.name);

  if (colNames.length < 2) {
    return (
      <p style={{ color: TX3, textAlign: "center", padding: "40px 0", fontSize: 13 }}>
        No numeric column pairs found for correlation analysis.
      </p>
    );
  }

  const rLookup = new Map<string, number>();
  for (const row of Object.keys(correlationMatrix)) {
    for (const col of Object.keys(correlationMatrix[row])) {
      rLookup.set(`${row}|${col}`, correlationMatrix[row][col]);
    }
  }

  return (
    <div>
      {/* Correlation heatmap */}
      <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.1em", color: TX3, marginBottom: 12 }}>
        Correlation Heatmap
      </h3>
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ width: 100 }} />
              {colNames.map((n) => (
                <th key={n} style={{ color: TX2, padding: "4px 6px", fontWeight: 500,
                  writingMode: "vertical-lr" as const, transform: "rotate(180deg)",
                  maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colNames.map((row) => (
              <tr key={row}>
                <td style={{ color: TX2, padding: "4px 8px", fontWeight: 500,
                  maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap" }}>{row}</td>
                {colNames.map((col) => {
                  const r = row === col ? 1 : (rLookup.get(`${row}|${col}`) ?? 0);
                  const absR = Math.abs(r);
                  const bg = r === 1
                    ? "rgba(139,92,246,0.3)"
                    : r > 0
                    ? `rgba(34,211,238,${absR * 0.5})`
                    : `rgba(251,113,133,${absR * 0.5})`;
                  return (
                    <td key={col} style={{
                      background: bg, padding: "6px 8px", textAlign: "center",
                      color: absR > 0.3 ? TX1 : TX3,
                      fontWeight: absR > 0.5 ? 700 : 400,
                      border: `1px solid ${BORDER}`,
                    }}>
                      {r.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top correlated pairs with scatter plots */}
      {recommendedPairs.length > 0 && (
        <div>
          <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.1em", color: TX3, marginBottom: 12 }}>
            Top Correlated Pairs — Scatter Plots
          </h3>
          {recommendedPairs.map((pair) => {
            const insight = chartInsights[`${pair.col1}_${pair.col2}`]
              ?? chartInsights[`${pair.col2}_${pair.col1}`];
            const rc = rColor(pair.r);
            // Build scatter points from sampleRows
            const points = (summary.sampleRows ?? [])
              .map((row) => ({ x: row[pair.col1], y: row[pair.col2] }))
              .filter((p) => p.x !== undefined && p.y !== undefined)
              .slice(0, 200);
            const direction = pair.r > 0 ? "positive" : "negative";
            const strength = Math.abs(pair.r) > 0.7 ? "strong" : Math.abs(pair.r) > 0.4 ? "moderate" : "weak";

            return (
              <div key={`${pair.col1}_${pair.col2}`}
                style={{ background: "#0c0c18", border: `1px solid ${BORDER}`,
                  borderRadius: 14, padding: 16, marginBottom: 16 }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: TX1, fontFamily: "monospace" }}>
                    {pair.col1} × {pair.col2}
                  </span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: TX3 }}>{strength} {direction}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: rc,
                      background: `${rc}18`, border: `1px solid ${rc}40`,
                      borderRadius: 20, padding: "2px 10px" }}>
                      r = {pair.r}
                    </span>
                  </div>
                </div>
                {/* Scatter plot */}
                {points.length > 0 ? (
                  <div style={{ height: 180, marginTop: 8 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 4, right: 12, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="x" type="number" name={pair.col1}
                          tick={{ fontSize: 8, fill: TX3 }} label={{ value: pair.col1, position: "insideBottom", fill: TX3, fontSize: 9, offset: -8 }} />
                        <YAxis dataKey="y" type="number" name={pair.col2}
                          tick={{ fontSize: 8, fill: TX3 }} width={36} />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }}
                          contentStyle={{ background: "#10101e", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 10 }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(v: any, name: any) => [typeof v === "number" ? v.toFixed(2) : v, name] as any} />
                        <Scatter data={points} fill={rc} fillOpacity={0.55} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 11, color: TX3 }}>No sample data available for scatter plot</span>
                  </div>
                )}
                {/* AI insight */}
                {insight && (
                  <p style={{ fontSize: 12, color: TX2, lineHeight: 1.6,
                    background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)",
                    borderRadius: 8, padding: "8px 10px", margin: "10px 0 0" }}>{insight}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
