import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { ParticleCanvas } from "./ParticleCanvas";

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Particle background */}
      <ParticleCanvas />

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(124,58,237,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-24 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
          style={{
            background: "rgba(124, 58, 237, 0.12)",
            border: "1px solid rgba(124, 58, 237, 0.35)",
            color: "var(--color-purple-400)",
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          AI Engineering Education
        </div>

        {/* Headline */}
        <h1
          className="mx-auto max-w-4xl text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
          style={{ color: "var(--color-text-primary)", lineHeight: 1.1 }}
        >
          Learn AI Engineering.{" "}
          <span className="gradient-text">Ship Real Products.</span>
        </h1>

        {/* Subheadline */}
        <p
          className="mx-auto max-w-2xl text-lg md:text-xl mb-10 leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Deep-dive articles, interactive demos, hands-on courses, and live API
          playgrounds — built for developers who want to go beyond the hype.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all"
            style={{
              background:
                "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
              color: "#fff",
              boxShadow: "var(--glow-purple-sm)",
            }}
          >
            Start Learning
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/demos"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-primary)",
            }}
          >
            <Play className="h-4 w-4" style={{ color: "var(--color-cyan-400)" }} />
            Explore Demos
          </Link>
        </div>

        {/* Stats strip */}
        <div className="mt-20 flex flex-wrap justify-center gap-8 md:gap-16">
          {[
            { value: "Free", label: "Always free to learn" },
            { value: "Open", label: "Open-source AI models" },
            { value: "Live", label: "Real API playgrounds" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="text-2xl font-bold gradient-text"
              >
                {stat.value}
              </div>
              <div
                className="text-sm mt-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
