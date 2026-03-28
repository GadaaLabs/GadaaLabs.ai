"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Terminal, Sparkles, Cpu, Database, GitBranch } from "lucide-react";
import { ParticleCanvas } from "./ParticleCanvas";

const ROLES = ["AI Engineers", "ML Engineers", "Data Scientists", "RAG Builders", "AI Automation"];

const STATS = [
  { end: 200, suffix: "+", label: "Free Lessons" },
  { end: 6, suffix: "", label: "Expert Courses" },
  { end: 12, suffix: "", label: "Live Demos" },
  { end: 100, suffix: "%", label: "Free Forever" },
];

const CODE = `from gadaalabs import RAGPipeline
from groq import Groq

# Initialize the LLM + vector store
llm   = Groq(model="llama-3.3-70b-versatile")
store = VectorStore("gadaalabs-docs", dims=1536)

# Build your knowledge base once
store.ingest("./docs/", chunk_size=512,
             overlap=64, strategy="semantic")

# Query at production speed
def answer(question: str) -> str:
    context = store.retrieve(question, k=5,
                             rerank=True)
    return llm.chat(
        system="Answer using the context only.",
        user=f"{context}\\n\\n{question}"
    )

print(answer("How does HNSW indexing work?"))
# → HNSW builds a multi-layer proximity graph...`;

const FEATURES = [
  { icon: Cpu, label: "Expert Courses", desc: "Production-grade curriculum" },
  { icon: Database, label: "DataLab Agent", desc: "AI-powered EDA & reports" },
  { icon: GitBranch, label: "Notebook Playground", desc: "Interactive multi-cell editor" },
];

export function Hero() {
  const [roleIdx, setRoleIdx] = useState(0);
  const [displayRole, setDisplayRole] = useState("");
  const [typing, setTyping] = useState(true);
  const [counts, setCounts] = useState(STATS.map(() => 0));
  const [codeVisible, setCodeVisible] = useState(0);
  const countsStarted = useRef(false);

  // Typewriter for roles
  useEffect(() => {
    const target = ROLES[roleIdx];
    if (typing) {
      if (displayRole.length < target.length) {
        const t = setTimeout(() => setDisplayRole(target.slice(0, displayRole.length + 1)), 75);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setTyping(false), 2200);
        return () => clearTimeout(t);
      }
    } else {
      if (displayRole.length > 0) {
        const t = setTimeout(() => setDisplayRole(displayRole.slice(0, -1)), 35);
        return () => clearTimeout(t);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRoleIdx((r) => (r + 1) % ROLES.length);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTyping(true);
      }
    }
  }, [displayRole, typing, roleIdx]);

  // Counter animation on mount
  useEffect(() => {
    if (countsStarted.current) return;
    countsStarted.current = true;
    STATS.forEach((stat, i) => {
      let current = 0;
      const step = Math.ceil(stat.end / 45);
      const interval = setInterval(() => {
        current = Math.min(current + step, stat.end);
        setCounts((prev) => { const n = [...prev]; n[i] = current; return n; });
        if (current >= stat.end) clearInterval(interval);
      }, 28);
    });
  }, []);

  // Code typewriter
  useEffect(() => {
    if (codeVisible >= CODE.length) return;
    const t = setTimeout(() => setCodeVisible((v) => Math.min(v + 3, CODE.length)), 18);
    return () => clearTimeout(t);
  }, [codeVisible]);

  return (
    <section className="relative min-h-[95vh] flex items-center overflow-hidden">
      <ParticleCanvas />

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="hero-orb-1" />
        <div className="hero-orb-2" />
        <div className="hero-orb-3" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      <div className="relative mx-auto max-w-7xl px-6 py-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20 items-center">

          {/* Left column */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-7 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
              style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.35)", color: "var(--color-purple-400)" }}>
              <Sparkles className="h-3 w-3" />
              AI Engineering Platform · Free Forever
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-6xl xl:text-[4.5rem] font-bold tracking-tight mb-6"
              style={{ color: "var(--color-text-primary)", lineHeight: 1.05 }}>
              Built for<br />
              <span className="gradient-text" style={{ minHeight: "1.2em", display: "block" }}>
                {displayRole}
                <span className="cursor-blink" style={{ color: "var(--color-cyan-400)", fontWeight: 300 }}>|</span>
              </span>
            </h1>

            <p className="text-lg mb-10 leading-relaxed"
              style={{ color: "var(--color-text-secondary)", maxWidth: "38rem" }}>
              From fundamentals to production systems — expert courses, interactive notebook playground,
              DataLab agent, live demos, and deep-dive guides. No paywalls. No fluff.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-14">
              <Link href="/learn"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
                  color: "#fff",
                  boxShadow: "var(--glow-purple-sm)",
                }}>
                Start Learning <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/playground"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all hover:-translate-y-0.5"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--color-border-default)",
                  color: "var(--color-text-primary)",
                }}>
                <Terminal className="h-4 w-4" style={{ color: "var(--color-cyan-400)" }} />
                Open Notebook
              </Link>
            </div>

            {/* Stat counters */}
            <div className="grid grid-cols-4 gap-3 mb-12">
              {STATS.map((stat, i) => (
                <div key={stat.label} className="text-center p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border-subtle)" }}>
                  <div className="text-2xl font-bold gradient-text">{counts[i]}{stat.suffix}</div>
                  <div className="text-xs mt-1 leading-tight" style={{ color: "var(--color-text-muted)" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border-subtle)" }}>
                  <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--color-purple-400)" }} />
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{label}</div>
                    <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — animated code card */}
          <div className="hidden lg:block">
            <div className="rounded-2xl overflow-hidden hero-code-card"
              style={{
                border: "1px solid rgba(124,58,237,0.25)",
                background: "rgba(10,10,18,0.9)",
                boxShadow: "0 0 80px rgba(124,58,237,0.12), 0 0 160px rgba(6,182,212,0.05), inset 0 1px 0 rgba(255,255,255,0.05)",
                backdropFilter: "blur(20px)",
              }}>

              {/* Window chrome */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full transition-all" style={{ background: "#ff5f57" }} />
                  <div className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
                  <div className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
                </div>
                <span className="text-xs px-3 py-1 rounded-md" style={{ color: "var(--color-text-disabled)", background: "rgba(255,255,255,0.04)" }}>
                  rag_pipeline.py
                </span>
                <div className="flex gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--color-cyan-400)" }} />
                  <span className="text-xs" style={{ color: "var(--color-cyan-400)" }}>live</span>
                </div>
              </div>

              {/* Line numbers + code */}
              <div className="flex" style={{ background: "rgba(0,0,0,0.2)" }}>
                <div className="px-3 pt-5 pb-5 text-right select-none"
                  style={{ color: "var(--color-text-disabled)", fontFamily: "var(--font-jetbrains, monospace)", fontSize: 12, lineHeight: "1.75", minWidth: 36 }}>
                  {CODE.slice(0, codeVisible).split("\n").map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <pre className="flex-1 px-4 py-5 text-sm leading-7 overflow-hidden"
                  style={{ fontFamily: "var(--font-jetbrains, monospace)", color: "var(--color-text-secondary)", minHeight: 340 }}>
                  <code>
                    {CODE.slice(0, codeVisible)
                      .split("\n")
                      .map((line, i) => (
                        <div key={i}>{syntaxHighlight(line)}</div>
                      ))}
                    {codeVisible < CODE.length && (
                      <span className="cursor-blink" style={{ color: "var(--color-cyan-400)" }}>▊</span>
                    )}
                  </code>
                </pre>
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-between px-4 py-2 text-xs"
                style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.2)", color: "var(--color-text-disabled)" }}>
                <span>Python 3.12 · groq 0.13</span>
                <span style={{ color: "var(--color-success)" }}>● Ready</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// Minimal inline syntax highlighting
