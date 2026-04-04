"use client";

// Self-contained PDF button — dynamically imported with ssr:false only.
// @react-pdf/renderer must NEVER appear in a statically-analyzed import chain.
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import type { DatasetSummary } from "@/lib/datalab";

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    backgroundColor: "#0e0e1a",
    color: "#e0e0f0",
  },
  header: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a45",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#a78bfa",
    marginBottom: 6,
  },
  headerMeta: { fontSize: 8, color: "#6b6b88", lineHeight: 1.5 },
  badge: {
    fontSize: 7,
    color: "#a78bfa",
    backgroundColor: "rgba(124,58,237,0.15)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.3)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  section: {
    marginBottom: 16,
    borderLeftWidth: 3,
    paddingLeft: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  body: { fontSize: 8.5, lineHeight: 1.65, color: "#c8c8e0" },
  code: {
    fontFamily: "Courier",
    fontSize: 7.5,
    lineHeight: 1.5,
    color: "#a8d8a8",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 8,
    borderRadius: 4,
  },
  table: { marginBottom: 4 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a45",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(42,42,69,0.5)",
  },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#6b6b88", textTransform: "uppercase", letterSpacing: 0.3 },
  td: { fontSize: 8, color: "#c8c8e0" },
  tdMono: { fontFamily: "Courier", fontSize: 7.5, color: "#a8d8a8" },
  col0: { width: "24%" },
  col1: { width: "14%" },
  col2: { width: "14%" },
  col3: { width: "14%" },
  col4: { width: "34%" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#2a2a45", marginBottom: 14, marginTop: 2 },
  footer: {
    position: "absolute",
    bottom: 24, left: 48, right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#2a2a45",
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: "#4a4a68" },
});

const PHASES = [
  { id: "triage",     label: "Phase 1 — Triage",                color: "#f59e0b" },
  { id: "stats",      label: "Phase 2 — Statistical Analysis",  color: "#06b6d4" },
  { id: "hypotheses", label: "Phase 3 — Hypothesis Engine",     color: "#f472b6" },
  { id: "strategy",   label: "Phase 4 — ML Battle Plan",        color: "#a78bfa" },
  { id: "code",       label: "Phase 5 — Production Code",       color: "#67e8f9" },
  { id: "business",   label: "Phase 6 — Business Intelligence", color: "#34d399" },
  { id: "decision",   label: "Phase 7 — Decision Brief",        color: "#c4b5fd" },
];

function nullColor(pct: number) {
  return pct > 20 ? "#ef4444" : pct > 5 ? "#f59e0b" : "#10b981";
}

function TechReportDoc({ outputs, summary }: { outputs: Record<string, string>; summary: DatasetSummary }) {
  const date = new Date().toISOString().slice(0, 10);
  return (
    <Document title={`Technical Report — ${summary.fileName}`} author="GadaaLabs" creator="GadaaLabs">
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <Text style={S.headerTitle}>Technical Data Science Report</Text>
          <Text style={S.headerMeta}>
            Dataset: {summary.fileName}{"   "}·{"   "}
            {summary.rowCount.toLocaleString()} rows{"   "}·{"   "}
            {summary.columnCount} columns{"   "}·{"   "}
            {summary.fileSizeKB} KB{"   "}·{"   "}
            Generated: {date}
          </Text>
          <Text style={S.badge}>GadaaLabs · 7-Phase Autonomous Pipeline</Text>
        </View>

        <View style={[S.section, { borderLeftColor: "#7c3aed" }]}>
          <Text style={[S.sectionTitle, { color: "#a78bfa" }]}>Dataset Schema</Text>
          <View style={S.table}>
            <View style={S.tableHeader}>
              <Text style={[S.th, S.col0]}>Column</Text>
              <Text style={[S.th, S.col1]}>Type</Text>
              <Text style={[S.th, S.col2]}>Non-null</Text>
              <Text style={[S.th, S.col3]}>Unique</Text>
              <Text style={[S.th, S.col4]}>Mean / Top Value</Text>
            </View>
            {summary.columns.map((c) => {
              const val = c.type === "numeric"
                ? (c.mean !== undefined ? c.mean.toFixed(4) : "—")
                : (c.topValues?.[0]?.value ?? "—");
              return (
                <View key={c.name} style={S.tableRow}>
                  <Text style={[S.tdMono, S.col0]}>{c.name}</Text>
                  <Text style={[S.td, S.col1]}>{c.type}</Text>
                  <Text style={[S.td, S.col2, { color: nullColor(c.nullPct) }]}>{(100 - c.nullPct).toFixed(1)}%</Text>
                  <Text style={[S.td, S.col3]}>{c.unique.toLocaleString()}</Text>
                  <Text style={[S.tdMono, S.col4]}>{val}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={S.divider} />

        {PHASES.map((phase) => {
          const out = outputs[phase.id];
          if (!out) return null;
          return (
            <View key={phase.id} style={[S.section, { borderLeftColor: phase.color }]} wrap={false}>
              <Text style={[S.sectionTitle, { color: phase.color }]}>{phase.label}</Text>
              <Text style={phase.id === "code" ? S.code : S.body}>{out}</Text>
            </View>
          );
        })}

        <View style={S.footer} fixed>
          <Text style={S.footerText}>GadaaLabs — Technical Report — {summary.fileName}</Text>
          <Text style={S.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

interface Props {
  outputs: Record<string, string>;
  summary: DatasetSummary;
}

export default function TechReportPDFButton({ outputs, summary }: Props) {
  const baseName = summary.fileName.replace(/\.[^.]+$/, "");
  return (
    <PDFDownloadLink
      document={<TechReportDoc outputs={outputs} summary={summary} />}
      fileName={`${baseName}_technical_report.pdf`}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
      style={{ background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.45)", color: "var(--color-purple-400)", textDecoration: "none" }}>
      {({ loading }: { loading: boolean }) => (
        <>
          <Download className="h-4 w-4" />
          {loading ? "Building PDF…" : "Download PDF"}
        </>
      )}
    </PDFDownloadLink>
  );
}
