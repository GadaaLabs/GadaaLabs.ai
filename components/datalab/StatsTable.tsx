"use client";

import type { DatasetSummary, ColumnStats } from "@/lib/datalab";

const typeColor: Record<ColumnStats["type"], { color: string; bg: string }> = {
  numeric:     { color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
  categorical: { color: "#a78bfa", bg: "rgba(124,58,237,0.12)" },
  datetime:    { color: "#34d399", bg: "rgba(16,185,129,0.12)" },
  boolean:     { color: "#fbbf24", bg: "rgba(245,158,11,0.12)" },
  mixed:       { color: "#f87171", bg: "rgba(239,68,68,0.12)" },
};

export function StatsTable({ summary }: { summary: DatasetSummary }) {
  return (
    <div>
      {/* Overview row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Rows", value: summary.rowCount.toLocaleString() },
          { label: "Columns", value: summary.columnCount },
          { label: "File size", value: `${summary.fileSizeKB} KB` },
          { label: "File", value: summary.fileName.length > 20 ? summary.fileName.slice(0, 18) + "…" : summary.fileName },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4 text-center"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
            <div className="text-xl font-bold gradient-text">{s.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Column stats table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border-default)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-default)" }}>
                {["Column", "Type", "Null %", "Unique", "Min", "Max", "Mean / Top values"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.columns.map((col, i) => {
                const tc = typeColor[col.type];
                return (
                  <tr key={col.name} style={{
                    background: i % 2 === 0 ? "var(--color-bg-surface)" : "var(--color-bg-elevated)",
                    borderTop: "1px solid var(--color-border-subtle)",
                  }}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {col.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{ background: tc.bg, color: tc.color }}>
                        {col.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs"
                      style={{ color: col.nullPct > 20 ? "var(--color-error)" : col.nullPct > 5 ? "var(--color-warning)" : "var(--color-text-secondary)" }}>
                      {col.nullPct}%
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {col.unique.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--color-text-secondary)" }}>
                      {col.min ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--color-text-secondary)" }}>
                      {col.max ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {col.type === "numeric"
                        ? `μ=${col.mean} σ=${col.std}`
                        : col.topValues?.slice(0, 3).map((t) => `"${t.value}"`).join(", ") ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
