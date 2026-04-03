"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { DatasetSummary } from "@/lib/datalab";

const TX1 = "#e8edf5", TX2 = "#9ba8bc", TX3 = "#5c6a80";
const ROSE = "#fb7185", GREEN = "#34d399", AMBER = "#fbbf24";
const BORDER = "rgba(255,255,255,0.07)";

interface Props { summary: DatasetSummary }

export function MissingTab({ summary }: Props) {
  const colsWithNulls = summary.columns
    .filter((c) => c.nullPct > 0)
    .sort((a, b) => b.nullPct - a.nullPct);
  const { missingnessPattern } = summary;

  // Co-occurrence: columns that are null together in the same row
  const coOccurrence = new Map<string, number>();
  for (const row of missingnessPattern) {
    for (let i = 0; i < row.colsWithNull.length; i++) {
      for (let j = i + 1; j < row.colsWithNull.length; j++) {
        const key = `${row.colsWithNull[i]}|${row.colsWithNull[j]}`;
        coOccurrence.set(key, (coOccurrence.get(key) ?? 0) + 1);
      }
    }
  }
  const topCoOccurrence = [...coOccurrence.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (colsWithNulls.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <p style={{ fontSize: 22, marginBottom: 8 }}>✓</p>
        <p style={{ color: GREEN, fontSize: 14, fontWeight: 600 }}>
          No missing data detected
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Null % bar chart */}
      <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.1em", color: TX3, marginBottom: 12 }}>
        Null % per Column
      </h3>
      <div style={{ background: "#0c0c18", border: `1px solid ${BORDER}`,
        borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={colsWithNulls.map((c) => ({ name: c.name, nullPct: c.nullPct }))}
              margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: TX3 }}
                angle={-40} textAnchor="end" />
              <YAxis tick={{ fontSize: 9, fill: TX3 }} width={28}
                domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={{ background: "#10101e",
                border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }}
                formatter={(v: unknown) => [`${String(v)}%`, "Null %"]}
                labelStyle={{ color: TX1 }} />
              <Bar dataKey="nullPct" radius={[3, 3, 0, 0]}>
                {colsWithNulls.map((col, i) => (
                  <Cell key={i}
                    fill={col.nullPct > 20 ? ROSE : col.nullPct > 5 ? AMBER : GREEN} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row-level missingness dots */}
      {missingnessPattern.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.1em", color: TX3, marginBottom: 12 }}>
            Row-Level Missingness Pattern (first 200 rows sampled)
          </h3>
          <div style={{ overflowX: "auto", background: "#0c0c18",
            border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {missingnessPattern.slice(0, 100).map((row) => (
                <div
                  key={row.rowIndex}
                  title={`Row ${row.rowIndex}: ${row.colsWithNull.join(", ")} null`}
                  style={{
                    width: 8, height: 8, borderRadius: 2,
                    background:
                      row.colsWithNull.length > 2 ? ROSE :
                      row.colsWithNull.length > 1 ? AMBER : "#fbbf2460",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: 10, color: TX3, marginTop: 8 }}>
              Each dot = one row with missing values. Hover for column details.
            </p>
          </div>
        </div>
      )}

      {/* Co-occurrence insight */}
      {topCoOccurrence.length > 0 && (
        <div style={{ background: "rgba(251,113,133,0.05)",
          border: "1px solid rgba(251,113,133,0.2)", borderRadius: 12, padding: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: ROSE, marginBottom: 8,
            textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
            Correlated Missingness
          </p>
          {topCoOccurrence.map(([key, count]) => {
            const [a, b] = key.split("|");
            const pct = missingnessPattern.length > 0
              ? Math.round((count / missingnessPattern.length) * 100)
              : 0;
            return (
              <p key={key} style={{ fontSize: 12, color: TX2, margin: "4px 0" }}>
                <code style={{ color: AMBER }}>{a}</code> and{" "}
                <code style={{ color: AMBER }}>{b}</code> are both null in{" "}
                <strong style={{ color: TX1 }}>{pct}%</strong> of missing rows
                — likely from the same data source gap.
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
