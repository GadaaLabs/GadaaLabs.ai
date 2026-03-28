"use client";

import { useState, useCallback } from "react";
import { DropZone } from "./DropZone";
import { StatsTable } from "./StatsTable";
import { ChartPanel } from "./ChartPanel";
import { ReportDownload } from "./ReportDownload";
import { computeStats, summaryToPrompt, type DatasetSummary } from "@/lib/datalab";
import {
  BarChart2, Brain, MessageSquare, FileText, AlertCircle, Loader2, Send, RotateCcw,
} from "lucide-react";

type Tab = "stats" | "charts" | "analysis" | "chat";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function DataLabShell() {
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("stats");
  const [report, setReport] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const handleData = useCallback(
    (newRows: Record<string, unknown>[], fileName: string, sizeKB: number) => {
      setParsing(true);
      setError(null);
      setTimeout(() => {
        const s = computeStats(newRows, fileName, sizeKB);
        setSummary(s);
        setRows(newRows);
        setReport("");
        setMessages([]);
        setTab("stats");
        setParsing(false);
      }, 0);
    },
    []
  );

  const runAnalysis = async () => {
    if (!summary) return;
    setAnalyzing(true);
    setReport("");
    setTab("analysis");

    const summaryText = summaryToPrompt(summary);

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryText }),
      });

      if (!res.ok || !res.body) {
        setReport("Error: API unavailable. Check your GROQ_API_KEY.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value);
        setReport(accumulated);
      }
    } catch {
      setReport("Request failed.");
    } finally {
      setAnalyzing(false);
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
        body: JSON.stringify({
          summaryText,
          messages: updated,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages([...updated, { role: "assistant", content: "Error: API unavailable." }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value);
        setMessages([...updated, { role: "assistant", content: accumulated }]);
      }
    } catch {
      setMessages([...updated, { role: "assistant", content: "Request failed." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const reset = () => {
    setSummary(null);
    setRows([]);
    setReport("");
    setMessages([]);
    setError(null);
    setTab("stats");
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "stats",    label: "Statistics",  icon: BarChart2 },
    { id: "charts",   label: "Charts",      icon: FileText },
    { id: "analysis", label: "AI Analysis", icon: Brain },
    { id: "chat",     label: "Ask DataLab", icon: MessageSquare },
  ];

  return (
    <div>
      {!summary ? (
        <div className="max-w-2xl mx-auto">
          <DropZone onData={handleData} onError={setError} loading={parsing} />
          {error && (
            <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-error)" }} />
              <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>
            </div>
          )}
          <div className="mt-8 rounded-xl p-5 text-sm"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
            <p className="font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>What DataLab does</p>
            <ul className="space-y-1.5" style={{ color: "var(--color-text-secondary)" }}>
              <li>→ Computes column statistics instantly in your browser (no data upload)</li>
              <li>→ Generates distribution charts and a null-rate quality heatmap</li>
              <li>→ Sends a compact summary to Llama 3 for AI-powered EDA insights</li>
              <li>→ Lets you ask follow-up questions about your data</li>
              <li>→ Produces a downloadable Markdown report</li>
            </ul>
          </div>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                {summary.fileName}
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {summary.rowCount.toLocaleString()} rows · {summary.columnCount} columns
              </p>
            </div>
            <div className="flex items-center gap-3">
              {report && <ReportDownload report={report} summary={summary} />}
              {!report && !analyzing && (
                <button onClick={runAnalysis}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
                    color: "#fff", boxShadow: "var(--glow-purple-sm)",
                  }}>
                  <Brain className="h-4 w-4" />
                  Run AI Analysis
                </button>
              )}
              {analyzing && (
                <span className="flex items-center gap-2 text-sm" style={{ color: "var(--color-purple-400)" }}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analysing…
                </span>
              )}
              <button onClick={reset} className="p-2 rounded-lg"
                style={{ color: "var(--color-text-muted)", border: "1px solid var(--color-border-default)" }}
                title="Upload new file">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 p-1 rounded-xl"
            style={{ background: "var(--color-bg-elevated)", width: "fit-content" }}>
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
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
          {tab === "stats" && <StatsTable summary={summary} />}

          {tab === "charts" && <ChartPanel summary={summary} />}

          {tab === "analysis" && (
            <div className="rounded-xl p-6"
              style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
              {!report && !analyzing && (
                <div className="text-center py-8">
                  <Brain className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--color-text-muted)" }} />
                  <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
                    Click "Run AI Analysis" to get AI-powered EDA insights
                  </p>
                  <button onClick={runAnalysis}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                    style={{
                      background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
                      color: "#fff", boxShadow: "var(--glow-purple-sm)",
                    }}>
                    <Brain className="h-4 w-4 inline mr-2" />Run AI Analysis
                  </button>
                </div>
              )}
              {(report || analyzing) && (
                <div className="prose prose-sm max-w-none text-sm leading-relaxed"
                  style={{ color: "var(--color-text-secondary)", whiteSpace: "pre-wrap" }}>
                  {report}
                  {analyzing && <span className="animate-pulse" style={{ color: "var(--color-purple-400)" }}>▊</span>}
                </div>
              )}
            </div>
          )}

          {tab === "chat" && (
            <div className="rounded-xl overflow-hidden flex flex-col"
              style={{ border: "1px solid var(--color-border-default)", height: 480 }}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4"
                style={{ background: "var(--color-bg-surface)" }}>
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                      Ask anything about your dataset — patterns, cleaning steps, modelling suggestions…
                    </p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                      style={{
                        background: m.role === "user" ? "rgba(124,58,237,0.15)" : "var(--color-bg-elevated)",
                        border: `1px solid ${m.role === "user" ? "rgba(124,58,237,0.3)" : "var(--color-border-subtle)"}`,
                        color: "var(--color-text-secondary)",
                        whiteSpace: "pre-wrap",
                      }}>
                      {m.content}
                      {chatLoading && i === messages.length - 1 && m.role === "assistant" && m.content === "" && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin inline" style={{ color: "var(--color-text-muted)" }} />
                      )}
                      {chatLoading && i === messages.length - 1 && m.role === "assistant" && m.content !== "" && (
                        <span className="animate-pulse" style={{ color: "var(--color-purple-400)" }}>▊</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Input */}
              <div className="px-4 py-3 flex gap-3"
                style={{ background: "var(--color-bg-elevated)", borderTop: "1px solid var(--color-border-subtle)" }}>
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendChat())}
                  placeholder="Ask about your data…"
                  className="flex-1 text-sm bg-transparent outline-none"
                  style={{ color: "var(--color-text-primary)" }} />
                <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading}
                  className="p-2 rounded-lg disabled:opacity-40"
                  style={{ background: "var(--color-purple-600)", color: "#fff" }}>
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
