"use client";

import { useState, useRef } from "react";
import { Play, Loader2, Zap, Clock } from "lucide-react";

const MODELS = [
  { id: "llama-3.3-70b-versatile",  label: "Llama 3.3 70B",    badge: "Most Capable" },
  { id: "mixtral-8x7b-32768",       label: "Mixtral 8x7B",      badge: "Balanced" },
  { id: "llama-3.1-8b-instant",     label: "Llama 3.1 8B",      badge: "Fastest" },
];

const PRESETS = [
  "Explain the difference between attention and convolution in neural networks.",
  "Write a Python function that implements binary search with type hints.",
  "What are the main failure modes of RAG systems in production?",
  "Summarise the tradeoffs between HNSW and IVF vector indices in one paragraph.",
];

interface ModelResult {
  output: string;
  loading: boolean;
  ttft: number | null;   // ms to first token
  elapsed: number | null; // ms total
  tokens: number;
  error: boolean;
}

function makeResult(): ModelResult {
  return { output: "", loading: false, ttft: null, elapsed: null, tokens: 0, error: false };
}

export function ModelComparison() {
  const [prompt, setPrompt] = useState(PRESETS[0]);
  const [selected, setSelected] = useState<string[]>([MODELS[0].id, MODELS[2].id]);
  const [results, setResults] = useState<Record<string, ModelResult>>(
    Object.fromEntries(MODELS.map((m) => [m.id, makeResult()]))
  );
  const [running, setRunning] = useState(false);
  const abortRefs = useRef<Record<string, AbortController>>({});

  const toggleModel = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((m) => m !== id) : prev) : [...prev, id]
    );
  };

  const runComparison = async () => {
    if (!prompt.trim() || running) return;
    setRunning(true);

    // Reset selected results
    setResults((prev) => {
      const next = { ...prev };
      selected.forEach((id) => { next[id] = makeResult(); });
      return next;
    });

    const system = "You are a precise AI engineering expert. Give a direct, technically accurate answer. Be concise.";

    await Promise.all(
      selected.map(async (modelId) => {
        abortRefs.current[modelId]?.abort();
        abortRefs.current[modelId] = new AbortController();

        const start = performance.now();
        let firstToken = false;

        try {
          setResults((prev) => ({ ...prev, [modelId]: { ...prev[modelId], loading: true } }));

          const res = await fetch("/api/ai/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, system, model: modelId, maxTokens: 512, temperature: 0.3 }),
            signal: abortRefs.current[modelId].signal,
          });

          if (!res.ok || !res.body) throw new Error("API error");

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            accumulated += chunk;

            if (!firstToken && chunk.trim()) {
              firstToken = true;
              const ttft = Math.round(performance.now() - start);
              setResults((prev) => ({ ...prev, [modelId]: { ...prev[modelId], ttft } }));
            }

            setResults((prev) => ({
              ...prev,
              [modelId]: {
                ...prev[modelId],
                output: accumulated,
                tokens: Math.round(accumulated.length / 4), // rough estimate
              },
            }));
          }

          const elapsed = Math.round(performance.now() - start);
          setResults((prev) => ({ ...prev, [modelId]: { ...prev[modelId], loading: false, elapsed } }));
        } catch (e: unknown) {
          if (e instanceof Error && e.name !== "AbortError") {
            setResults((prev) => ({
              ...prev,
              [modelId]: { ...prev[modelId], loading: false, error: true, output: "Request failed." },
            }));
          }
        }
      })
    );

    setRunning(false);
  };

  const anyHasOutput = selected.some((id) => results[id].output);

  return (
    <div className="flex flex-col gap-6">
      {/* Model selector */}
      <div className="rounded-xl p-4"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>
          Select models to compare (pick 2–3)
        </p>
        <div className="flex flex-wrap gap-3">
          {MODELS.map((m) => {
            const active = selected.includes(m.id);
            return (
              <button key={m.id} onClick={() => toggleModel(m.id)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active ? "rgba(124,58,237,0.12)" : "var(--color-bg-elevated)",
                  border: `1px solid ${active ? "var(--color-purple-500)" : "var(--color-border-default)"}`,
                  color: active ? "var(--color-purple-300)" : "var(--color-text-secondary)",
                  boxShadow: active ? "0 0 16px rgba(124,58,237,0.15)" : "none",
                }}>
                <Zap className="h-3.5 w-3.5" style={{ color: active ? "var(--color-cyan-400)" : "var(--color-text-disabled)" }} />
                <div className="text-left">
                  <div>{m.label}</div>
                  <div className="text-xs" style={{ color: active ? "var(--color-cyan-400)" : "var(--color-text-disabled)" }}>
                    {m.badge}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prompt */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--color-border-default)" }}>
        <div className="px-4 py-2 flex items-center justify-between"
          style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-subtle)" }}>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
            Prompt
          </span>
          <div className="flex gap-2">
            {PRESETS.map((p, i) => (
              <button key={i} onClick={() => setPrompt(p)}
                className="text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: prompt === p ? "rgba(124,58,237,0.12)" : "var(--color-bg-surface)",
                  border: `1px solid ${prompt === p ? "rgba(124,58,237,0.3)" : "var(--color-border-subtle)"}`,
                  color: prompt === p ? "var(--color-purple-400)" : "var(--color-text-muted)",
                }}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
          className="w-full px-4 py-3 text-sm resize-none outline-none"
          style={{ background: "var(--color-bg-surface)", color: "var(--color-text-primary)", fontFamily: "var(--font-inter, sans-serif)" }} />
        <div className="px-4 py-3 flex justify-end"
          style={{ background: "var(--color-bg-elevated)", borderTop: "1px solid var(--color-border-subtle)" }}>
          <button onClick={runComparison} disabled={running || !prompt.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
              color: "#fff", boxShadow: running ? "none" : "var(--glow-purple-sm)",
            }}>
            {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</> : <><Play className="h-4 w-4" /> Compare Models</>}
          </button>
        </div>
      </div>

      {/* Results grid */}
      {(anyHasOutput || running) && (
        <div className={`grid gap-4 ${selected.length === 3 ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
          {selected.map((modelId) => {
            const model = MODELS.find((m) => m.id === modelId)!;
            const result = results[modelId];
            return (
              <div key={modelId} className="rounded-xl overflow-hidden flex flex-col"
                style={{ border: `1px solid ${result.error ? "rgba(239,68,68,0.3)" : "var(--color-border-default)"}` }}>
                {/* Model header */}
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-subtle)" }}>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" style={{ color: "var(--color-cyan-400)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {model.label}
                    </span>
                  </div>
                  {result.loading && (
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-cyan-400)" }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" /> Streaming
                    </span>
                  )}
                  {!result.loading && result.elapsed && (
                    <div className="flex items-center gap-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {result.ttft && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> TTFT: {result.ttft}ms
                        </span>
                      )}
                      <span>{(result.elapsed / 1000).toFixed(1)}s total</span>
                    </div>
                  )}
                </div>
                {/* Output */}
                <div className="flex-1 p-4 text-sm leading-relaxed overflow-auto"
                  style={{
                    background: "var(--color-bg-surface)",
                    color: result.error ? "var(--color-error)" : "var(--color-text-secondary)",
                    whiteSpace: "pre-wrap",
                    minHeight: 160,
                    maxHeight: 360,
                    fontFamily: "var(--font-inter, sans-serif)",
                  }}>
                  {!result.output && result.loading && (
                    <span style={{ color: "var(--color-text-disabled)" }}>Waiting for first token…</span>
                  )}
                  {result.output}
                  {result.loading && result.output && (
                    <span className="cursor-blink" style={{ color: "var(--color-purple-400)" }}>▊</span>
                  )}
                </div>
                {/* Footer stats */}
                {result.tokens > 0 && !result.loading && (
                  <div className="px-4 py-2 text-xs"
                    style={{ background: "var(--color-bg-elevated)", borderTop: "1px solid var(--color-border-subtle)", color: "var(--color-text-disabled)" }}>
                    ~{result.tokens} tokens · {result.elapsed ? Math.round(result.tokens / (result.elapsed / 1000)) : "—"} tok/s
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
