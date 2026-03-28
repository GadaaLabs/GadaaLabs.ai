import type { Metadata } from "next";
import Link from "next/link";
import { BookMarked, Clock, ChevronRight, Terminal } from "lucide-react";
import { getAllGuides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guides",
  description: "Step-by-step technical guides for AI engineers — environment setup, RAG pipelines, model deployment, and more.",
};

const difficultyColor: Record<string, { color: string; bg: string; border: string }> = {
  beginner:     { color: "#34d399", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)" },
  intermediate: { color: "#fbbf24", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  advanced:     { color: "#f87171", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)" },
};

export default function GuidesPage() {
  const guides = getAllGuides();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, var(--color-purple-600), var(--color-cyan-500))" }}>
            <BookMarked className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              Technical Guides
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Step-by-step walkthroughs for real engineering tasks
            </p>
          </div>
        </div>
        <p className="text-base max-w-2xl leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          Detailed guides covering environment setup, building production AI systems, deploying models,
          and everything in between — written for engineers who want depth, not summaries.
        </p>
      </div>

      {guides.length === 0 ? (
        <div className="text-center py-24 rounded-2xl"
          style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
          <Terminal className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--color-text-disabled)" }} />
          <p className="text-lg font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>Guides coming soon</p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Check back shortly — guides are being published now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {guides.map((guide) => {
            const d = difficultyColor[guide.difficulty] ?? difficultyColor.beginner;
            return (
              <Link key={guide.slug} href={`/guides/${guide.slug}`}
                className="group rounded-2xl p-6 flex flex-col transition-all hover:-translate-y-1"
                style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>

                {/* Top row */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                    style={{ color: d.color, background: d.bg, border: `1px solid ${d.border}` }}>
                    {guide.difficulty}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    <Clock className="h-3.5 w-3.5" />
                    {guide.estimatedTime} min
                  </div>
                </div>

                {/* Content */}
                <h2 className="font-bold text-lg mb-2 group-hover:text-white transition-colors leading-snug"
                  style={{ color: "var(--color-text-primary)" }}>
                  {guide.title}
                </h2>
                <p className="text-sm leading-relaxed mb-4 flex-1"
                  style={{ color: "var(--color-text-muted)" }}>
                  {guide.description}
                </p>

                {/* Prerequisites */}
                {guide.prerequisites.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs mb-1.5" style={{ color: "var(--color-text-disabled)" }}>Prerequisites</p>
                    <div className="flex flex-wrap gap-1.5">
                      {guide.prerequisites.map((p) => (
                        <span key={p} className="text-xs px-2 py-0.5 rounded-md"
                          style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-muted)", border: "1px solid var(--color-border-subtle)" }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {guide.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-md"
                      style={{ background: "rgba(124,58,237,0.08)", color: "var(--color-purple-400)", border: "1px solid rgba(124,58,237,0.2)" }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <div className="flex items-center gap-1.5 text-sm font-semibold"
                  style={{ color: "var(--color-purple-400)" }}>
                  Read guide <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
