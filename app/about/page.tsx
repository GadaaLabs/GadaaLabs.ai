import type { Metadata } from "next";
import Link from "next/link";
import {
  Zap, Brain, Code2, Heart, Target, Globe, Cpu,
  ArrowRight, BookOpen, Rocket, Users, Star,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "GadaaLabs is an AI educational platform built by Seifedin Hussen — Electrical and ML Engineer — to make production-grade AI engineering accessible to every developer on the planet.",
};

const values = [
  {
    icon: BookOpen,
    title: "Depth Over Hype",
    body: "We skip the buzzwords and go straight to the engineering. Every lesson, guide, and demo is built around what you actually need to ship real products — not what sounds impressive in a LinkedIn post.",
  },
  {
    icon: Heart,
    title: "Free Forever",
    body: "Quality AI education should not be gated by a subscription fee. GadaaLabs will always keep its core curriculum free. We believe that democratising access to this knowledge is a moral imperative, not a marketing strategy.",
  },
  {
    icon: Code2,
    title: "Learn by Building",
    body: "Reading about transformers is not the same as running one. Everything on this platform is interactive — live demos, a notebook playground, hands-on courses, and an AI DataLab agent you can use right now.",
  },
  {
    icon: Globe,
    title: "Built for Everyone",
    body: "Whether you're a student in Addis Ababa or a senior engineer in San Francisco, the bar for entry is the same: curiosity and a willingness to learn. We build with a global audience in mind.",
  },
];

const milestones = [
  { year: "2024", event: "Concept born — the gap between AI hype and production-grade engineering was too wide to ignore." },
  { year: "Early 2025", event: "Core curriculum designed: 5 expert courses spanning Data Analysis, ML Engineering, RAG, and AI Automation." },
  { year: "Mid 2025", event: "Interactive demos and the API Playground shipped — live inference, tokenizer, and streaming chat." },
  { year: "Late 2025", event: "DataLab agent launched — AI-powered EDA, statistical analysis, and report generation in the browser." },
  { year: "2026", event: "GadaaLabs.com goes live — authentication, progress tracking, notebook playground, and guides." },
];

