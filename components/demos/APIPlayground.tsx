"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Plus, Trash2, RotateCcw, Loader2, Copy, Check, ChevronDown, ChevronUp, Settings } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-sm" style={{ color: "var(--color-text-muted)" }}>
      Loading editor...
    </div>
  ),
});

const MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Fast)" },
];

const DEFAULT_SYSTEM = "You are an expert AI engineering tutor. Respond with technically precise, production-quality answers. Include working code examples where relevant.";

const STARTER_PROMPTS = [
  "Explain how KV caching works in transformer inference and why it matters at scale.",
  "Write a Python function that chunks a document using recursive text splitting with configurable chunk size and overlap.",
  "What is the difference between BM25 and dense retrieval? When would you use hybrid search?",
];

interface Cell {
  id: string;
  prompt: string;
  output: string;
  loading: boolean;
  executionCount: number | null;
  error: boolean;
  collapsed: boolean;
}

function makeCell(prompt = ""): Cell {
  return {
    id: Math.random().toString(36).slice(2),
    prompt,
    output: "",
    loading: false,
    executionCount: null,
    error: false,
    collapsed: false,
  };
}

export function APIPlayground() {
  const [cells, setCells] = useState<Cell[]>([makeCell(STARTER_PROMPTS[0])]);
  const [model, setModel] = useState(MODELS[0].id);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [system, setSystem] = useState(DEFAULT_SYSTEM);
  const [showSettings, setShowSettings] = useState(false);
  const [runCounter, setRunCounter] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const abortRefs = useRef<Record<string, AbortController>>({});

  const updateCell = useCallback((id: string, patch: Partial<Cell>) => {
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const runCell = useCallback(async (id: string) => {
    const cell = cells.find((c) => c.id === id);
    if (!cell || cell.loading || !cell.prompt.trim()) return;

    abortRefs.current[id]?.abort();
    abortRefs.current[id] = new AbortController();

    const execCount = runCounter + 1;
    setRunCounter(execCount);
    updateCell(id, { loading: true, output: "", error: false, executionCount: null });

    try {
      const res = await fetch("/api/ai/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cell.prompt, system, model, maxTokens, temperature }),
        signal: abortRefs.current[id].signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        updateCell(id, { output: `Error: ${err.error}`, loading: false, error: true, executionCount: execCount });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setCells((prev) => prev.map((c) => c.id === id ? { ...c, output: c.output + chunk } : c));
      }

      updateCell(id, { loading: false, executionCount: execCount });
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        updateCell(id, { output: "Request failed — check your GROQ_API_KEY", loading: false, error: true, executionCount: execCount });
      } else {
        updateCell(id, { loading: false });
      }
    }
  }, [cells, model, maxTokens, temperature, system, runCounter, updateCell]);

  // Keyboard shortcut: Shift+Enter to run active cell
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        // Run the last cell with focus (fallback: last cell)
        const last = cells[cells.length - 1];
        if (last) runCell(last.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cells, runCell]);

  const addCell = () => {
    setCells((prev) => [...prev, makeCell()]);
  };

  const deleteCell = (id: string) => {
    abortRefs.current[id]?.abort();
    setCells((prev) => prev.filter((c) => c.id !== id));
  };

  const clearOutput = (id: string) => {
    updateCell(id, { output: "", executionCount: null, error: false });
  };

  const runAll = async () => {
    for (const cell of cells) {
      await runCell(cell.id);
    }
  };

  const clearAll = () => {
    setCells((prev) => prev.map((c) => ({ ...c, output: "", executionCount: null, error: false })));
  };

  const copyOutput = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <div className="flex items-center gap-2">
          <button onClick={addCell}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--color-purple-400)" }}>
            <Plus className="h-3.5 w-3.5" /> Add Cell
          </button>
          <button onClick={runAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "var(--color-success)" }}>
            <Play className="h-3.5 w-3.5" /> Run All
          </button>
          <button onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
            <RotateCcw className="h-3.5 w-3.5" /> Clear All
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Model selector */}
          <select value={model} onChange={(e) => setModel(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}>
            {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>

          <button onClick={() => setShowSettings((s) => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: showSettings ? "rgba(124,58,237,0.12)" : "var(--color-bg-elevated)", border: `1px solid ${showSettings ? "rgba(124,58,237,0.3)" : "var(--color-border-default)"}`, color: showSettings ? "var(--color-purple-400)" : "var(--color-text-muted)" }}>
            <Settings className="h-3.5 w-3.5" /> Settings
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
          <div className="md:col-span-3">
            <label className="text-xs mb-1.5 block font-semibold" style={{ color: "var(--color-text-muted)" }}>
              System Prompt
            </label>
            <textarea value={system} onChange={(e) => setSystem(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none outline-none"
              style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)", fontFamily: "var(--font-jetbrains, monospace)" }} />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--color-text-muted)" }}>
              Temperature: {temperature}
            </label>
            <input type="range" min={0} max={1} step={0.05} value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))} className="w-full accent-purple-500" />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--color-text-muted)" }}>
              Max Tokens: {maxTokens}
            </label>
            <input type="range" min={128} max={4096} step={128} value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))} className="w-full accent-purple-500" />
          </div>
          <div className="flex items-end">
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-disabled)" }}>
              Shift+Enter to run the last cell. Each cell is an independent API call.
            </p>
          </div>
        </div>
      )}

      {/* Cells */}
      <div className="flex flex-col gap-4">
        {cells.map((cell, idx) => (
          <div key={cell.id} className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${cell.error ? "rgba(239,68,68,0.3)" : "var(--color-border-default)"}` }}>

            {/* Cell header */}
            <div className="flex items-center gap-3 px-4 py-2"
              style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-subtle)" }}>
              <span className="text-xs font-mono shrink-0"
                style={{ color: cell.loading ? "var(--color-cyan-400)" : cell.executionCount ? "var(--color-purple-400)" : "var(--color-text-disabled)", minWidth: 32 }}>
                {cell.loading ? "[*]" : cell.executionCount ? `[${cell.executionCount}]` : `[ ]`}
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest flex-1"
                style={{ color: "var(--color-text-muted)" }}>
                Cell {idx + 1}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => updateCell(cell.id, { collapsed: !cell.collapsed })}
                  className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--color-text-muted)" }}
                  title={cell.collapsed ? "Expand" : "Collapse"}>
                  {cell.collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                </button>
                {cells.length > 1 && (
                  <button onClick={() => deleteCell(cell.id)}
                    className="p-1.5 rounded-lg transition-colors hover:text-red-400" style={{ color: "var(--color-text-muted)" }}
                    title="Delete cell">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {!cell.collapsed && (
              <>
                {/* Prompt editor */}
                <div style={{ height: 140, background: "var(--color-bg-surface)" }}>
                  <MonacoEditor
                    height="100%"
                    defaultLanguage="markdown"
                    value={cell.prompt}
                    onChange={(v) => updateCell(cell.id, { prompt: v ?? "" })}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "off",
                      wordWrap: "on",
                      scrollBeyondLastLine: false,
                      padding: { top: 10, bottom: 10 },
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  />
                </div>

                {/* Run bar */}
                <div className="flex items-center justify-between px-4 py-2"
                  style={{ background: "var(--color-bg-elevated)", borderTop: "1px solid var(--color-border-subtle)" }}>
                  <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
                    {MODELS.find((m) => m.id === model)?.label} · temp {temperature}
                  </span>
                  <button onClick={() => runCell(cell.id)} disabled={cell.loading}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    style={{
                      background: cell.loading ? "var(--color-bg-surface)" : "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
                      color: cell.loading ? "var(--color-text-secondary)" : "#fff",
                      boxShadow: cell.loading ? "none" : "var(--glow-purple-sm)",
                    }}>
                    {cell.loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running</> : <><Play className="h-3.5 w-3.5" /> Run Cell</>}
                  </button>
                </div>

                {/* Output */}
                {(cell.output || cell.loading) && (
                  <div style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
                    <div className="flex items-center justify-between px-4 py-2"
                      style={{ background: "rgba(0,0,0,0.2)" }}>
                      <span className="text-xs font-mono" style={{ color: cell.error ? "var(--color-error)" : "var(--color-success)" }}>
                        {cell.loading ? (
                          <span className="flex items-center gap-1.5" style={{ color: "var(--color-cyan-400)" }}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                            Streaming...
                          </span>
                        ) : cell.error ? "Error" : `Out [${cell.executionCount}]`}
                      </span>
                      <div className="flex items-center gap-1">
                        {cell.output && (
                          <>
                            <button onClick={() => copyOutput(cell.id, cell.output)}
                              className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--color-text-muted)" }} title="Copy">
                              {copied === cell.id ? <Check className="h-3.5 w-3.5" style={{ color: "var(--color-success)" }} /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            <button onClick={() => clearOutput(cell.id)}
                              className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--color-text-muted)" }} title="Clear output">
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="px-4 py-4 text-sm leading-relaxed overflow-auto"
                      style={{
                        background: "var(--color-bg-base)",
                        color: cell.error ? "var(--color-error)" : "var(--color-text-secondary)",
                        fontFamily: "var(--font-jetbrains, monospace)",
                        whiteSpace: "pre-wrap",
                        maxHeight: 480,
                      }}>
                      {cell.output}
                      {cell.loading && <span className="cursor-blink" style={{ color: "var(--color-purple-400)" }}>▊</span>}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add cell at bottom */}
      <button onClick={addCell}
        className="mt-4 w-full py-3 rounded-xl text-sm font-medium transition-all border-dashed"
        style={{ border: "1px dashed var(--color-border-default)", color: "var(--color-text-muted)", background: "transparent" }}>
        <Plus className="h-4 w-4 inline mr-2" />
        Add Cell
      </button>
    </div>
  );
}
