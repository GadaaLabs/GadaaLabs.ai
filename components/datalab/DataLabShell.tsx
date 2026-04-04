"use client";

import { useState, useCallback, useRef } from "react";
import { DropZone } from "./DropZone";
import { StatsTable } from "./StatsTable";
import { ChartPanel } from "./ChartPanel";
import { NotesPanel } from "./NotesPanel";
import { PromptBuilderTab } from "./PromptBuilderTab";
import { ExpertHub } from "./ExpertHub";
import { DataScienceAgent } from "./DataScienceAgent";
import { computeStats, summaryToPrompt, type DatasetSummary } from "@/lib/datalab";
import {
  BarChart2, Brain, MessageSquare, AlertCircle, Loader2, Send,
  RotateCcw, CheckCircle2, Zap, TrendingUp, Cpu,
  Sparkles, StickyNote, FlaskConical, Cpu as CpuIcon, Microscope,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Tab = "overview" | "charts" | "analysis" | "code" | "chat" | "notes";

interface Message { role: "user" | "assistant"; content: string; }

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function DataLabShell() {
  // Mode: "datalab" for dataset analysis, "expert-hub" for standalone expert agents, "prompt-builder" for prompt crafting
  const [mode, setMode] = useState<"datalab" | "expert-hub" | "prompt-builder">("datalab");

  // Core dataset state
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");


  // Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const summaryRef = useRef<DatasetSummary | null>(null);

  // ── Data load ────────────────────────────────

  const handleData = useCallback((newRows: Record<string, unknown>[], fileName: string, sizeKB: number) => {
    setParsing(true);
    setError(null);
    setTimeout(() => {
      const s = computeStats(newRows, fileName, sizeKB);
      setSummary(s);
      summaryRef.current = s;
      setMessages([]);
      setTab("overview");
      setParsing(false);
    }, 0);
  }, []);

  // ── Chat ──────────────────────────────────────

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
      if (!res.ok || !res.body) {
        setMessages([...updated, { role: "assistant", content: "Error: API unavailable." }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value);
        setMessages([...updated, { role: "assistant", content: acc }]);
      }
    } catch {
      setMessages([...updated, { role: "assistant", content: "Request failed." }]);
    } finally {
      setChatLoading(false); }
  };

  // ── Reset ─────────────────────────────────────

  const reset = () => {
    setSummary(null);
    summaryRef.current = null;
    setMessages([]);
    setError(null);
    setTab("overview");
  };

  // ── Tabs config ───────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview",  label: "Overview",             icon: BarChart2 },
    { id: "charts",    label: "Charts",               icon: TrendingUp },
    { id: "analysis",  label: "Data Science Agent",   icon: Microscope },
    { id: "code",      label: "ML Code",              icon: Cpu },
    { id: "chat",      label: "Ask Agent",            icon: MessageSquare },
    { id: "notes",     label: "Notes",                icon: StickyNote },
  ];

  // ─────────────────────────────────────────────
  // Empty state (no file loaded)
  // ─────────────────────────────────────────────

  // ── Mode switcher (always visible) ──────────────────────────
  const MODES = [
    { id: "datalab"        as const, label: "Data Science", Icon: FlaskConical },
    { id: "expert-hub"     as const, label: "Expert Agents", Icon: CpuIcon },
    { id: "prompt-builder" as const, label: "Prompt Builder", Icon: Sparkles },
  ];

  const modeSwitcher = (
    <div className="flex gap-2 mb-6">
      {MODES.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => setMode(id)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: mode === id
              ? "linear-gradient(135deg, var(--color-purple-700), var(--color-purple-600))"
              : "var(--color-bg-surface)",
            color: mode === id ? "#fff" : "var(--color-text-muted)",
            border: `1px solid ${mode === id ? "transparent" : "var(--color-border-default)"}`,
            boxShadow: mode === id ? "var(--glow-purple-sm)" : "none",
          }}
        >
          <Icon className="h-4 w-4" /> {label}
        </button>
      ))}
    </div>
  );

  if (mode === "expert-hub") {
    return (
      <div>
        {modeSwitcher}
        <ExpertHub />
      </div>
    );
  }

  if (mode === "prompt-builder") {
    return (
      <div>
        {modeSwitcher}
        <PromptBuilderTab />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-2xl mx-auto">
        {modeSwitcher}
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
              Data Science Agent — Principal Level
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
              "Multi-agent team: 10 specialized AI experts collaborate on your data",
              "Prompt Builder: craft production-ready LLM prompts — available as its own top-level tab",
              "Note taking: save observations and insights directly in DataLab",
              "500 MB dataset support — real-world scale datasets",
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

  // ─────────────────────────────────────────────
  // Main UI (file loaded)
  // ─────────────────────────────────────────────

  return (
    <div>
      {modeSwitcher}
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
          <button onClick={reset} className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--color-text-muted)", border: "1px solid var(--color-border-default)" }}
            title="Upload new file">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
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

      {/* ── Tab content ── */}

      {tab === "overview" && <StatsTable summary={summary} />}

      {tab === "charts" && <ChartPanel summary={summary} />}

      {tab === "analysis" && (
        <DataScienceAgent
          summary={summary}
          summaryText={summaryToPrompt(summary)}
        />
      )}

      {tab === "code" && (
        <div className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--color-border-default)" }}>
          <div className="flex items-center px-4 py-3"
            style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-subtle)" }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              ML Pipeline — Python
            </span>
          </div>
          <div className="p-8 flex flex-col items-center justify-center text-center"
            style={{ background: "var(--color-bg-base)", minHeight: 240 }}>
            <Cpu className="h-10 w-10 mb-4" style={{ color: "var(--color-text-disabled)" }} />
            <p className="text-sm font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
              Production code is in Phase 5
            </p>
            <p className="text-xs max-w-sm" style={{ color: "var(--color-text-muted)" }}>
              Run the 7-phase analysis in the <strong style={{ color: "var(--color-purple-300)" }}>Data Science Agent</strong> tab.
              Phase 5 generates a complete, runnable Python pipeline with your actual column names — expand it to copy or download.
            </p>
            <button
              onClick={() => setTab("analysis")}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--color-purple-400)" }}>
              <Zap className="h-4 w-4" /> Go to Data Science Agent
            </button>
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

      {tab === "notes" && (
        <div style={{ position: "relative" }}>
          <NotesPanel datasetName={summary.fileName} userId="anon" />
        </div>
      )}
    </div>
  );
}
