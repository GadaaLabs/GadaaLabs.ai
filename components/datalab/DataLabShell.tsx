"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { DropZone } from "./DropZone";
import { StatsTable } from "./StatsTable";
import { EDADashboard } from "./EDADashboard";
import { TechReport } from "./TechReport";
import { StakeholderReport } from "./StakeholderReport";
import { NotesPanel } from "./NotesPanel";
import { PromptBuilderTab } from "./PromptBuilderTab";
import { ExpertHub } from "./ExpertHub";
import { DataScienceAgent } from "./DataScienceAgent";
import { TransformTab } from "./TransformTab";
import { ModelTrainerTab } from "./ModelTrainerTab";
import { CompareTab } from "./CompareTab";
import { DataExplorerTab } from "./DataExplorerTab";
import { ClusterAnalysisTab } from "./ClusterAnalysisTab";
import { PivotTab } from "./PivotTab";
import { AnomalyDetectionTab } from "./AnomalyDetectionTab";
import { DataQualityTab } from "./DataQualityTab";
import { computeStats, summaryToPrompt, type DatasetSummary } from "@/lib/datalab";
import {
  BarChart2, Brain, MessageSquare, AlertCircle, Loader2, Send,
  RotateCcw, CheckCircle2, Zap, TrendingUp, Cpu,
  Sparkles, StickyNote, FlaskConical, Cpu as CpuIcon, Microscope,
  FileText, Users, Wand2, Activity, GitCompare, Table2, Network, LayoutGrid, History,
  AlertTriangle, ShieldCheck,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Tab = "overview" | "charts" | "explorer" | "pivot" | "cluster" | "anomaly" | "quality" | "analysis" | "tech-report" | "stakeholder-report" | "code" | "chat" | "notes" | "transform" | "train" | "compare";

type CategoryId = "explore" | "analyze" | "prepare" | "model" | "reports" | "tools";

interface CategoryConfig {
  id: CategoryId;
  label: string;
  color: string;
  tabs: Tab[];
}

const CATEGORIES: CategoryConfig[] = [
  { id: "explore",  label: "Explore",  color: "#06b6d4", tabs: ["overview", "charts", "explorer", "pivot"] },
  { id: "analyze",  label: "Analyze",  color: "#f59e0b", tabs: ["cluster", "anomaly", "quality"] },
  { id: "prepare",  label: "Prepare",  color: "#a78bfa", tabs: ["transform", "compare"] },
  { id: "model",    label: "Model",    color: "#10b981", tabs: ["train", "analysis", "code"] },
  { id: "reports",  label: "Reports",  color: "#f472b6", tabs: ["tech-report", "stakeholder-report"] },
  { id: "tools",    label: "Tools",    color: "#6b7280", tabs: ["chat", "notes"] },
];

interface Message { role: "user" | "assistant"; content: string; }

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function DataLabShell() {
  // Mode: "datalab" for dataset analysis, "expert-hub" for standalone expert agents, "prompt-builder" for prompt crafting
  const [mode, setMode] = useState<"datalab" | "expert-hub" | "prompt-builder">("datalab");

  // Core dataset state
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [activeRows, setActiveRows] = useState<Record<string, unknown>[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [activeCategory, setActiveCategory] = useState<CategoryId>("explore");

  const handleCategoryChange = (catId: CategoryId) => {
    setActiveCategory(catId);
    const cat = CATEGORIES.find(c => c.id === catId);
    if (cat) setTab(cat.tabs[0]);
  };

  // Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Agent phase outputs — populated when 7-phase analysis completes
  const [agentOutputs, setAgentOutputs] = useState<Record<string, string> | null>(null);

  // Session persistence
  const [savedSession, setSavedSession] = useState<{ fileName: string; savedAt: string } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("datalab_session_v2");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return { fileName: parsed.summary?.fileName ?? "Unknown", savedAt: parsed.savedAt ?? "" };
    } catch { return null; }
  });

  const summaryRef = useRef<DatasetSummary | null>(null);

  // ── Session persistence ───────────────────────

  // Auto-save summary + agentOutputs whenever they change
  useEffect(() => {
    if (!summary) return;
    try {
      localStorage.setItem("datalab_session_v2", JSON.stringify({
        summary,
        agentOutputs,
        savedAt: new Date().toISOString(),
      }));
      setSavedSession({ fileName: summary.fileName, savedAt: new Date().toISOString() });
    } catch { /* quota exceeded — silently skip */ }
  }, [summary, agentOutputs]);

  const restoreSession = useCallback(() => {
    try {
      const raw = localStorage.getItem("datalab_session_v2");
      if (!raw) return;
      const { summary: s, agentOutputs: ao } = JSON.parse(raw);
      if (!s) return;
      setSummary(s);
      summaryRef.current = s;
      setAgentOutputs(ao ?? null);
      setRawRows([]);      // raw rows not stored (too large)
      setActiveRows([]);
      setTab("overview");
      setActiveCategory("explore");
      setSavedSession(null);
    } catch { /* corrupt session — ignore */ }
  }, []);

  const clearSession = useCallback(() => {
    try { localStorage.removeItem("datalab_session_v2"); } catch { /* noop */ }
    setSavedSession(null);
  }, []);

  // ── Data load ────────────────────────────────

  const handleData = useCallback((newRows: Record<string, unknown>[], fileName: string, sizeKB: number) => {
    setParsing(true);
    setError(null);
    setTimeout(() => {
      const s = computeStats(newRows, fileName, sizeKB);
      setSummary(s);
      summaryRef.current = s;
      setRawRows(newRows);
      setActiveRows(newRows);
      setMessages([]);
      setAgentOutputs(null);
      setTab("overview");
      setActiveCategory("explore");
      setParsing(false);
    }, 0);
  }, []);

  const handleReanalyze = useCallback((newSummary: DatasetSummary, newRows: Record<string, unknown>[]) => {
    setSummary(newSummary);
    summaryRef.current = newSummary;
    setActiveRows(newRows);
    setAgentOutputs(null); // agent outputs are now stale
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
    setRawRows([]);
    setActiveRows([]);
    setMessages([]);
    setError(null);
    setAgentOutputs(null);
    setTab("overview");
    setActiveCategory("explore");
  };

  // ── Tabs config ───────────────────────────────

  const TAB_META: Record<Tab, { label: string; icon: React.ElementType }> = {
    "overview":           { label: "Overview",           icon: BarChart2 },
    "charts":             { label: "EDA Dashboard",      icon: TrendingUp },
    "explorer":           { label: "Data Explorer",      icon: Table2 },
    "pivot":              { label: "Pivot Table",        icon: LayoutGrid },
    "cluster":            { label: "Clusters",           icon: Network },
    "anomaly":            { label: "Anomaly Detection",  icon: AlertTriangle },
    "quality":            { label: "Quality Scorecard",  icon: ShieldCheck },
    "transform":          { label: "Transform",          icon: Wand2 },
    "compare":            { label: "Compare",            icon: GitCompare },
    "train":              { label: "Train Model",        icon: Activity },
    "analysis":           { label: "DS Agent",           icon: Microscope },
    "code":               { label: "ML Code",            icon: Cpu },
    "tech-report":        { label: "Tech Report",        icon: FileText },
    "stakeholder-report": { label: "Exec Report",        icon: Users },
    "chat":               { label: "Ask Agent",          icon: MessageSquare },
    "notes":              { label: "Notes",              icon: StickyNote },
  };

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

        {/* Session restore banner */}
        {savedSession && (
          <div className="mb-5 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3"
            style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.25)" }}>
            <History className="h-4 w-4 shrink-0" style={{ color: "#a78bfa" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Previous session found
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {savedSession.fileName} · saved {new Date(savedSession.savedAt).toLocaleString()}
              </p>
            </div>
            <button onClick={restoreSession}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.4)", color: "#a78bfa" }}>
              Restore
            </button>
            <button onClick={clearSession}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
              Dismiss
            </button>
          </div>
        )}

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

      {/* Two-level navigation */}
      {/* Category pills */}
      <div className="flex gap-2 mb-2 flex-wrap">
        {CATEGORIES.map(cat => {
          const active = activeCategory === cat.id;
          return (
            <button key={cat.id} onClick={() => handleCategoryChange(cat.id)}
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: active ? `${cat.color}22` : "var(--color-bg-elevated)",
                border: `1px solid ${active ? cat.color + "66" : "var(--color-border-default)"}`,
                color: active ? cat.color : "var(--color-text-muted)",
              }}>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Inner tab bar for active category */}
      {(() => {
        const cat = CATEGORIES.find(c => c.id === activeCategory)!;
        return (
          <div className="flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto"
            style={{ background: "var(--color-bg-elevated)", width: "fit-content" }}>
            {cat.tabs.map(tabId => {
              const meta = TAB_META[tabId];
              const Icon = meta.icon;
              const active = tab === tabId;
              return (
                <button key={tabId} onClick={() => setTab(tabId)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                  style={{
                    background: active ? `${cat.color}22` : "transparent",
                    color: active ? cat.color : "var(--color-text-muted)",
                    border: active ? `1px solid ${cat.color}44` : "1px solid transparent",
                  }}>
                  <Icon className="h-4 w-4" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* ── Tab content ── */}

      {tab === "overview" && <StatsTable summary={summary} />}

      {tab === "charts" && <EDADashboard summary={summary} agentOutputs={agentOutputs} />}

      {tab === "explorer" && (
        <DataExplorerTab activeRows={activeRows} summary={summary} />
      )}

      {tab === "transform" && rawRows.length > 0 && (
        <TransformTab
          rawRows={rawRows}
          summary={summary}
          onReanalyze={handleReanalyze}
        />
      )}

      {tab === "train" && (
        <ModelTrainerTab activeRows={activeRows} summary={summary} />
      )}

      {tab === "compare" && (
        <CompareTab summaryA={summary} />
      )}

      {tab === "cluster" && (
        <ClusterAnalysisTab activeRows={activeRows} summary={summary} />
      )}

      {tab === "pivot" && (
        <PivotTab activeRows={activeRows} summary={summary} />
      )}

      {tab === "anomaly" && (
        <AnomalyDetectionTab activeRows={activeRows} summary={summary} />
      )}

      {tab === "quality" && (
        <DataQualityTab summary={summary} />
      )}

      {tab === "analysis" && (
        <DataScienceAgent
          summary={summary}
          summaryText={summaryToPrompt(summary)}
          onPhasesComplete={setAgentOutputs}
        />
      )}

      {tab === "tech-report" && (
        <TechReport outputs={agentOutputs} summary={summary} />
      )}

      {tab === "stakeholder-report" && (
        <StakeholderReport outputs={agentOutputs} summary={summary} />
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
