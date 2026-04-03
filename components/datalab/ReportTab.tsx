"use client";
import type { DatasetSummary } from "@/lib/datalab";

const TX1 = "#e8edf5", TX2 = "#9ba8bc", TX3 = "#5c6a80";
const VIOLET = "#8b5cf6", CYAN = "#22d3ee", GREEN = "#34d399";
const AMBER = "#fbbf24", ROSE = "#fb7185", BORDER = "rgba(255,255,255,0.07)";

interface Props {
  summary: DatasetSummary;
  findings?: string[];
  qualityScore?: number;
  recommendations?: string[];
  analysisComplete: boolean;
}

function KPICard({
  label, value, color = CYAN,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div style={{
      background: "#0c0c18", border: `1px solid ${BORDER}`,
      borderRadius: 12, padding: "14px 16px", textAlign: "center",
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: TX3, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function buildMarkdown(
  summary: DatasetSummary,
  findings: string[],
  qualityScore: number,
  recommendations: string[],
): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const lines: string[] = [
    `# DataLab Report — ${summary.fileName}`,
    `_Generated ${date}_`,
    "",
    "## Dataset at a Glance",
    "| Metric | Value |",
    "|--------|-------|",
    `| Records | ${summary.rowCount.toLocaleString()} |`,
    `| Features | ${summary.columnCount} |`,
    `| Quality Score | ${qualityScore}/100 |`,
    `| Insights Generated | ${findings.length} |`,
    "",
    "## Key Findings",
    ...findings.map((f) => `- ${f}`),
    "",
    "## Data Quality",
  ];

  const nullCols = summary.columns.filter((c) => c.nullPct > 0);
  if (nullCols.length === 0) {
    lines.push("No missing values detected. Dataset is complete.");
  } else {
    lines.push("| Column | Null % | Severity |");
    lines.push("|--------|--------|----------|");
    for (const c of nullCols) {
      const severity = c.nullPct > 20 ? "High" : c.nullPct > 5 ? "Medium" : "Low";
      lines.push(`| ${c.name} | ${c.nullPct}% | ${severity} |`);
    }
  }

  if (recommendations.length > 0) {
    lines.push("", "## Next Steps");
    recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
  }

  return lines.join("\n");
}

export function ReportTab({
  summary, findings = [], qualityScore = 0,
  recommendations = [], analysisComplete: _analysisComplete,
}: Props) {
  const defaultFindings: string[] = [
    `Dataset contains ${summary.rowCount.toLocaleString()} records across ${summary.columnCount} columns.`,
    `${summary.columns.filter((c) => c.type === "numeric").length} numeric and ${summary.columns.filter((c) => c.type === "categorical").length} categorical features detected.`,
    summary.recommendedPairs.length > 0
      ? `Strongest correlation: ${summary.recommendedPairs[0].col1} × ${summary.recommendedPairs[0].col2} (r = ${summary.recommendedPairs[0].r}).`
      : "No strong linear correlations detected between numeric features.",
    `${summary.columns.filter((c) => c.nullPct > 0).length} columns have missing values — review Missing Data tab for details.`,
    `${summary.columns.filter((c) => (c.outlierCount ?? 0) > 0).length} columns contain outliers detected via IQR method.`,
  ];

  const defaultRecs: string[] = [
    "Address missing values before modeling — see Preprocessing tab for recommended imputation strategy.",
    "Investigate outlier columns — consider capping or log-transforming skewed features.",
    "Run the DS Workflow tab to get model recommendations tailored to this dataset.",
  ];

  const activeFindings = findings.length > 0 ? findings : defaultFindings;
  const activeRecs = recommendations.length > 0 ? recommendations : defaultRecs;

  function handlePrint() { window.print(); }

  function handleCopyMarkdown() {
    const md = buildMarkdown(summary, activeFindings, qualityScore, activeRecs);
    void navigator.clipboard.writeText(md);
  }

  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div>
      {/* Report header */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: TX1, margin: 0 }}>
            DataLab Report
          </h2>
          <p style={{ fontSize: 11, color: TX3, margin: "2px 0 0" }}>
            {summary.fileName} · {date}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleCopyMarkdown}
            style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
              background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)",
              color: VIOLET }}
          >
            Copy Markdown
          </button>
          <button
            onClick={handlePrint}
            style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
              background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)",
              color: CYAN }}
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: 10, marginBottom: 20 }}>
        <KPICard label="Records" value={summary.rowCount.toLocaleString()} color={CYAN} />
        <KPICard label="Features" value={summary.columnCount} color={VIOLET} />
        <KPICard
          label="Quality Score"
          value={`${qualityScore}/100`}
          color={qualityScore >= 80 ? GREEN : qualityScore >= 60 ? AMBER : ROSE}
        />
        <KPICard label="AI Insights" value={activeFindings.length} color={GREEN} />
      </div>

      {/* Key Findings */}
      <div style={{ background: "#0c0c18", border: `1px solid ${BORDER}`,
        borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const,
          letterSpacing: "0.1em", color: TX3, marginBottom: 12 }}>Key Findings</h3>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {activeFindings.map((f, i) => (
            <li key={i} style={{
              display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0",
              borderBottom: i < activeFindings.length - 1 ? `1px solid ${BORDER}` : "none",
            }}>
              <span style={{ color: CYAN, flexShrink: 0, marginTop: 1 }}>▸</span>
              <span style={{ fontSize: 13, color: TX2, lineHeight: 1.6 }}>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Next Steps */}
      <div style={{ background: "#0c0c18", border: `1px solid ${BORDER}`,
        borderRadius: 14, padding: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const,
          letterSpacing: "0.1em", color: TX3, marginBottom: 12 }}>Next Steps</h3>
        <ol style={{ margin: 0, padding: "0 0 0 20px" }}>
          {activeRecs.map((r, i) => (
            <li key={i} style={{ fontSize: 13, color: TX2, lineHeight: 1.6, padding: "4px 0" }}>
              {r}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
