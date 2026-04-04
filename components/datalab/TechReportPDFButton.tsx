"use client";

// Self-contained PDF button — dynamically imported with ssr:false only.
// @react-pdf/renderer must NEVER appear in a statically-analyzed import chain.
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import type { DatasetSummary } from "@/lib/datalab";

// ─── Styles ───────────────────────────────────────────────────────────────────
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a45",
  },
  headerTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#a78bfa", marginBottom: 6 },
  headerMeta: { fontSize: 8, color: "#6b6b88", lineHeight: 1.6 },
  badge: {
    fontSize: 7, color: "#a78bfa",
    backgroundColor: "rgba(124,58,237,0.15)",
    borderWidth: 1, borderColor: "rgba(124,58,237,0.3)",
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
    marginTop: 5, alignSelf: "flex-start",
  },
  section: { marginBottom: 16, borderLeftWidth: 3, paddingLeft: 10 },
  sectionTitle: {
    fontSize: 10, fontFamily: "Helvetica-Bold",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5,
  },
  body: { fontSize: 8.5, lineHeight: 1.65, color: "#c8c8e0" },
  // Code block — dark panel with line numbers
  codeBlock: {
    backgroundColor: "#080812",
    borderWidth: 1, borderColor: "#1e1e35",
    borderRadius: 5, padding: 10,
    marginTop: 2,
  },
  codeLine: { flexDirection: "row", marginBottom: 1 },
  codeLineNum: { fontFamily: "Courier", fontSize: 7, color: "#3a3a5a", width: 22, textAlign: "right", marginRight: 8 },
  codeText: { fontFamily: "Courier", fontSize: 7.5, lineHeight: 1.5, flex: 1 },
  // Schema table
  table: { marginBottom: 4 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#2a2a45", paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: "rgba(42,42,69,0.5)" },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#6b6b88", textTransform: "uppercase", letterSpacing: 0.3 },
  td: { fontSize: 8, color: "#c8c8e0" },
  tdMono: { fontFamily: "Courier", fontSize: 7.5, color: "#a8d8a8" },
  col0: { width: "24%" }, col1: { width: "14%" }, col2: { width: "14%" }, col3: { width: "14%" }, col4: { width: "34%" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#2a2a45", marginBottom: 14, marginTop: 2 },
  footer: {
    position: "absolute", bottom: 24, left: 48, right: 48,
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: "#2a2a45", paddingTop: 6,
  },
  footerText: { fontSize: 7, color: "#4a4a68" },
});

// ─── Python syntax tokenizer ──────────────────────────────────────────────────
const KW_COLOR  = "#c792ea"; // purple  — keywords
const STR_COLOR = "#c3e88d"; // green   — strings
const CMT_COLOR = "#546e7a"; // grey    — comments
const NUM_COLOR = "#f78c6c"; // orange  — numbers
const BLT_COLOR = "#82aaff"; // blue    — builtins/functions
const OP_COLOR  = "#89ddff"; // cyan    — operators / punctuation
const DEF_COLOR = "#d4d4f0"; // default

const KEYWORDS = new Set([
  "def","class","import","from","if","else","elif","for","while","return",
  "with","as","try","except","finally","in","not","and","or","is","None",
  "True","False","lambda","yield","pass","break","continue","raise",
  "global","nonlocal","del","assert","async","await",
]);
const BUILTINS = new Set([
  "print","len","range","list","dict","set","tuple","str","int","float",
  "bool","type","isinstance","enumerate","zip","map","filter","sorted",
  "sum","min","max","open","hasattr","getattr","setattr","super","property",
  "pd","np","sklearn","model","df","train","test","X","y","fit","predict",
  "transform","pipeline","Pipeline","StandardScaler","LabelEncoder",
]);

type Token = { text: string; color: string };

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const push = (text: string, color: string) => { if (text) tokens.push({ text, color }); };

  while (i < line.length) {
    // Comment
    if (line[i] === "#") { push(line.slice(i), CMT_COLOR); break; }

    // Triple-quoted string (simplified: treat as single-line chunk)
    if (line.slice(i, i + 3) === '"""' || line.slice(i, i + 3) === "'''") {
      const q = line.slice(i, i + 3);
      const end = line.indexOf(q, i + 3);
      if (end !== -1) { push(line.slice(i, end + 3), STR_COLOR); i = end + 3; continue; }
      push(line.slice(i), STR_COLOR); break;
    }

    // Single / double quoted string
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== q) { if (line[j] === "\\") j++; j++; }
      push(line.slice(i, j + 1), STR_COLOR); i = j + 1; continue;
    }

    // Number
    if (/[0-9]/.test(line[i]) && (i === 0 || /\W/.test(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[0-9._xXbBoO]/.test(line[j])) j++;
      push(line.slice(i, j), NUM_COLOR); i = j; continue;
    }

    // Identifier / keyword / builtin
    if (/[a-zA-Z_]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);
      const color = KEYWORDS.has(word) ? KW_COLOR : BUILTINS.has(word) ? BLT_COLOR : DEF_COLOR;
      push(word, color); i = j; continue;
    }

    // Operators and punctuation
    if (/[=+\-*/<>!&|^%~@,.:;()[\]{}]/.test(line[i])) {
      push(line[i], OP_COLOR); i++; continue;
    }

    push(line[i], DEF_COLOR); i++;
  }
  return tokens;
}

