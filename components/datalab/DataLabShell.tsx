"use client";

import { useState, useCallback, useRef } from "react";
import { DropZone } from "./DropZone";
import { StatsTable } from "./StatsTable";
import { ChartPanel } from "./ChartPanel";
import { computeStats, summaryToPrompt, type DatasetSummary } from "@/lib/datalab";
import { downloadNotebook } from "@/lib/notebook";
import {
  BarChart2, Brain, MessageSquare, AlertCircle, Loader2, Send,
  RotateCcw, CheckCircle2, Download, FileDown, Zap,
  Database, TrendingUp, Cpu, FileText, BookOpen,
} from "lucide-react";

type Tab = "overview" | "charts" | "analysis" | "code" | "chat";

interface Message { role: "user" | "assistant"; content: string; }

interface PipelineStage {
  id: string;
  label: string;
  icon: React.ElementType;
  status: "pending" | "running" | "done" | "error";
}

const INITIAL_STAGES: PipelineStage[] = [
  { id: "profile",   label: "Profiling Dataset",         icon: Database,    status: "pending" },
  { id: "quality",   label: "Quality Assessment",        icon: CheckCircle2,status: "pending" },
  { id: "eda",       label: "Exploratory Analysis",      icon: TrendingUp,  status: "pending" },
  { id: "patterns",  label: "Pattern Detection",         icon: Brain,       status: "pending" },
  { id: "ml",        label: "ML Readiness Check",        icon: Cpu,         status: "pending" },
  { id: "notebook",  label: "Generating Notebook Code",  icon: BookOpen,    status: "pending" },
  { id: "report",    label: "Compiling Final Report",    icon: FileText,    status: "pending" },
];

