"use client";
import { useState } from "react";
import type { DatasetSummary } from "@/lib/datalab";

const TX1 = "#e8edf5", TX2 = "#9ba8bc", TX3 = "#5c6a80";
const VIOLET = "#8b5cf6", CYAN = "#22d3ee", GREEN = "#34d399";
const AMBER = "#fbbf24", ROSE = "#fb7185", BORDER = "rgba(255,255,255,0.07)";
const BG2 = "#0c0c18";

interface Props {
  summary: DatasetSummary;
  findings?: string[];
  qualityScore?: number;
  recommendations?: string[];
  technicalAnalysis?: string;   // raw markdown from the analyze agent
  agentOutputs?: Record<string, string>;
}

function KPICard({ label, value, color = CYAN }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: TX3, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: TX3, marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  );
}

// ── Technical Report ─────────────────────────────────────────────────────────

function TechnicalReport({ summary, qualityScore, technicalAnalysis, agentOutputs = {} }: {
  summary: DatasetSummary;
  qualityScore: number;
  technicalAnalysis?: string;
  agentOutputs?: Record<string, string>;
}) {
  const numericCols = summary.columns.filter((c) => c.type === "numeric");
  const catCols = summary.columns.filter((c) => c.type === "categorical" || c.type === "boolean");
  const nullCols = summary.columns.filter((c) => c.nullPct > 0);
  const outlierCols = numericCols.filter((c) => (c.outlierCount ?? 0) > 0);

  return (
    <div>
      {/* Data Quality */}
      <Section title="Data Quality Assessment">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: `conic-gradient(${qualityScore >= 80 ? GREEN : qualityScore >= 60 ? AMBER : ROSE} ${qualityScore * 3.6}deg, rgba(255,255,255,0.05) 0deg)` }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: BG2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: qualityScore >= 80 ? GREEN : qualityScore >= 60 ? AMBER : ROSE }}>{qualityScore}</span>
            </div>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: TX1, fontWeight: 600 }}>
              Quality Score: {qualityScore >= 80 ? "Good" : qualityScore >= 60 ? "Fair" : "Poor"}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: TX3 }}>
              {nullCols.length} columns with nulls · {outlierCols.length} columns with outliers
            </p>
          </div>
        </div>
        {nullCols.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Column", "Type", "Null %", "Severity", "Recommendation"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "4px 8px", color: TX3, fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nullCols.map((c) => {
                const sev = c.nullPct > 30 ? "Critical" : c.nullPct > 10 ? "Warning" : "Info";
                const sevColor = sev === "Critical" ? ROSE : sev === "Warning" ? AMBER : TX3;
                const rec = c.nullPct > 30 ? "Consider dropping or indicator feature" : c.type === "numeric" ? "Median imputation" : "Mode imputation";
                return (
                  <tr key={c.name}>
                    <td style={{ padding: "5px 8px", color: TX1, fontFamily: "monospace", fontSize: 11 }}>{c.name}</td>
                    <td style={{ padding: "5px 8px", color: TX3, fontSize: 11 }}>{c.type}</td>
                    <td style={{ padding: "5px 8px", color: sevColor, fontWeight: 600 }}>{c.nullPct}%</td>
                    <td style={{ padding: "5px 8px" }}>
                      <span style={{ fontSize: 10, color: sevColor, background: `${sevColor}18`, border: `1px solid ${sevColor}40`, borderRadius: 10, padding: "1px 6px" }}>{sev}</span>
                    </td>
                    <td style={{ padding: "5px 8px", color: TX2, fontSize: 11 }}>{rec}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {nullCols.length === 0 && <p style={{ margin: 0, fontSize: 12, color: GREEN }}>✓ No missing values detected. Dataset is complete.</p>}
      </Section>

      {/* Column Statistics */}
      <Section title={`Column Statistics (${numericCols.length} numeric · ${catCols.length} categorical)`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                {["Column", "Type", "Unique", "Null%", "Min", "Mean", "Median", "Max", "Std", "Skew", "Shape", "Outliers"].map((h) => (
                  <th key={h} style={{ textAlign: "right", padding: "4px 8px", color: TX3, fontWeight: 600, borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}
                    >{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.columns.map((c) => (
                <tr key={c.name} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
                  <td style={{ padding: "5px 8px", color: TX1, fontFamily: "monospace", textAlign: "left", whiteSpace: "nowrap" }}>{c.name}</td>
                  <td style={{ padding: "5px 8px", color: TX3, textAlign: "right" }}>{c.type}</td>
                  <td style={{ padding: "5px 8px", color: TX2, textAlign: "right" }}>{c.unique}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", color: c.nullPct > 10 ? AMBER : TX2 }}>{c.nullPct}%</td>
                  <td style={{ padding: "5px 8px", color: TX3, textAlign: "right" }}>{c.min ?? "—"}</td>
                  <td style={{ padding: "5px 8px", color: CYAN, textAlign: "right" }}>{c.mean ?? "—"}</td>
                  <td style={{ padding: "5px 8px", color: VIOLET, textAlign: "right" }}>{c.p50 ?? "—"}</td>
                  <td style={{ padding: "5px 8px", color: TX3, textAlign: "right" }}>{c.max ?? "—"}</td>
                  <td style={{ padding: "5px 8px", color: TX3, textAlign: "right" }}>{c.std ?? "—"}</td>
                  <td style={{ padding: "5px 8px", color: TX3, textAlign: "right" }}>{c.skewness !== undefined ? c.skewness.toFixed(2) : "—"}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>
                    {c.distributionShape ? (
                      <span style={{ fontSize: 9, color: TX3, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "1px 5px" }}>{c.distributionShape}</span>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "5px 8px", textAlign: "right", color: (c.outlierCount ?? 0) > 0 ? ROSE : TX3 }}>
                    {c.outlierCount ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Correlation Summary */}
      {summary.recommendedPairs.length > 0 && (
        <Section title="Strong Correlations">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Column A", "Column B", "r", "Strength", "Direction"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "4px 8px", color: TX3, fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.recommendedPairs.map((p) => {
                const abs = Math.abs(p.r);
                const strength = abs > 0.7 ? "Strong" : abs > 0.4 ? "Moderate" : "Weak";
                const dir = p.r > 0 ? "Positive" : "Negative";
                const c = abs > 0.7 ? VIOLET : abs > 0.4 ? CYAN : TX3;
                return (
                  <tr key={`${p.col1}_${p.col2}`}>
                    <td style={{ padding: "5px 8px", color: TX1, fontFamily: "monospace", fontSize: 11 }}>{p.col1}</td>
                    <td style={{ padding: "5px 8px", color: TX1, fontFamily: "monospace", fontSize: 11 }}>{p.col2}</td>
                    <td style={{ padding: "5px 8px", color: c, fontWeight: 700 }}>{p.r.toFixed(3)}</td>
                    <td style={{ padding: "5px 8px", color: c }}>{strength}</td>
                    <td style={{ padding: "5px 8px", color: p.r > 0 ? GREEN : ROSE }}>{dir}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {/* Technical analysis from AI */}
      {technicalAnalysis && (
        <Section title="AI Technical Analysis">
          <pre style={{ margin: 0, fontSize: 11, color: TX2, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
            {technicalAnalysis}
          </pre>
        </Section>
      )}

      {/* Agent outputs */}
      {Object.entries(agentOutputs).filter(([, v]) => v).map(([agentId, output]) => (
        <Section key={agentId} title={`${agentId.replace(/-/g, " ")} analysis`}>
          <pre style={{ margin: 0, fontSize: 11, color: TX2, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
            {output}
          </pre>
        </Section>
      ))}
    </div>
  );
}

// ── Stakeholder Report ───────────────────────────────────────────────────────

function buildMarkdown(summary: DatasetSummary, findings: string[], qualityScore: number, recommendations: string[]): string {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const nullCols = summary.columns.filter((c) => c.nullPct > 0);
  const lines = [
    `# DataLab Stakeholder Report — ${summary.fileName}`,
    `_Generated ${date} by GadaaLabs DataLab_`,
    "",
    "## Dataset at a Glance",
    `| Records | Features | Quality Score |`,
    `|---------|----------|---------------|`,
    `| ${summary.rowCount.toLocaleString()} | ${summary.columnCount} | ${qualityScore}/100 |`,
    "",
    "## Key Findings",
    ...findings.map((f) => `- ${f}`),
    "",
    "## Data Quality Summary",
    nullCols.length === 0 ? "No missing values detected." : (
      nullCols.map((c) => `- **${c.name}**: ${c.nullPct}% missing — ${c.nullPct > 30 ? "Critical" : c.nullPct > 10 ? "Warning" : "Low"}`).join("\n")
    ),
    "",
    "## Recommended Next Steps",
    ...recommendations.map((r, i) => `${i + 1}. ${r}`),
    "",
    "---",
    "_Report generated by GadaaLabs DataLab · gadaalabs.com_",
  ];
  return lines.join("\n");
}

function StakeholderReport({ summary, findings, qualityScore, recommendations, onPrint, onCopy }: {
  summary: DatasetSummary;
  findings: string[];
  qualityScore: number;
  recommendations: string[];
  onPrint: () => void;
  onCopy: () => void;
}) {
  const numCols = summary.columns.filter((c) => c.type === "numeric").length;
  const catCols = summary.columns.filter((c) => c.type === "categorical" || c.type === "boolean").length;

  return (
    <div>
      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        <KPICard label="Records" value={summary.rowCount.toLocaleString()} color={CYAN} />
        <KPICard label="Features" value={summary.columnCount} color={VIOLET} />
        <KPICard label="Quality Score" value={`${qualityScore}/100`}
          color={qualityScore >= 80 ? GREEN : qualityScore >= 60 ? AMBER : ROSE} />
        <KPICard label="AI Insights" value={findings.length} color={GREEN} />
      </div>

      {/* Dataset summary */}
      <Section title="Dataset Overview">
        <p style={{ margin: 0, fontSize: 13, color: TX2, lineHeight: 1.8 }}>
          <strong style={{ color: TX1 }}>{summary.fileName}</strong> contains{" "}
          <strong style={{ color: CYAN }}>{summary.rowCount.toLocaleString()} records</strong> with{" "}
          <strong style={{ color: VIOLET }}>{summary.columnCount} features</strong> ({numCols} numeric, {catCols} categorical).
          {summary.recommendedPairs.length > 0 && (
            <> The strongest relationship in this dataset is between{" "}
              <strong style={{ color: TX1 }}>{summary.recommendedPairs[0].col1}</strong> and{" "}
              <strong style={{ color: TX1 }}>{summary.recommendedPairs[0].col2}</strong>{" "}
              (correlation r = {summary.recommendedPairs[0].r}).</>
          )}
        </p>
      </Section>

      {/* Key Findings */}
      <Section title="Key Findings">
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {findings.map((f, i) => (
            <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0",
              borderBottom: i < findings.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <span style={{ color: CYAN, flexShrink: 0, marginTop: 1 }}>▸</span>
              <span style={{ fontSize: 13, color: TX2, lineHeight: 1.6 }}>{f}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Data Quality summary for non-technical audience */}
      <Section title="Data Health">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Complete records", value: `${Math.round((1 - summary.columns.filter(c => c.nullPct > 0).length / summary.columnCount) * 100)}%`, color: GREEN },
            { label: "Columns with gaps", value: summary.columns.filter((c) => c.nullPct > 0).length, color: AMBER },
            { label: "Columns with outliers", value: summary.columns.filter((c) => (c.outlierCount ?? 0) > 0).length, color: ROSE },
            { label: "Correlated pairs", value: summary.recommendedPairs.length, color: VIOLET },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: "1 1 120px", background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`,
              borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 10, color: TX3, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Recommended next steps */}
      <Section title="Recommended Next Steps">
        <ol style={{ margin: 0, padding: "0 0 0 20px" }}>
          {recommendations.map((r, i) => (
            <li key={i} style={{ fontSize: 13, color: TX2, lineHeight: 1.8, padding: "3px 0" }}>{r}</li>
          ))}
        </ol>
      </Section>

      {/* Export buttons */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button onClick={onCopy}
          style={{ fontSize: 11, padding: "7px 14px", borderRadius: 8, cursor: "pointer",
            background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: VIOLET }}>
          Copy Markdown
        </button>
        <button onClick={onPrint}
          style={{ fontSize: 11, padding: "7px 14px", borderRadius: 8, cursor: "pointer",
            background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)", color: CYAN }}>
          Export PDF
        </button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function ReportTab({ summary, findings = [], qualityScore = 0, recommendations = [], technicalAnalysis, agentOutputs }: Props) {
  const [tab, setTab] = useState<"technical" | "stakeholder">("stakeholder");

  const defaultFindings: string[] = [
    `Dataset contains ${summary.rowCount.toLocaleString()} records across ${summary.columnCount} columns.`,
    `${summary.columns.filter((c) => c.type === "numeric").length} numeric and ${summary.columns.filter((c) => c.type === "categorical").length} categorical features detected.`,
    summary.recommendedPairs.length > 0
      ? `Strongest correlation: ${summary.recommendedPairs[0].col1} × ${summary.recommendedPairs[0].col2} (r = ${summary.recommendedPairs[0].r}).`
      : "No strong linear correlations detected between numeric features.",
    `${summary.columns.filter((c) => c.nullPct > 0).length} columns have missing values — review the Technical tab for remediation details.`,
    `${summary.columns.filter((c) => (c.outlierCount ?? 0) > 0).length} columns contain outliers detected via the IQR method.`,
  ];

  const defaultRecs: string[] = [
    "Address missing values before modeling — imputation strategies are detailed in the Technical tab.",
    "Investigate and handle outlier columns to reduce noise before training.",
    "Run the DS Workflow tab for automated model selection and code generation.",
  ];

  const activeFindings = findings.length > 0 ? findings : defaultFindings;
  const activeRecs = recommendations.length > 0 ? recommendations : defaultRecs;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: TX1, margin: 0 }}>Analysis Report</h2>
          <p style={{ fontSize: 11, color: TX3, margin: "2px 0 0" }}>{summary.fileName}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", borderRadius: 10,
        padding: 4, marginBottom: 20, width: "fit-content" }}>
        {([
          { id: "stakeholder" as const, label: "Stakeholder Report" },
          { id: "technical" as const, label: "Technical Insights" },
        ]).map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", border: "none",
              background: tab === id ? "rgba(139,92,246,0.2)" : "transparent",
              color: tab === id ? VIOLET : TX3 }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "stakeholder" && (
        <StakeholderReport
          summary={summary}
          findings={activeFindings}
          qualityScore={qualityScore}
          recommendations={activeRecs}
          onPrint={() => window.print()}
          onCopy={() => void navigator.clipboard.writeText(buildMarkdown(summary, activeFindings, qualityScore, activeRecs))}
        />
      )}
      {tab === "technical" && (
        <TechnicalReport
          summary={summary}
          qualityScore={qualityScore}
          technicalAnalysis={technicalAnalysis}
          agentOutputs={agentOutputs}
        />
      )}
    </div>
  );
}
