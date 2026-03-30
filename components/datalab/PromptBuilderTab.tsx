"use client";

import { useState, useRef } from "react";
import { Sparkles, Copy, RotateCcw, Loader2, CheckCircle2, ChevronRight } from "lucide-react";

const EXAMPLES = [
  "Transform customer feedback into a sentiment analysis prompt",
  "Build a code reviewer prompt for TypeScript and React projects",
  "Create a data extraction prompt for parsing unstructured invoices",
  "Design a teaching assistant prompt for explaining machine learning to beginners",
  "Write a prompt that turns any CSV summary into a stakeholder-ready business report",
];

export function PromptBuilderTab() {
  const [userInput, setUserInput] = useState("");
  const [context, setContext] = useState("");
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const enhance = async () => {
    if (!userInput.trim() || streaming) return;

    // Cancel any previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setOutput("");
    setDone(false);
    setStreaming(true);

    try {
      const body: Record<string, string> = { userInput: userInput.trim() };
      if (context.trim()) body.context = context.trim();

      const res = await fetch("/api/ai/prompt-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        acc += decoder.decode(value);
        setOutput(acc);
      }

      setDone(true);
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError") {
        setOutput("Error: could not reach the prompt builder API. Check your setup.");
        setDone(true);
      }
    } finally {
      setStreaming(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    abortRef.current?.abort();
    setUserInput("");
    setContext("");
    setOutput("");
    setDone(false);
    setStreaming(false);
  };

  const applyExample = (ex: string) => {
    setUserInput(ex);
    setOutput("");
    setDone(false);
  };

  return (
    <div className="space-y-4">
      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Input */}
        <div
          className="rounded-xl overflow-hidden flex flex-col"
          style={{ border: "1px solid var(--color-border-default)", background: "var(--color-bg-surface)" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
          >
            <Sparkles className="h-4 w-4" style={{ color: "var(--color-purple-400)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              What do you want to do?
            </span>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Describe your task or idea in plain language…&#10;&#10;Example: I want to analyze customer churn data and identify the top 3 reasons customers leave within their first 90 days."
              className="w-full resize-none text-sm leading-relaxed bg-transparent outline-none"
              style={{
                color: "var(--color-text-primary)",
                height: 160,
                fontFamily: "var(--font-inter, sans-serif)",
              }}
            />

            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                Additional context (optional)
              </p>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Any constraints, domain specifics, or output format requirements…"
                className="w-full resize-none text-sm leading-relaxed bg-transparent outline-none rounded-lg px-3 py-2"
                style={{
                  color: "var(--color-text-secondary)",
                  height: 80,
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-default)",
                  fontFamily: "var(--font-inter, sans-serif)",
                }}
              />
            </div>
          </div>

          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderTop: "1px solid var(--color-border-subtle)" }}
          >
            <button
              onClick={enhance}
              disabled={!userInput.trim() || streaming}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
              style={{
                background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
                color: "#fff",
                boxShadow: userInput.trim() && !streaming ? "var(--glow-purple-sm)" : "none",
              }}
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {streaming ? "Enhancing…" : "Enhance Prompt"}
            </button>

            {(output || userInput) && (
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors"
                style={{ color: "var(--color-text-muted)", border: "1px solid var(--color-border-default)" }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Right: Output */}
        <div
          className="rounded-xl overflow-hidden flex flex-col"
          style={{ border: "1px solid var(--color-border-default)", background: "var(--color-bg-surface)" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Expert Prompt
              </span>
              {done && (
                <span
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(16,185,129,0.12)", color: "var(--color-success)" }}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Ready
                </span>
              )}
            </div>
            {output && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg transition-colors"
                style={{
                  background: copied ? "rgba(16,185,129,0.12)" : "rgba(124,58,237,0.1)",
                  color: copied ? "var(--color-success)" : "var(--color-purple-400)",
                  border: `1px solid ${copied ? "rgba(16,185,129,0.2)" : "rgba(124,58,237,0.2)"}`,
                }}
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            )}
          </div>

          <div className="flex-1 p-4 overflow-auto" style={{ minHeight: 320 }}>
            {!output && !streaming && (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}
                >
                  <Sparkles className="h-6 w-6" style={{ color: "var(--color-purple-400)" }} />
                </div>
                <p className="text-sm text-center max-w-xs" style={{ color: "var(--color-text-muted)" }}>
                  Your enhanced prompt will appear here. Describe your idea and click <strong style={{ color: "var(--color-text-secondary)" }}>Enhance Prompt</strong>.
                </p>
              </div>
            )}

            {(output || streaming) && (
              <div
                className="text-sm leading-relaxed"
                style={{
                  color: "var(--color-text-secondary)",
                  whiteSpace: "pre-wrap",
                  fontFamily: "var(--font-inter, sans-serif)",
                  background: done ? "rgba(124,58,237,0.04)" : "transparent",
                  borderRadius: done ? "0.5rem" : "0",
                  padding: done ? "0.75rem" : "0",
                  border: done ? "1px solid rgba(124,58,237,0.12)" : "none",
                  transition: "all 0.3s ease",
                }}
              >
                {output}
                {streaming && (
                  <span className="cursor-blink ml-0.5" style={{ color: "var(--color-purple-400)" }}>▊</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Examples */}
      {!output && !streaming && (
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>
            Try an example
          </p>
          <div className="space-y-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => applyExample(ex)}
                className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors group"
                style={{
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-subtle)",
                  color: "var(--color-text-secondary)",
                }}
              >
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
                  style={{ color: "var(--color-purple-400)" }}
                />
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