function syntaxHighlight(line: string) {
  const keywords = /\b(from|import|def|return|class|if|else|for|in|True|False|None|and|or|not|with|as|print)\b/g;
  const strings = /(["'`])(.*?)\1/g;
  const comments = /(#.*$)/;
  const numbers = /\b(\d+)\b/g;

  if (comments.test(line)) {
    const idx = line.indexOf("#");
    return (
      <>
        {line.slice(0, idx)}
        <span style={{ color: "var(--color-text-muted)" }}>{line.slice(idx)}</span>
      </>
    );
  }

  const parts: React.ReactNode[] = [];
  let last = 0;
  const allMatches: { index: number; length: number; text: string; type: string }[] = [];

  let m: RegExpExecArray | null;
  const kw = new RegExp(keywords.source, "g");
  while ((m = kw.exec(line)) !== null) allMatches.push({ index: m.index, length: m[0].length, text: m[0], type: "keyword" });
  const strRe = new RegExp(strings.source, "g");
  while ((m = strRe.exec(line)) !== null) allMatches.push({ index: m.index, length: m[0].length, text: m[0], type: "string" });
  const numRe = new RegExp(numbers.source, "g");
  while ((m = numRe.exec(line)) !== null) allMatches.push({ index: m.index, length: m[0].length, text: m[0], type: "number" });

  allMatches.sort((a, b) => a.index - b.index);

  for (const match of allMatches) {
    if (match.index < last) continue;
    if (match.index > last) parts.push(<span key={last}>{line.slice(last, match.index)}</span>);
    const color = match.type === "keyword" ? "#c084fc" : match.type === "string" ? "#86efac" : "#fb923c";
    parts.push(<span key={match.index} style={{ color }}>{match.text}</span>);
    last = match.index + match.length;
  }
  if (last < line.length) parts.push(<span key={last}>{line.slice(last)}</span>);
  return parts.length ? parts : line;
}
