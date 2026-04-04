"use client";

// Self-contained PDF button — dynamically imported with ssr:false only.
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import type { DatasetSummary } from "@/lib/datalab";

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN  = "#10b981";
const PURPLE = "#7c3aed";
const CYAN   = "#06b6d4";
const AMBER  = "#f59e0b";
const RED    = "#ef4444";
const DARK   = "#0e0e1a";
const SURF   = "#12121f";
const BORD   = "#1e1e35";
const TX1    = "#f0f0ff";
const TX2    = "#c8c8e0";
const TX3    = "#6b6b88";

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // Pages
  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: DARK,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  contentPage: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 48,
    backgroundColor: DARK,
    color: TX2,
  },

  // Cover page elements
  coverAccent: {
    height: 6,
    backgroundColor: GREEN,
  },
  coverBody: {
    padding: 52,
    flex: 1,
  },
  coverTag: {
    fontSize: 8,
    color: GREEN,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 32,
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: TX1,
    marginBottom: 8,
    lineHeight: 1.2,
  },
  coverDataset: {
    fontSize: 13,
    color: GREEN,
    fontFamily: "Helvetica-Bold",
    marginBottom: 28,
  },
  coverDivider: {
    borderBottomWidth: 1,
    borderBottomColor: BORD,
    marginBottom: 28,
  },
  coverMeta: {
    fontSize: 9,
    color: TX3,
    lineHeight: 1.8,
  },
  coverMetaHighlight: {
    color: TX2,
    fontFamily: "Helvetica-Bold",
  },
  // KPI row on cover
  coverKpiRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 36,
  },
  coverKpiCard: {
    flex: 1,
    backgroundColor: SURF,
    borderWidth: 1,
    borderColor: BORD,
    borderRadius: 6,
    padding: 12,
  },
  coverKpiLabel: { fontSize: 7, color: TX3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 },
  coverKpiValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: GREEN },
  coverKpiUnit:  { fontSize: 8, color: TX3, marginTop: 2 },
  // Quality bar
  qualityBarWrap: {
    marginTop: 28,
    backgroundColor: SURF,
    borderWidth: 1,
    borderColor: BORD,
    borderRadius: 6,
    padding: 12,
  },
  qualityBarLabel: { fontSize: 8, color: TX3, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  qualityBarTrack: { height: 6, backgroundColor: "#1a1a2e", borderRadius: 3 },
  qualityBarFill:  { height: 6, borderRadius: 3 },
  qualityBarScore: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 5 },
  // Confidential strip on cover
  coverConfidential: {
    marginTop: "auto" as unknown as number,
    backgroundColor: "rgba(239,68,68,0.06)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.18)",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  coverConfidentialText: {
    fontSize: 7,
    color: RED,
    textAlign: "center",
    letterSpacing: 1.5,
    fontFamily: "Helvetica-Bold",
  },

  // Content page sections
  sectionWrap: {
    marginBottom: 16,
    borderRadius: 6,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  sectionIcon: {
    width: 16, height: 16,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIconText: {
    fontSize: 9,
    color: "#fff",
    fontFamily: "Helvetica-Bold",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    flex: 1,
  },
  sectionBody: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingTop: 8,
  },
  body: { fontSize: 9, lineHeight: 1.75, color: TX2 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 22, left: 48, right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: BORD,
    paddingTop: 5,
  },
  footerText: { fontSize: 7, color: TX3 },
  footerBrand: { fontSize: 7, color: TX3, fontFamily: "Helvetica-Bold" },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseSections(text: string): { heading: string; body: string }[] {
  const sections: { heading: string; body: string }[] = [];
  const parts = text.split(/^##\s+/m);
  for (const part of parts) {
    if (!part.trim()) continue;
    const nl = part.indexOf("\n");
    if (nl === -1) { sections.push({ heading: part.trim(), body: "" }); }
    else { sections.push({ heading: part.slice(0, nl).trim(), body: part.slice(nl + 1).trim() }); }
  }
  return sections;
}

// Map heading keywords → accent color + icon letter
function sectionStyle(heading: string): { color: string; bg: string; icon: string } {
  const h = heading.toLowerCase();
  if (h.includes("summary") || h.includes("overview"))
    return { color: GREEN,  bg: "rgba(16,185,129,0.12)",  icon: "S" };
  if (h.includes("opportunit") || h.includes("value") || h.includes("benefit") || h.includes("roi"))
    return { color: CYAN,   bg: "rgba(6,182,212,0.12)",   icon: "O" };
  if (h.includes("risk") || h.includes("concern") || h.includes("challenge") || h.includes("issue"))
    return { color: RED,    bg: "rgba(239,68,68,0.1)",    icon: "R" };
  if (h.includes("action") || h.includes("recommend") || h.includes("next"))
    return { color: AMBER,  bg: "rgba(245,158,11,0.1)",   icon: "A" };
  if (h.includes("decision") || h.includes("conclusion") || h.includes("one thing"))
    return { color: PURPLE, bg: "rgba(124,58,237,0.12)",  icon: "D" };
  if (h.includes("timeline") || h.includes("roadmap") || h.includes("milestone"))
    return { color: "#38bdf8", bg: "rgba(56,189,248,0.1)", icon: "T" };
  return { color: GREEN, bg: "rgba(16,185,129,0.08)", icon: "●" };
}

function computeQuality(summary: DatasetSummary): number {
  const avg  = summary.columns.reduce((s, c) => s + c.nullPct, 0) / (summary.columns.length || 1);
  const crit = summary.columns.filter(c => c.nullPct > 20).length;
  return Math.round(Math.max(0, Math.min(100, 100 - avg * 0.5 - crit * 5)));
}

function qualityColor(score: number): string {
  return score >= 80 ? GREEN : score >= 60 ? AMBER : RED;
}

// ─── Document ─────────────────────────────────────────────────────────────────
function StakeholderDoc({ report, summary }: { report: string; summary: DatasetSummary }) {
  const date    = new Date().toISOString().slice(0, 10);
  const sections = parseSections(report);
  const quality  = computeQuality(summary);
  const qColor   = qualityColor(quality);
  const baseName = summary.fileName.replace(/\.[^.]+$/, "");

  return (
    <Document title={`Executive Brief — ${summary.fileName}`} author="GadaaLabs" creator="GadaaLabs">

      {/* ── Cover Page ── */}
      <Page size="A4" style={S.coverPage}>
        <View style={S.coverAccent} />
        <View style={[S.coverBody, { flexDirection: "column" }]}>
          <Text style={S.coverTag}>Executive Brief · GadaaLabs AI</Text>

          <Text style={S.coverTitle}>Data Intelligence{"\n"}Report</Text>
          <Text style={S.coverDataset}>{baseName}</Text>

          <View style={S.coverDivider} />

          <Text style={S.coverMeta}>
            <Text style={S.coverMetaHighlight}>Prepared by  </Text>GadaaLabs Autonomous AI · 7-Phase Analysis{"\n"}
            <Text style={S.coverMetaHighlight}>Generated    </Text>{date}{"\n"}
            <Text style={S.coverMetaHighlight}>Audience     </Text>Executive leadership · Non-technical stakeholders{"\n"}
            <Text style={S.coverMetaHighlight}>Source file  </Text>{summary.fileName}
          </Text>

          {/* KPI strip */}
          <View style={S.coverKpiRow}>
            <View style={S.coverKpiCard}>
              <Text style={S.coverKpiLabel}>Records</Text>
              <Text style={S.coverKpiValue}>{summary.rowCount.toLocaleString()}</Text>
              <Text style={S.coverKpiUnit}>rows analysed</Text>
            </View>
            <View style={S.coverKpiCard}>
              <Text style={S.coverKpiLabel}>Variables</Text>
              <Text style={S.coverKpiValue}>{summary.columnCount}</Text>
              <Text style={S.coverKpiUnit}>data columns</Text>
            </View>
            <View style={S.coverKpiCard}>
              <Text style={S.coverKpiLabel}>Quality</Text>
              <Text style={[S.coverKpiValue, { color: qColor }]}>{quality}/100</Text>
              <Text style={S.coverKpiUnit}>{quality >= 80 ? "production ready" : quality >= 60 ? "needs prep" : "requires cleaning"}</Text>
            </View>
            <View style={S.coverKpiCard}>
              <Text style={S.coverKpiLabel}>Phases</Text>
              <Text style={S.coverKpiValue}>7</Text>
              <Text style={S.coverKpiUnit}>complete</Text>
            </View>
          </View>

          {/* Quality bar */}
          <View style={S.qualityBarWrap}>
            <Text style={S.qualityBarLabel}>Data Quality Score</Text>
            <View style={S.qualityBarTrack}>
              <View style={[S.qualityBarFill, { width: `${quality}%`, backgroundColor: qColor }]} />
            </View>
            <Text style={[S.qualityBarScore, { color: qColor }]}>
              {quality}/100 — {quality >= 80 ? "Production ready. Minimal preprocessing needed." : quality >= 60 ? "Usable with targeted imputation and cleaning." : "Significant preparation required before modelling."}
            </Text>
          </View>

          {/* Confidential */}
          <View style={S.coverConfidential}>
            <Text style={S.coverConfidentialText}>CONFIDENTIAL — FOR INTERNAL USE ONLY</Text>
          </View>
        </View>
      </Page>

      {/* ── Content Pages ── */}
      <Page size="A4" style={S.contentPage}>
        {sections.length > 0 ? sections.map((sec, i) => {
          const { color, bg, icon } = sectionStyle(sec.heading);
          return (
            <View key={i} style={[S.sectionWrap, { borderWidth: 1, borderColor: BORD }]} wrap={false}>
              <View style={[S.sectionHeader, { backgroundColor: bg }]}>
                <View style={[S.sectionIcon, { backgroundColor: color }]}>
                  <Text style={S.sectionIconText}>{icon}</Text>
                </View>
                <Text style={[S.sectionTitle, { color }]}>{sec.heading}</Text>
              </View>
              {sec.body ? (
                <View style={S.sectionBody}>
                  <Text style={S.body}>{sec.body}</Text>
                </View>
              ) : null}
            </View>
          );
        }) : (
          <View style={[S.sectionWrap, { borderWidth: 1, borderColor: BORD }]}>
            <View style={[S.sectionHeader, { backgroundColor: "rgba(16,185,129,0.08)" }]}>
              <View style={[S.sectionIcon, { backgroundColor: GREEN }]}>
                <Text style={S.sectionIconText}>S</Text>
              </View>
              <Text style={[S.sectionTitle, { color: GREEN }]}>Executive Brief</Text>
            </View>
            <View style={S.sectionBody}>
              <Text style={S.body}>{report}</Text>
            </View>
          </View>
        )}

        <View style={S.footer} fixed>
          <Text style={S.footerBrand}>GadaaLabs</Text>
          <Text style={S.footerText}>Executive Brief — {baseName}</Text>
          <Text style={S.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
interface Props { report: string; summary: DatasetSummary }

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
