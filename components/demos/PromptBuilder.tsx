"use client";

import { useState, useCallback } from "react";
import { Loader2, Copy, Check, ChevronDown, ChevronUp, Plus, X, Sparkles } from "lucide-react";

/* ── Prompt part types ───────────────────────────────────────── */
interface PromptPart {
  id: string;
  type: "role" | "context" | "instruction" | "examples" | "format" | "constraint";
  label: string;
  content: string;
  enabled: boolean;
}

const PART_COLORS: Record<PromptPart["type"], { bg: string; border: string; badge: string }> = {
  role:        { bg: "rgba(124,58,237,0.08)",  border: "rgba(124,58,237,0.3)",  badge: "#7c3aed" },
  context:     { bg: "rgba(6,182,212,0.08)",   border: "rgba(6,182,212,0.25)",  badge: "#06b6d4" },
  instruction: { bg: "rgba(234,179,8,0.08)",   border: "rgba(234,179,8,0.25)",  badge: "#ca8a04" },
  examples:    { bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.25)",  badge: "#16a34a" },
  format:      { bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.25)", badge: "#ea580c" },
  constraint:  { bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)",  badge: "#dc2626" },
};

const PART_DESCRIPTIONS: Record<PromptPart["type"], string> = {
  role:        "Define the AI's persona and expertise",
  context:     "Background information or document to process",
  instruction: "The core task or question",
  examples:    "Few-shot examples (input → output pairs)",
  format:      "Output structure, length, tone constraints",
  constraint:  "Hard rules the model must follow",
};

