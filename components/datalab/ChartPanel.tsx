"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import type { DatasetSummary } from "@/lib/datalab";

const PURPLE = "#7c3aed";
const CYAN   = "#06b6d4";
const AMBER  = "#f59e0b";
const GREEN  = "#10b981";

const COLORS = [PURPLE, CYAN, AMBER, GREEN, "#6366f1", "#ec4899"];

interface Props { summary: DatasetSummary }

export function ChartPanel({ summary }: Props) {
  const numericCols = summary.columns.filter((c) => c.type === "numeric" && c.histogram && c.histogram.length > 0).slice(0, 4);
  const catCols = summary.columns.filter((c) => (c.type === "categorical" || c.type === "boolean") && c.histogram && c.histogram.length > 0).slice(0, 3);

  if (numericCols.length === 0 && catCols.length === 0) {
    return (
      <p className="text-sm text-center py-10" style={{ color: "var(--color-text-muted)" }}>
        No chart-able columns detected.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {/* Numeric histograms */}
      {numericCols.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--color-text-muted)" }}>
            Numeric Distributions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {numericCols.map((col, ci) => (
              <div key={col.name} className="rounded-xl p-4"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
                <p className="text-xs font-semibold mb-3 font-mono" style={{ color: "var(--color-text-secondary)" }}>
                  {col.name} <span style={{ color: "var(--color-text-muted)" }}>— histogram</span>
                </p>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={col.histogram} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: "#6b6b88" }} interval="preserveStartEnd" angle={-30} textAnchor="end" />
                      <YAxis tick={{ fontSize: 9, fill: "#6b6b88" }} width={30} />
                      <Tooltip
                        contentStyle={{ background: "#161625", border: "1px solid #2a2a45", borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: "#f0f0ff" }}
                        itemStyle={{ color: "#a8a8c0" }}
                      />
                      <Bar dataKey="count" fill={COLORS[ci % COLORS.length]} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  <span>min: <b style={{ color: "var(--color-text-secondary)" }}>{col.min}</b></span>
                  <span>median: <b style={{ color: "var(--color-text-secondary)" }}>{col.p50}</b></span>
                  <span>max: <b style={{ color: "var(--color-text-secondary)" }}>{col.max}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categorical bar charts */}
      {catCols.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--color-text-muted)" }}>
            Categorical Distributions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {catCols.map((col, ci) => (
              <div key={col.name} className="rounded-xl p-4"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
                <p className="text-xs font-semibold mb-3 font-mono" style={{ color: "var(--color-text-secondary)" }}>
                  {col.name} <span style={{ color: "var(--color-text-muted)" }}>— top values</span>
                </p>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={col.histogram} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9, fill: "#6b6b88" }} />
                      <YAxis type="category" dataKey="bucket" tick={{ fontSize: 9, fill: "#a8a8c0" }} width={80} />
                      <Tooltip
                        contentStyle={{ background: "#161625", border: "1px solid #2a2a45", borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: "#f0f0ff" }}
                        itemStyle={{ color: "#a8a8c0" }}
                      />
                      <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                        {col.histogram!.map((_, i) => (
                          <Cell key={i} fill={COLORS[(ci + i) % COLORS.length]} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Null heatmap */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-widest mb-4"
          style={{ color: "var(--color-text-muted)" }}>
          Data Quality — Null Rate per Column
        </h3>
        <div className="rounded-xl p-4"
          style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.columns.map((c) => ({ name: c.name, nullPct: c.nullPct }))}
                margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#6b6b88" }} angle={-40} textAnchor="end" />
                <YAxis tick={{ fontSize: 9, fill: "#6b6b88" }} width={30} domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: "#161625", border: "1px solid #2a2a45", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v}%`, "Null %"]}
                  labelStyle={{ color: "#f0f0ff" }}
                />
                <Bar dataKey="nullPct" radius={[3, 3, 0, 0]}>
                  {summary.columns.map((col, i) => (
                    <Cell key={i}
                      fill={col.nullPct > 20 ? "#ef4444" : col.nullPct > 5 ? "#f59e0b" : "#10b981"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
            <span style={{ color: "#10b981" }}>Green</span> = &lt;5% · <span style={{ color: "#f59e0b" }}>Amber</span> = 5–20% · <span style={{ color: "#ef4444" }}>Red</span> = &gt;20%
          </p>
        </div>
      </div>
    </div>
  );
}
