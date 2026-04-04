"use client";

// Self-contained PDF button — dynamically imported with ssr:false only.
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import type { DatasetSummary } from "@/lib/datalab";

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    paddingTop: 52,
    paddingBottom: 60,
    paddingHorizontal: 52,
    backgroundColor: "#0e0e1a",
    color: "#e0e0f0",
  },
  banner: {
    backgroundColor: "rgba(16,185,129,0.08)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  bannerTag: {
    fontSize: 7,
    color: "#10b981",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  bannerTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#f0f0ff",
    marginBottom: 4,
  },
  bannerSub: { fontSize: 8.5, color: "#6b9b7a", lineHeight: 1.5 },
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  kpiCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "#2a2a45",
    borderRadius: 6,
    padding: 10,
  },
  kpiLabel: { fontSize: 7, color: "#6b6b88", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 },
  kpiValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#10b981" },
  kpiUnit: { fontSize: 8, color: "#6b6b88", marginTop: 2 },
  section: { marginBottom: 14, borderLeftWidth: 3, borderLeftColor: "#10b981", paddingLeft: 10 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#10b981",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  body: { fontSize: 9, lineHeight: 1.7, color: "#c8c8e0" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#2a2a45", marginBottom: 14, marginTop: 2 },
  footer: {
    position: "absolute",
    bottom: 24, left: 52, right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#2a2a45",
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: "#4a4a68" },
  confidential: {
    backgroundColor: "rgba(239,68,68,0.06)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 16,
  },
  confidentialText: {
    fontSize: 7,
    color: "#ef4444",
    textAlign: "center",
    letterSpacing: 1,
    fontFamily: "Helvetica-Bold",
  },
});

function parseSections(text: string): { heading: string; body: string }[] {
  const sections: { heading: string; body: string }[] = [];
  const parts = text.split(/^##\s+/m);
  for (const part of parts) {
    if (!part.trim()) continue;
    const nl = part.indexOf("\n");
    if (nl === -1) {
      sections.push({ heading: part.trim(), body: "" });
    } else {
      sections.push({ heading: part.slice(0, nl).trim(), body: part.slice(nl + 1).trim() });
    }
  }
  return sections;
}

function StakeholderDoc({ report, summary }: { report: string; summary: DatasetSummary }) {
  const date = new Date().toISOString().slice(0, 10);
  const sections = parseSections(report);
  return (
    <Document title={`Executive Brief — ${summary.fileName}`} author="GadaaLabs" creator="GadaaLabs">
      <Page size="A4" style={S.page}>
        <View style={S.confidential}>
          <Text style={S.confidentialText}>CONFIDENTIAL — FOR INTERNAL USE ONLY</Text>
        </View>

        <View style={S.banner}>
          <Text style={S.bannerTag}>Executive Brief</Text>
          <Text style={S.bannerTitle}>{summary.fileName.replace(/\.[^.]+$/, "")}</Text>
          <Text style={S.bannerSub}>Prepared by GadaaLabs AI · {date} · Plain-language summary for leadership</Text>
        </View>

        <View style={S.kpiRow}>
          <View style={S.kpiCard}>
            <Text style={S.kpiLabel}>Records Analysed</Text>
            <Text style={S.kpiValue}>{summary.rowCount.toLocaleString()}</Text>
            <Text style={S.kpiUnit}>rows</Text>
          </View>
          <View style={S.kpiCard}>
            <Text style={S.kpiLabel}>Variables</Text>
            <Text style={S.kpiValue}>{summary.columnCount}</Text>
            <Text style={S.kpiUnit}>columns</Text>
          </View>
          <View style={S.kpiCard}>
            <Text style={S.kpiLabel}>File Size</Text>
            <Text style={S.kpiValue}>{summary.fileSizeKB}</Text>
            <Text style={S.kpiUnit}>KB</Text>
          </View>
          <View style={S.kpiCard}>
            <Text style={S.kpiLabel}>Analysis</Text>
            <Text style={S.kpiValue}>7</Text>
            <Text style={S.kpiUnit}>phases complete</Text>
          </View>
        </View>

        <View style={S.divider} />

        {sections.length > 0 ? (
          sections.map((sec, i) => (
            <View key={i} style={S.section} wrap={false}>
              <Text style={S.sectionTitle}>{sec.heading}</Text>
              {sec.body ? <Text style={S.body}>{sec.body}</Text> : null}
            </View>
          ))
        ) : (
          <View style={S.section}>
            <Text style={S.body}>{report}</Text>
          </View>
        )}

        <View style={S.footer} fixed>
          <Text style={S.footerText}>GadaaLabs — Executive Brief — {summary.fileName}</Text>
          <Text style={S.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

interface Props {
  report: string;
  summary: DatasetSummary;
}

export default function StakeholderReportPDFButton({ report, summary }: Props) {
  const baseName = summary.fileName.replace(/\.[^.]+$/, "");
  return (
    <PDFDownloadLink
      document={<StakeholderDoc report={report} summary={summary} />}
      fileName={`${baseName}_stakeholder_report.pdf`}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
      style={{ background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.45)", color: "#10b981", textDecoration: "none" }}>
      {({ loading }: { loading: boolean }) => (
        <>
          <Download className="h-4 w-4" />
          {loading ? "Building PDF…" : "Download PDF"}
        </>
      )}
    </PDFDownloadLink>
  );
}