function CodeSection({ code, color }: { code: string; color: string }) {
  const lines = code.split("\n").slice(0, 300); // cap at 300 lines for PDF size
  return (
    <View style={[S.section, { borderLeftColor: color }]} wrap={false}>
      <Text style={[S.sectionTitle, { color }]}>Phase 5 — Production Code</Text>
      <View style={S.codeBlock}>
        {lines.map((line, idx) => {
          const tokens = tokenizeLine(line || " ");
          return (
            <View key={idx} style={S.codeLine}>
              <Text style={S.codeLineNum}>{idx + 1}</Text>
              <Text style={S.codeText}>
                {tokens.map((tok, ti) => (
                  <Text key={ti} style={{ color: tok.color }}>{tok.text}</Text>
                ))}
              </Text>
            </View>
          );
        })}
        {code.split("\n").length > 300 && (
          <Text style={{ fontSize: 7, color: CMT_COLOR, marginTop: 4 }}>
            … {code.split("\n").length - 300} more lines (truncated for PDF)
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Phase metadata ───────────────────────────────────────────────────────────
const PHASES = [
  { id: "triage",     label: "Phase 1 — Triage",                color: "#f59e0b" },
  { id: "stats",      label: "Phase 2 — Statistical Analysis",  color: "#06b6d4" },
  { id: "hypotheses", label: "Phase 3 — Hypothesis Engine",     color: "#f472b6" },
  { id: "strategy",   label: "Phase 4 — ML Battle Plan",        color: "#a78bfa" },
  // Phase 5 (code) rendered by CodeSection — skipped here
  { id: "business",   label: "Phase 6 — Business Intelligence", color: "#34d399" },
  { id: "decision",   label: "Phase 7 — Decision Brief",        color: "#c4b5fd" },
];

function nullColor(pct: number) {
  return pct > 20 ? "#ef4444" : pct > 5 ? "#f59e0b" : "#10b981";
}

// ─── Document ─────────────────────────────────────────────────────────────────
function TechReportDoc({ outputs, summary }: { outputs: Record<string, string>; summary: DatasetSummary }) {
  const date = new Date().toISOString().slice(0, 10);
  const numericCols  = summary.columns.filter(c => c.type === "numeric").length;
  const catCols      = summary.columns.filter(c => c.type !== "numeric" && c.type !== "datetime").length;
  const avgNull      = summary.columns.reduce((s, c) => s + c.nullPct, 0) / (summary.columns.length || 1);
  const quality      = Math.round(Math.max(0, Math.min(100, 100 - avgNull * 0.5 - summary.columns.filter(c => c.nullPct > 20).length * 5)));

  return (
    <Document title={`Technical Report — ${summary.fileName}`} author="GadaaLabs" creator="GadaaLabs">
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.header}>
          <Text style={S.headerTitle}>Technical Data Science Report</Text>
          <Text style={S.headerMeta}>
            Dataset: {summary.fileName}{"   "}·{"   "}
            {summary.rowCount.toLocaleString()} rows{"   "}·{"   "}
            {summary.columnCount} columns ({numericCols} numeric, {catCols} categorical){"   "}·{"   "}
            {summary.fileSizeKB} KB{"   "}·{"   "}
            Data Quality: {quality}/100{"   "}·{"   "}
            Generated: {date}
          </Text>
          <Text style={S.badge}>GadaaLabs · 7-Phase Autonomous Pipeline</Text>
        </View>

        {/* Schema */}
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
                  <Text style={[S.td,     S.col1]}>{c.type}</Text>
                  <Text style={[S.td,     S.col2, { color: nullColor(c.nullPct) }]}>{(100 - c.nullPct).toFixed(1)}%</Text>
                  <Text style={[S.td,     S.col3]}>{c.unique.toLocaleString()}</Text>
                  <Text style={[S.tdMono, S.col4]}>{val}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={S.divider} />

        {/* Phases 1–4, 6–7 as plain text */}
        {PHASES.map((phase) => {
          const out = outputs[phase.id];
          if (!out) return null;
          return (
            <View key={phase.id} style={[S.section, { borderLeftColor: phase.color }]} wrap={false}>
              <Text style={[S.sectionTitle, { color: phase.color }]}>{phase.label}</Text>
              <Text style={S.body}>{out}</Text>
            </View>
          );
        })}

        {/* Phase 5 — syntax-highlighted code */}
        {outputs.code && <CodeSection code={outputs.code} color="#67e8f9" />}

        <View style={S.footer} fixed>
          <Text style={S.footerText}>GadaaLabs — Technical Report — {summary.fileName}</Text>
          <Text style={S.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
interface Props { outputs: Record<string, string>; summary: DatasetSummary }

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
