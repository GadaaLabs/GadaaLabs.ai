import type { Metadata } from "next";
import Link from "next/link";
import registry from "@/content/demos/registry.json";
import { Cpu, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Demos",
  description: "Interactive AI demos — live LLM chat, tokenizer, and more. No account needed.",
};

export default function DemosPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)" }}>
          <Cpu className="h-4 w-4" style={{ color: "var(--color-cyan-400)" }} />
        </div>
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>Interactive Demos</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Live AI experiments — no account, no setup.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {registry.map((demo) => (
          <Link key={demo.slug} href={`/demos/${demo.slug}`}
            className="group rounded-2xl p-6 transition-all hover:-translate-y-1"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
            <div className="flex flex-wrap gap-2 mb-3">
              {demo.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-md"
                  style={{
                    background: "rgba(6,182,212,0.08)",
                    border: "1px solid rgba(6,182,212,0.2)",
                    color: "var(--color-cyan-400)",
                  }}>
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="text-lg font-bold mb-2 group-hover:text-white transition-colors"
              style={{ color: "var(--color-text-primary)" }}>{demo.title}</h3>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-text-secondary)" }}>
              {demo.description}
            </p>
            <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--color-cyan-400)" }}>
              Open demo <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