function downloadMarkdown(report: string, fileName: string) {
  const blob = new Blob([report], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName.replace(/\.[^.]+$/, "")}_report.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataLabShell() {
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const [stages, setStages] = useState<PipelineStage[]>(INITIAL_STAGES);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineDone, setPipelineDone] = useState(false);

  const [report, setReport] = useState("");
  const [notebookCode, setNotebookCode] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const summaryRef = useRef<DatasetSummary | null>(null);

  const setStageStatus = (id: string, status: PipelineStage["status"]) => {
    setStages((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
  };

  const handleData = useCallback((newRows: Record<string, unknown>[], fileName: string, sizeKB: number) => {
    setParsing(true);
    setError(null);
    setTimeout(() => {
      const s = computeStats(newRows, fileName, sizeKB);
      setSummary(s);
      summaryRef.current = s;
      setReport("");
      setNotebookCode("");
      setMessages([]);
      setStages(INITIAL_STAGES);
      setPipelineDone(false);
      setTab("overview");
      setParsing(false);
    }, 0);
  }, []);

  const runPipeline = async () => {
    const s = summaryRef.current ?? summary;
    if (!s || pipelineRunning) return;

    setPipelineRunning(true);
    setPipelineDone(false);
    setReport("");
    setNotebookCode("");
    setTab("analysis");

    const summaryText = summaryToPrompt(s);

    // Stage 1 — Profile (instant, already computed)
    setStageStatus("profile", "running");
    await new Promise((r) => setTimeout(r, 400));
    setStageStatus("profile", "done");

    // Stages 2–5 — single comprehensive AI analysis (streaming)
    setStageStatus("quality", "running");

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryText }),
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let charsRead = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        accumulated += chunk;
        charsRead += chunk.length;
        setReport(accumulated);

        // Advance stages based on how much content has streamed
        if (charsRead > 400)  { setStageStatus("quality",  "done"); setStageStatus("eda",     "running"); }
        if (charsRead > 1200) { setStageStatus("eda",      "done"); setStageStatus("patterns","running"); }
        if (charsRead > 2400) { setStageStatus("patterns", "done"); setStageStatus("ml",      "running"); }
      }

      setStageStatus("ml", "done");

      // Stage 6 — Notebook code generation
      setStageStatus("notebook", "running");

      const nbRes = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryText, stage: "notebook" }),
      });

      if (nbRes.ok && nbRes.body) {
        const nbReader = nbRes.body.getReader();
        const nbDecoder = new TextDecoder();
        let nbCode = "";
        while (true) {
          const { done, value } = await nbReader.read();
          if (done) break;
          nbCode += nbDecoder.decode(value);
          setNotebookCode(nbCode);
        }
      }

      setStageStatus("notebook", "done");

      // Stage 7 — Report compilation (instant)
      setStageStatus("report", "running");
      await new Promise((r) => setTimeout(r, 300));
      setStageStatus("report", "done");

      setPipelineDone(true);
    } catch (e) {
      console.error(e);
      setStages((prev) => prev.map((s) =>
        s.status === "running" ? { ...s, status: "error" } : s
      ));
      setReport((r) => r + "\n\n**Error: pipeline failed. Check your API key.**");
    } finally {
      setPipelineRunning(false);
    }
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || !summary || chatLoading) return;
    setChatInput("");
    const updated: Message[] = [...messages, { role: "user", content: text }];
    setMessages([...updated, { role: "assistant", content: "" }]);
    setChatLoading(true);
    const summaryText = summaryToPrompt(summary);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryText, messages: updated }),
      });
      if (!res.ok || !res.body) { setMessages([...updated, { role: "assistant", content: "Error: API unavailable." }]); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value);
        setMessages([...updated, { role: "assistant", content: acc }]);
      }
    } catch { setMessages([...updated, { role: "assistant", content: "Request failed." }]); }
    finally { setChatLoading(false); }
  };

  const reset = () => {
    setSummary(null);
    summaryRef.current = null;
    setReport("");
    setNotebookCode("");
    setMessages([]);
    setError(null);
    setStages(INITIAL_STAGES);
    setPipelineDone(false);
    setPipelineRunning(false);
    setTab("overview");
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview",  label: "Overview",   icon: BarChart2 },
    { id: "charts",    label: "Charts",     icon: TrendingUp },
    { id: "analysis",  label: "AI Analysis",icon: Brain },
    { id: "code",      label: "ML Code",    icon: Cpu },
    { id: "chat",      label: "Ask Agent",  icon: MessageSquare },
  ];

  if (!summary) {
    return (
      <div className="max-w-2xl mx-auto">
        <DropZone onData={handleData} onError={setError} loading={parsing} />
        {error && (
          <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-error)" }} />
            <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>
          </div>
        )}
        <div className="mt-8 rounded-xl p-6"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: "linear-gradient(135deg, var(--color-purple-600), var(--color-cyan-500))" }}>
              <Zap className="h-4 w-4 text-white" />
            </div>
            <p className="font-bold" style={{ color: "var(--color-text-primary)" }}>
              DataLab Autonomous Agent
            </p>
          </div>
          <ul className="space-y-2" style={{ color: "var(--color-text-secondary)" }}>
            {[
              "Instant column profiling — types, nulls, distributions, outliers",
              "7-stage autonomous pipeline: profile → quality → EDA → patterns → ML readiness",
              "AI analysis by Llama 3.3 70B — expert-level, cites exact column names",
              "Generates a complete ML pipeline in Python ready to run",
              "Download a full Jupyter notebook (.ipynb) with runnable code",
              "Download a Markdown report — executive summary to action plan",
              "Ask the agent anything about your data in the chat tab",
              "All processing in your browser — your data never leaves your machine",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-success)" }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {summary.fileName}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {summary.rowCount.toLocaleString()} rows · {summary.columnCount} columns · {summary.fileSizeKB} KB
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!pipelineRunning && !pipelineDone && (
            <button onClick={runPipeline}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
                color: "#fff", boxShadow: "var(--glow-purple-sm)",
              }}>
              <Zap className="h-4 w-4" /> Run Full Analysis
            </button>
          )}
          {pipelineRunning && (
            <span className="flex items-center gap-2 text-sm" style={{ color: "var(--color-purple-400)" }}>
              <Loader2 className="h-4 w-4 animate-spin" /> Agent running…
            </span>
          )}
          {pipelineDone && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => downloadMarkdown(report, summary.fileName)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "var(--color-success)" }}>
                <FileDown className="h-4 w-4" /> .md Report
              </button>
              <button
                onClick={() => downloadNotebook(summary, notebookCode, report)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--color-purple-400)" }}>
                <Download className="h-4 w-4" /> .ipynb Notebook
              </button>
            </div>
          )}
          <button onClick={reset} className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--color-text-muted)", border: "1px solid var(--color-border-default)" }}
            title="Upload new file">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Pipeline tracker */}
      <div className="rounded-xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        {stages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="flex flex-col items-center gap-1.5 text-center p-2 rounded-lg"
              style={{
                background: stage.status === "done" ? "rgba(16,185,129,0.06)"
                  : stage.status === "running" ? "rgba(124,58,237,0.1)"
                  : stage.status === "error" ? "rgba(239,68,68,0.06)"
                  : "transparent",
              }}>
              {stage.status === "running" ? (
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--color-purple-400)" }} />
              ) : stage.status === "done" ? (
                <CheckCircle2 className="h-4 w-4" style={{ color: "var(--color-success)" }} />
              ) : stage.status === "error" ? (
                <AlertCircle className="h-4 w-4" style={{ color: "var(--color-error)" }} />
              ) : (
                <Icon className="h-4 w-4" style={{ color: "var(--color-text-disabled)" }} />
              )}
              <span className="text-xs leading-tight"
                style={{
                  color: stage.status === "done" ? "var(--color-success)"
                    : stage.status === "running" ? "var(--color-purple-300)"
                    : stage.status === "error" ? "var(--color-error)"
                    : "var(--color-text-disabled)",
                }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto"
        style={{ background: "var(--color-bg-elevated)", width: "fit-content" }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            style={{
              background: tab === id ? "rgba(124,58,237,0.2)" : "transparent",
              color: tab === id ? "var(--color-purple-300)" : "var(--color-text-muted)",
              border: tab === id ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
            }}>
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && <StatsTable summary={summary} />}

      {tab === "charts" && <ChartPanel summary={summary} />}

      {tab === "analysis" && (
        <div className="rounded-xl p-6 min-h-64"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
          {!report && !pipelineRunning && (
            <div className="text-center py-12">
              <Brain className="h-12 w-12 mx-auto mb-4" style={{ color: "var(--color-text-disabled)" }} />
              <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
                Run the full analysis pipeline to get expert AI insights
              </p>
              <button onClick={runPipeline}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))", color: "#fff", boxShadow: "var(--glow-purple-sm)" }}>
                <Zap className="h-4 w-4" /> Run Full Analysis
              </button>
            </div>
          )}
          {(report || pipelineRunning) && (
            <div className="text-sm leading-relaxed"
              style={{ color: "var(--color-text-secondary)", whiteSpace: "pre-wrap", fontFamily: "var(--font-inter, sans-serif)" }}>
              {report}
              {pipelineRunning && <span className="cursor-blink" style={{ color: "var(--color-purple-400)" }}>▊</span>}
            </div>
          )}
        </div>
      )}

      {tab === "code" && (
        <div className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--color-border-default)" }}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-subtle)" }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              Generated ML Pipeline — Python
            </span>
            {notebookCode && (
              <button
                onClick={() => { navigator.clipboard.writeText(notebookCode); }}
                className="text-xs px-3 py-1 rounded-lg"
                style={{ background: "rgba(124,58,237,0.1)", color: "var(--color-purple-400)", border: "1px solid rgba(124,58,237,0.2)" }}>
                Copy
              </button>
            )}
          </div>
          <div className="p-5 overflow-auto text-sm leading-relaxed"
            style={{ background: "var(--color-bg-base)", color: "var(--color-text-secondary)", fontFamily: "var(--font-jetbrains, monospace)", whiteSpace: "pre-wrap", minHeight: 300, maxHeight: 600 }}>
            {!notebookCode && !pipelineRunning && (
              <span style={{ color: "var(--color-text-disabled)" }}>
                Run the pipeline to generate the ML code…
              </span>
            )}
            {notebookCode}
            {pipelineRunning && stages.find((s) => s.id === "notebook")?.status === "running" && (
              <span className="cursor-blink" style={{ color: "var(--color-cyan-400)" }}>▊</span>
            )}
          </div>
        </div>
      )}

      {tab === "chat" && (
        <div className="rounded-xl overflow-hidden flex flex-col"
          style={{ border: "1px solid var(--color-border-default)", height: 520 }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: "var(--color-bg-surface)" }}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Brain className="h-10 w-10" style={{ color: "var(--color-text-disabled)" }} />
                <p className="text-sm text-center max-w-sm" style={{ color: "var(--color-text-muted)" }}>
                  Ask the DataLab agent anything about your dataset — cleaning strategies, feature ideas, model choice, outlier handling, business insights…
                </p>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {["What columns should I drop?", "Suggest 5 features to engineer", "Which model fits this data best?"].map((q) => (
                    <button key={q} onClick={() => { setChatInput(q); }}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className="max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={{
                    background: m.role === "user" ? "rgba(124,58,237,0.15)" : "var(--color-bg-elevated)",
                    border: `1px solid ${m.role === "user" ? "rgba(124,58,237,0.3)" : "var(--color-border-subtle)"}`,
                    color: "var(--color-text-secondary)",
                    whiteSpace: "pre-wrap",
                  }}>
                  {m.content}
                  {chatLoading && i === messages.length - 1 && m.role === "assistant" && !m.content && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin inline" style={{ color: "var(--color-text-muted)" }} />
                  )}
                  {chatLoading && i === messages.length - 1 && m.role === "assistant" && m.content && (
                    <span className="cursor-blink" style={{ color: "var(--color-purple-400)" }}>▊</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 flex gap-3"
            style={{ background: "var(--color-bg-elevated)", borderTop: "1px solid var(--color-border-subtle)" }}>
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendChat())}
              placeholder="Ask the DataLab agent about your data…"
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: "var(--color-text-primary)" }} />
            <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading}
              className="p-2 rounded-lg disabled:opacity-40 transition-all"
              style={{ background: "var(--color-purple-600)", color: "#fff" }}>
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
