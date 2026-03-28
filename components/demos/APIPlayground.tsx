"use client";

import dynamic from "next/dynamic";
import { useState, useRef } from "react";
import { Play, RotateCcw, Loader2, Copy, Check } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div
      className="h-full flex items-center justify-center text-sm"
      style={{ color: "var(--color-text-muted)" }}
    >
      Loading editor...
    </div>
  ),
});

const MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Fast)" },
];

const DEFAULT_PROMPT =
  '// Ask anything about AI engineering\nExplain how key-value caching works in transformer inference.';

const DEFAULT_SYSTEM =
  "You are a precise AI engineering tutor. Give technically accurate answers with code examples where helpful.";

export function APIPlayground() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [system, setSystem] = useState(DEFAULT_SYSTEM);
  const [model, setModel] = useState(MODELS[0].id);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = async () => {
    if (loading) {
      abortRef.current?.abort();
      setLoading(false);
      return;
    }

    setOutput("");
    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, system, model, maxTokens, temperature }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setOutput(`Error: ${err.error}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setOutput((prev) => prev + chunk);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setOutput("Request failed — check your GROQ_API_KEY in .env.local");
      }
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[600px]">
      {/* Left — input */}
      <div className="flex flex-col gap-4 lg:w-1/2">
        {/* System prompt */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--color-border-default)" }}
        >
          <div
            className="px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: "var(--color-bg-elevated)",
              color: "var(--color-text-muted)",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            System Prompt
          </div>
          <textarea
            value={system}
            onChange={(e) => setSystem(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 text-sm resize-none outline-none"
            style={{
              background: "var(--color-bg-surface)",
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-jetbrains, monospace)",
            }}
          />
        </div>

        {/* Prompt editor */}
        <div
          className="rounded-xl overflow-hidden flex-1"
          style={{
            border: "1px solid var(--color-border-default)",
            minHeight: 200,
          }}
        >
          <div
            className="px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: "var(--color-bg-elevated)",
              color: "var(--color-text-muted)",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            Prompt
          </div>
          <div style={{ height: 220 }}>
            <MonacoEditor
              height="100%"
              defaultLanguage="markdown"
              value={prompt}
              onChange={(v) => setPrompt(v ?? "")}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "off",
                wordWrap: "on",
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div
          className="rounded-xl p-4 grid grid-cols-2 gap-4"
          style={{
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-default)",
          }}
        >
          {/* Model */}
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--color-text-muted)" }}>
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-text-primary)",
              }}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Max tokens */}
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--color-text-muted)" }}>
              Max Tokens: {maxTokens}
            </label>
            <input
              type="range"
              min={64}
              max={2048}
              step={64}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          {/* Temperature */}
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--color-text-muted)" }}>
              Temperature: {temperature}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          {/* Run button */}
          <div className="flex items-end">
            <button
              onClick={run}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: loading
                  ? "var(--color-bg-elevated)"
                  : "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
                color: loading ? "var(--color-text-secondary)" : "#fff",
                border: loading ? "1px solid var(--color-border-default)" : "none",
                boxShadow: loading ? "none" : "var(--glow-purple-sm)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right — output */}
      <div
        className="flex flex-col lg:w-1/2 rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--color-border-default)" }}
      >
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{
            background: "var(--color-bg-elevated)",
            borderBottom: "1px solid var(--color-border-subtle)",
          }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-text-muted)" }}
          >
            Output
          </span>
          <div className="flex items-center gap-2">
            {output && (
              <>
                <button
                  onClick={() => setOutput("")}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--color-text-muted)" }}
                  title="Clear"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={copy}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--color-text-muted)" }}
                  title="Copy"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" style={{ color: "var(--color-success)" }} />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </>
            )}
            {loading && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-cyan-400)" }}>
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                Streaming
              </span>
            )}
          </div>
        </div>

        <div
          className="flex-1 p-5 overflow-auto text-sm leading-relaxed"
          style={{
            background: "var(--color-bg-surface)",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-jetbrains, monospace)",
            whiteSpace: "pre-wrap",
            minHeight: 300,
          }}
        >
          {!output && !loading && (
            <span style={{ color: "var(--color-text-disabled)" }}>
              Output will appear here...
            </span>
          )}
          {output}
          {loading && output && (
            <span className="animate-pulse" style={{ color: "var(--color-purple-400)" }}>
              ▊
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
