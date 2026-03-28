"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

const prompts = [
  "Explain how transformer attention works in 2 sentences.",
  "What's the difference between RAG and fine-tuning?",
  "How does temperature affect LLM outputs?",
];

export function LiveDemoTeaser() {
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [used, setUsed] = useState(false);

  const runDemo = async (prompt: string) => {
    setLoading(true);
    setOutput("");
    setUsed(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });

      if (!res.ok || !res.body) {
        setOutput("API not configured yet — add your GROQ_API_KEY to .env.local");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        // Parse AI SDK stream format
        setOutput((prev) => prev + chunk);
      }
    } catch {
      setOutput("Error — make sure GROQ_API_KEY is set in .env.local");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="mx-auto max-w-7xl px-6 py-20"
    >
      <div
        className="rounded-3xl p-8 md:p-12 relative overflow-hidden"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(124,58,237,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative">
          <div className="text-center mb-8">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-4"
              style={{
                background: "rgba(6, 182, 212, 0.1)",
                border: "1px solid rgba(6, 182, 212, 0.25)",
                color: "var(--color-cyan-400)",
              }}
            >
              Live Demo
            </span>
            <h2
              className="text-2xl md:text-3xl font-bold mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              Ask the AI — right now
            </h2>
            <p
              className="text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              Powered by Llama 3 via Groq — streaming, open-source, free.
            </p>
          </div>

          {/* Prompt chips */}
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            {prompts.map((p) => (
              <button
                key={p}
                onClick={() => runDemo(p)}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                style={{
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-default)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Output */}
          {(loading || output || used) && (
            <div
              className="rounded-xl p-5 min-h-[80px] text-sm leading-relaxed font-mono mb-6"
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-text-secondary)",
              }}
            >
              {loading && !output && (
                <span className="flex items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking...
                </span>
              )}
              {output}
              {loading && output && <span className="animate-pulse">▊</span>}
            </div>
          )}

          <div className="text-center">
            <Link
              href="/playground"
              className="inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--color-purple-400)" }}
            >
              Open full playground
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