const TEMPLATES: { name: string; parts: Omit<PromptPart, "id">[] }[] = [
  {
    name: "Code Reviewer",
    parts: [
      { type: "role", label: "Role", content: "You are a senior software engineer with expertise in code review, security, and performance optimisation.", enabled: true },
      { type: "context", label: "Code", content: "```python\ndef process_user_data(user_input):\n    query = f\"SELECT * FROM users WHERE name = '{user_input}'\"\n    return db.execute(query)\n```", enabled: true },
      { type: "instruction", label: "Task", content: "Review this code for bugs, security vulnerabilities, and performance issues.", enabled: true },
      { type: "format", label: "Output format", content: "Structure your response as:\n1. **Critical issues** (security / bugs)\n2. **Performance concerns**\n3. **Refactored code**", enabled: true },
      { type: "constraint", label: "Constraints", content: "- Flag every SQL injection risk explicitly\n- Include the corrected code snippet\n- Keep explanations concise", enabled: true },
    ],
  },
  {
    name: "RAG Q&A",
    parts: [
      { type: "role", label: "Role", content: "You are a helpful assistant that answers questions strictly based on provided context.", enabled: true },
      { type: "context", label: "Retrieved context", content: "Vector databases store embeddings — high-dimensional numeric representations of data. HNSW (Hierarchical Navigable Small World) is the most popular indexing algorithm, offering O(log n) query time. Pinecone, Weaviate, and Qdrant are the leading managed vector DBs in 2025.", enabled: true },
      { type: "instruction", label: "Question", content: "What is the time complexity of HNSW queries, and which vector databases support it?", enabled: true },
      { type: "constraint", label: "Constraints", content: "- Answer ONLY from the provided context\n- If information is missing, say \"I don't have that in the provided context\"\n- Cite which part of the context supports each claim", enabled: true },
    ],
  },
  {
    name: "Chain-of-Thought",
    parts: [
      { type: "role", label: "Role", content: "You are an expert problem solver who thinks step-by-step before giving a final answer.", enabled: true },
      { type: "instruction", label: "Problem", content: "A company has 3 ML engineers. Each engineer can train 2 models per week. If they need to run 5 experiments per model (with 40% passing to production), how many weeks until they have 12 production models?", enabled: true },
      { type: "examples", label: "Format example", content: "**Thinking:**\nStep 1: Calculate weekly output...\nStep 2: Apply filter rate...\n\n**Answer:** X weeks", enabled: true },
      { type: "format", label: "Format", content: "Always show your reasoning under a **Thinking:** header, then give a clean **Answer:** at the end.", enabled: true },
    ],
  },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function makePart(type: PromptPart["type"] = "instruction"): PromptPart {
  return { id: uid(), type, label: type.charAt(0).toUpperCase() + type.slice(1), content: "", enabled: true };
}

function buildPromptText(parts: PromptPart[]): string {
  return parts
    .filter((p) => p.enabled && p.content.trim())
    .map((p) => `[${p.label.toUpperCase()}]\n${p.content.trim()}`)
    .join("\n\n");
}

/* ── Main component ──────────────────────────────────────────── */
export function PromptBuilder() {
  const [parts, setParts] = useState<PromptPart[]>([
    { id: uid(), type: "role",        label: "Role",        content: "You are a senior ML engineer with expertise in production AI systems.", enabled: true },
    { id: uid(), type: "instruction", label: "Instruction", content: "Explain the tradeoffs between fine-tuning a model vs. using RAG for a customer support chatbot.", enabled: true },
    { id: uid(), type: "format",      label: "Format",      content: "Use a concise comparison table followed by a recommendation with reasoning.", enabled: true },
  ]);

  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [model, setModel] = useState("llama-3.3-70b-versatile");

  const promptText = buildPromptText(parts);

  const loadTemplate = (name: string) => {
    const t = TEMPLATES.find((t) => t.name === name);
    if (!t) return;
    setParts(t.parts.map((p) => ({ ...p, id: uid() })));
    setActiveTemplate(name);
    setOutput("");
  };

  const addPart = (type: PromptPart["type"]) => {
    setParts((prev) => [...prev, makePart(type)]);
  };

  const removePart = (id: string) => {
    setParts((prev) => prev.length > 1 ? prev.filter((p) => p.id !== id) : prev);
  };

  const updatePart = useCallback((id: string, changes: Partial<PromptPart>) => {
    setParts((prev) => prev.map((p) => p.id === id ? { ...p, ...changes } : p));
  }, []);

  const movePart = (id: string, dir: -1 | 1) => {
    setParts((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runPrompt = async () => {
    if (!promptText.trim() || loading) return;
    setLoading(true);
    setOutput("");

    try {
      const res = await fetch("/api/ai/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          system: "Follow the prompt structure exactly. Be precise and production-focused.",
          model,
          maxTokens: 1024,
          temperature: 0.3,
        }),
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value);
        setOutput(accumulated);
      }
    } catch {
      setOutput("Request failed. Check your API connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Template picker */}
      <div className="rounded-xl p-4" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>
          Load a template
        </p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button key={t.name} onClick={() => loadTemplate(t.name)}
              className="text-sm px-4 py-2 rounded-lg transition-all"
              style={{
                background: activeTemplate === t.name ? "rgba(124,58,237,0.12)" : "var(--color-bg-elevated)",
                border: `1px solid ${activeTemplate === t.name ? "var(--color-purple-500)" : "var(--color-border-default)"}`,
                color: activeTemplate === t.name ? "var(--color-purple-300)" : "var(--color-text-secondary)",
              }}>
              {t.name}
            </button>
          ))}
          <button onClick={() => { setParts([makePart("instruction")]); setActiveTemplate(null); setOutput(""); }}
            className="text-sm px-4 py-2 rounded-lg transition-all"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
            + Blank
          </button>
        </div>
      </div>

      {/* Parts editor */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
            Prompt blocks
          </p>
          <div className="flex gap-2 flex-wrap justify-end">
            {(Object.keys(PART_COLORS) as PromptPart["type"][]).map((type) => (
              <button key={type} onClick={() => addPart(type)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: PART_COLORS[type].bg,
                  border: `1px solid ${PART_COLORS[type].border}`,
                  color: PART_COLORS[type].badge,
                }}>
                <Plus className="h-3 w-3" /> {type}
              </button>
            ))}
          </div>
        </div>

        {parts.map((part, idx) => {
          const colors = PART_COLORS[part.type];
          return (
            <div key={part.id} className="rounded-xl overflow-hidden"
              style={{
                background: part.enabled ? colors.bg : "var(--color-bg-elevated)",
                border: `1px solid ${part.enabled ? colors.border : "var(--color-border-subtle)"}`,
                opacity: part.enabled ? 1 : 0.5,
                transition: "opacity 0.15s",
              }}>
              {/* Part header */}
              <div className="flex items-center gap-2 px-4 py-2.5"
                style={{ borderBottom: `1px solid ${colors.border}`, background: "rgba(0,0,0,0.15)" }}>
                {/* Toggle */}
                <button onClick={() => updatePart(part.id, { enabled: !part.enabled })}
                  className="h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-all"
                  style={{
                    background: part.enabled ? colors.badge : "transparent",
                    borderColor: colors.badge,
                  }}>
                  {part.enabled && <Check className="h-2.5 w-2.5 text-white" />}
                </button>

                {/* Type badge */}
                <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                  style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.badge }}>
                  {part.type}
                </span>

                {/* Label */}
                <input
                  value={part.label}
                  onChange={(e) => updatePart(part.id, { label: e.target.value })}
                  className="flex-1 text-sm font-medium bg-transparent outline-none"
                  style={{ color: "var(--color-text-primary)" }}
                />

                <span className="text-xs ml-1" style={{ color: "var(--color-text-disabled)" }}>
                  {PART_DESCRIPTIONS[part.type]}
                </span>

                {/* Move + remove */}
                <div className="flex gap-1 ml-2">
                  <button onClick={() => movePart(part.id, -1)} disabled={idx === 0}
                    className="p-1 rounded transition-colors disabled:opacity-30"
                    style={{ color: "var(--color-text-muted)" }}>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => movePart(part.id, 1)} disabled={idx === parts.length - 1}
                    className="p-1 rounded transition-colors disabled:opacity-30"
                    style={{ color: "var(--color-text-muted)" }}>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => removePart(part.id)}
                    className="p-1 rounded transition-colors"
                    style={{ color: "var(--color-text-muted)" }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Content textarea */}
              <textarea
                value={part.content}
                onChange={(e) => updatePart(part.id, { content: e.target.value })}
                rows={3}
                placeholder={`Add ${part.type} content…`}
                className="w-full px-4 py-3 text-sm resize-y outline-none bg-transparent"
                style={{
                  color: "var(--color-text-secondary)",
                  fontFamily: "var(--font-mono, monospace)",
                  minHeight: 72,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Preview + run */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border-default)" }}>
        <div className="flex items-center justify-between px-4 py-2.5"
          style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-subtle)" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowRaw(!showRaw)}
              className="text-xs font-semibold uppercase tracking-wider transition-colors"
              style={{ color: showRaw ? "var(--color-cyan-400)" : "var(--color-text-muted)" }}>
              {showRaw ? "Hide" : "Preview"} prompt
            </button>
            <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
              ~{Math.round(promptText.length / 4)} tokens
            </span>
          </div>
          <div className="flex items-center gap-3">
            <select value={model} onChange={(e) => setModel(e.target.value)}
              className="text-xs rounded-lg px-2.5 py-1.5 outline-none"
              style={{
                background: "var(--color-bg-surface)",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-text-secondary)",
              }}>
              <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
              <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
              <option value="llama-3.1-8b-instant">Llama 3.1 8B</option>
            </select>
            <button onClick={copyPrompt}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: "var(--color-bg-surface)",
                border: "1px solid var(--color-border-default)",
                color: copied ? "var(--color-cyan-400)" : "var(--color-text-muted)",
              }}>
              {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
            </button>
            <button onClick={runPrompt} disabled={loading || !promptText.trim()}
              className="flex items-center gap-2 px-5 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
                color: "#fff",
                boxShadow: loading ? "none" : "var(--glow-purple-sm)",
              }}>
              {loading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running…</>
                : <><Sparkles className="h-3.5 w-3.5" /> Run Prompt</>
              }
            </button>
          </div>
        </div>

        {showRaw && (
          <pre className="px-4 py-3 text-xs overflow-x-auto"
            style={{
              background: "var(--color-bg-base)",
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-mono, monospace)",
              borderBottom: "1px solid var(--color-border-subtle)",
              whiteSpace: "pre-wrap",
              maxHeight: 200,
              overflowY: "auto",
            }}>
            {promptText || "(empty — add content to your blocks)"}
          </pre>
        )}
      </div>

      {/* Output */}
      {(output || loading) && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border-default)" }}>
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-subtle)" }}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--color-cyan-400)" }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                Model output
              </span>
            </div>
            {loading && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-cyan-400)" }}>
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" /> Streaming
              </span>
            )}
          </div>
          <div className="p-4 text-sm leading-relaxed"
            style={{
              background: "var(--color-bg-surface)",
              color: "var(--color-text-secondary)",
              whiteSpace: "pre-wrap",
              minHeight: 120,
              maxHeight: 480,
              overflowY: "auto",
              fontFamily: "var(--font-inter, sans-serif)",
            }}>
            {output}
            {loading && output && (
              <span className="cursor-blink" style={{ color: "var(--color-purple-400)" }}>▊</span>
            )}
            {loading && !output && (
              <span style={{ color: "var(--color-text-disabled)" }}>Waiting for first token…</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
