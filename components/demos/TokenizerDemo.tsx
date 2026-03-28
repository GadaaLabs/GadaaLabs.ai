"use client";

import { useState, useEffect } from "react";

// Lightweight BPE-style tokeniser approximation (no WASM needed for visual demo)
// Uses a simple heuristic: split on spaces/punctuation and assign colours
function tokenize(text: string): string[] {
  if (!text) return [];
  // Split on word boundaries, preserving whitespace as separate tokens
  return text.match(/\s+|\w+|[^\w\s]/g) ?? [];
}

const PALETTE = [
  "rgba(124,58,237,0.25)",   // purple
  "rgba(6,182,212,0.25)",    // cyan
  "rgba(245,158,11,0.20)",   // amber
  "rgba(16,185,129,0.22)",   // green
  "rgba(239,68,68,0.20)",    // red
  "rgba(99,102,241,0.25)",   // indigo
  "rgba(236,72,153,0.20)",   // pink
  "rgba(234,179,8,0.22)",    // yellow
];

const BORDER_PALETTE = [
  "rgba(124,58,237,0.5)",
  "rgba(6,182,212,0.5)",
  "rgba(245,158,11,0.45)",
  "rgba(16,185,129,0.5)",
  "rgba(239,68,68,0.45)",
  "rgba(99,102,241,0.5)",
  "rgba(236,72,153,0.45)",
  "rgba(234,179,8,0.5)",
];

const EXAMPLES = [
  "The quick brown fox jumps over the lazy dog.",
  "function getUserById(id: string): Promise<User>",
  "Artificial intelligence is transforming software engineering.",
  "gsk_abc123 is an API key — never commit it to git!",
];

export function TokenizerDemo() {
  const [text, setText] = useState(EXAMPLES[0]);
  const [tokens, setTokens] = useState<string[]>([]);

  useEffect(() => {
    setTokens(tokenize(text));
  }, [text]);

  const tokenCount = tokens.length;
  const charCount = text.length;
  const estimatedWords = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-5">
      {/* Input */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border-default)" }}>
        <div className="px-4 py-2 text-xs font-semibold uppercase tracking-widest"
          style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border-subtle)" }}>
          Input Text
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Type anything to see it tokenised…"
          className="w-full px-4 py-3 text-sm resize-none outline-none leading-relaxed"
          style={{
            background: "var(--color-bg-surface)",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-jetbrains, monospace)",
          }}
        />
      </div>

      {/* Example chips */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => setText(ex)}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: text === ex ? "rgba(124,58,237,0.15)" : "var(--color-bg-elevated)",
              border: `1px solid ${text === ex ? "rgba(124,58,237,0.4)" : "var(--color-border-default)"}`,
              color: text === ex ? "var(--color-purple-300)" : "var(--color-text-muted)",
            }}>
            {ex.slice(0, 30)}{ex.length > 30 ? "…" : ""}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Tokens", value: tokenCount },
          { label: "Words", value: estimatedWords },
          { label: "Characters", value: charCount },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4 text-center"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
            <div className="text-2xl font-bold gradient-text">{s.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Token visualisation */}
      <div className="rounded-xl p-4" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>
          Token Breakdown
        </p>
        <div className="flex flex-wrap gap-1 leading-loose">
          {tokens.map((tok, i) => (
            <span key={i}
              className="inline-block px-1.5 py-0.5 rounded text-xs font-mono"
              style={{
                background: tok.trim() === "" ? "transparent" : PALETTE[i % PALETTE.length],
                border: tok.trim() === "" ? "none" : `1px solid ${BORDER_PALETTE[i % BORDER_PALETTE.length]}`,
                color: tok.trim() === "" ? "transparent" : "var(--color-text-primary)",
                whiteSpace: "pre",
              }}
              title={`Token ${i + 1}: "${tok}"`}>
              {tok}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Note: This uses a heuristic approximation for visualisation. Real BPE tokenisation (as used by LLMs) may split tokens differently — especially for rare words, code, and non-English text.
      </p>
    </div>
  );
}