const stats = [
  { value: "200+", label: "Free lessons" },
  { value: "6", label: "Expert courses" },
  { value: "3", label: "Deep-dive guides" },
  { value: "12", label: "Interactive demos" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">

      {/* Hero */}
      <div className="text-center mb-20">
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
          style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--color-purple-400)" }}>
          <Zap className="h-3 w-3" /> Our Story
        </div>
        <h1 className="text-5xl font-bold mb-6 leading-tight" style={{ color: "var(--color-text-primary)" }}>
          AI Education Built for<br />
          <span className="gradient-text">Engineers Who Ship</span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          GadaaLabs was born from a simple observation: the gap between AI tutorials and production reality is enormous.
          We exist to close that gap — with rigour, honesty, and code that actually runs.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
        {stats.map(({ value, label }) => (
          <div key={label} className="rounded-xl p-5 text-center"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
            <div className="text-3xl font-bold gradient-text">{value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Mission */}
      <div className="rounded-2xl p-8 md:p-12 mb-20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.05))", border: "1px solid rgba(124,58,237,0.2)" }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--color-purple-600), var(--color-cyan-500))" }}>
              <Target className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Our Mission</h2>
          </div>
          <p className="text-xl leading-relaxed mb-6" style={{ color: "var(--color-text-secondary)" }}>
            To make production-grade AI engineering knowledge accessible to every developer on the planet —
            regardless of their background, location, or budget.
          </p>
          <p className="text-base leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            We are not building another course platform. We are building the resource we wished existed when
            we were trying to go from understanding transformers in theory to deploying them at scale in production.
            That means expert-level content, real working code, and an environment where you can experiment live —
            all without paying a single dollar.
          </p>
        </div>
      </div>

      {/* Founder */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3" style={{ color: "var(--color-text-primary)" }}>
          <Users className="h-6 w-6" style={{ color: "var(--color-purple-400)" }} />
          The Founder
        </h2>

        <div className="rounded-2xl overflow-hidden"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
          <div className="md:flex">
            {/* Avatar block */}
            <div className="md:w-56 shrink-0 flex flex-col items-center justify-center p-8"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.06))", borderRight: "1px solid var(--color-border-subtle)" }}>
              <div className="flex h-24 w-24 items-center justify-center rounded-full mb-4"
                style={{ background: "linear-gradient(135deg, var(--color-purple-600), var(--color-cyan-500))", boxShadow: "var(--glow-purple)" }}>
                <span className="text-3xl font-bold text-white">SH</span>
              </div>
              <div className="text-center">
                <p className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>Seifedin Hussen</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-purple-400)" }}>Founder & Lead Engineer</p>
              </div>
              <div className="flex flex-col gap-2 mt-5 w-full">
                <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: "rgba(124,58,237,0.1)", color: "var(--color-purple-300)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <Cpu className="h-3.5 w-3.5" /> Electrical Engineer
                </div>
                <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: "rgba(6,182,212,0.08)", color: "var(--color-cyan-400)", border: "1px solid rgba(6,182,212,0.2)" }}>
                  <Brain className="h-3.5 w-3.5" /> ML Engineer
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="flex-1 p-8">
              <blockquote className="text-lg font-medium italic mb-6 pl-4"
                style={{ color: "var(--color-text-primary)", borderLeft: "3px solid var(--color-purple-500)" }}>
                "The most dangerous gap in AI today is not between models and humans — it is between
                engineers who understand the theory and engineers who can ship it to production.
                GadaaLabs exists to eliminate that gap."
              </blockquote>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                <p>
                  Seifedin Hussen is an Electrical and Machine Learning Engineer whose work sits at the intersection
                  of signal processing, deep learning, and production AI systems. With a foundation in electrical
                  engineering — where precision, systems thinking, and first-principles problem solving are non-negotiable —
                  he brought that same rigour into the world of machine learning.
                </p>
                <p>
                  After spending years navigating the frustrating disconnect between academic ML and real engineering
                  practice, Seifedin built GadaaLabs to be the platform he needed but could not find. Not a collection
                  of notebooks that stop at 90% accuracy on a toy dataset — but a curriculum that teaches you how to
                  think about data pipelines, model serving, drift detection, RAG architectures, and AI automation
                  the way you would if your job depended on it.
                </p>
                <p>
                  His belief is straightforward: the best engineers are the ones who can move fluidly between
                  low-level fundamentals and high-level system design. GadaaLabs is built to develop exactly that
                  kind of engineer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3" style={{ color: "var(--color-text-primary)" }}>
          <Star className="h-6 w-6" style={{ color: "var(--color-purple-400)" }} />
          What We Stand For
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {values.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl p-6"
              style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <Icon className="h-4.5 w-4.5" style={{ color: "var(--color-purple-400)" }} />
                </div>
                <h3 className="font-bold" style={{ color: "var(--color-text-primary)" }}>{title}</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3" style={{ color: "var(--color-text-primary)" }}>
          <Rocket className="h-6 w-6" style={{ color: "var(--color-purple-400)" }} />
          How We Got Here
        </h2>
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: "var(--color-border-default)" }} />
          <div className="space-y-6">
            {milestones.map(({ year, event }, i) => (
              <div key={i} className="flex gap-6 pl-14 relative">
                <div className="absolute left-3.5 top-1 h-3 w-3 rounded-full border-2"
                  style={{ background: "var(--color-purple-600)", borderColor: "var(--color-purple-400)", transform: "translateX(-50%)" }} />
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-purple-400)" }}>
                    {year}
                  </span>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What's next */}
      <div className="rounded-2xl p-8 mb-20 text-center relative overflow-hidden"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(124,58,237,0.08) 0%, transparent 70%)" }} />
        <div className="relative">
          <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>What Comes Next</h2>
          <p className="text-base leading-relaxed mb-8 max-w-xl mx-auto" style={{ color: "var(--color-text-muted)" }}>
            We are building towards community-driven learning — peer review, certificates,
            contributed courses, and semantic search across the entire knowledge base.
            The roadmap is shaped by the engineers who use the platform.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/learn"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
                color: "#fff",
                boxShadow: "var(--glow-purple-sm)",
              }}>
              Start Learning <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/donate"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-text-primary)",
              }}>
              <Heart className="h-4 w-4" style={{ color: "#ec4899" }} /> Support the Mission
            </Link>
          </div>
        </div>
      </div>

      {/* Origin of the name */}
      <div className="rounded-2xl p-8 text-center"
        style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.15)" }}>
        <h3 className="text-lg font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
          Why <span className="gradient-text">GadaaLabs</span>?
        </h3>
        <p className="text-sm leading-relaxed max-w-2xl mx-auto" style={{ color: "var(--color-text-muted)" }}>
          <em>Gadaa</em> is a centuries-old democratic governance and knowledge-transfer system of the Oromo people
          of East Africa — a civilisation built on the principle that knowledge and leadership must be passed
          systematically from one generation to the next. It is one of humanity's oldest and most sophisticated
          frameworks for structured learning. GadaaLabs carries that spirit forward: structured, rigorous,
          community-centred knowledge transfer — for the age of artificial intelligence.
        </p>
      </div>

    </div>
  );
}
