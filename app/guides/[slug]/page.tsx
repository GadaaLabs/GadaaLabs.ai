import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar, BookMarked, ChevronRight } from "lucide-react";
import { getAllGuideSlugs, getGuideBySlug, getAllGuides } from "@/lib/guides";
import { MDXComponents } from "@/components/content/MDXContent";

export async function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return {};
  return { title: guide.title, description: guide.description };
}

const difficultyColor: Record<string, { color: string; bg: string; border: string }> = {
  beginner:     { color: "#34d399", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)" },
  intermediate: { color: "#fbbf24", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  advanced:     { color: "#f87171", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)" },
};

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const allGuides = getAllGuides();
  const currentIdx = allGuides.findIndex((g) => g.slug === slug);
  const next = allGuides[currentIdx + 1] ?? null;

  const d = difficultyColor[guide.difficulty] ?? difficultyColor.beginner;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex gap-10 items-start">
        {/* Main content */}
        <article className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
            <Link href="/guides" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Guides
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span style={{ color: "var(--color-text-disabled)" }}>{guide.title}</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                style={{ color: d.color, background: d.bg, border: `1px solid ${d.border}` }}>
                {guide.difficulty}
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                <Clock className="h-3.5 w-3.5" /> {guide.estimatedTime} min
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                <Calendar className="h-3.5 w-3.5" />
                {new Date(guide.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>

            <h1 className="text-4xl font-bold mb-4 leading-tight" style={{ color: "var(--color-text-primary)" }}>
              {guide.title}
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {guide.description}
            </p>
          </div>

          {/* Prerequisites */}
          {guide.prerequisites.length > 0 && (
            <div className="rounded-xl p-5 mb-8"
              style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-purple-400)" }}>
                Prerequisites
              </p>
              <div className="flex flex-wrap gap-2">
                {guide.prerequisites.map((p) => (
                  <span key={p} className="text-sm px-3 py-1 rounded-lg"
                    style={{ background: "rgba(124,58,237,0.1)", color: "var(--color-purple-300)", border: "1px solid rgba(124,58,237,0.25)" }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* MDX body */}
          <div className="prose-guide">
            <MDXRemote source={guide.content} components={MDXComponents} />
          </div>

          {/* Next guide */}
          {next && (
            <div className="mt-16 pt-8" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>
                Next Guide
              </p>
              <Link href={`/guides/${next.slug}`}
                className="group flex items-center justify-between p-5 rounded-xl transition-all hover:-translate-y-0.5"
                style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
                <div>
                  <p className="font-semibold group-hover:text-white transition-colors" style={{ color: "var(--color-text-primary)" }}>
                    {next.title}
                  </p>
                  <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>{next.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 ml-4 group-hover:translate-x-1 transition-transform" style={{ color: "var(--color-purple-400)" }} />
              </Link>
            </div>
          )}
        </article>

        {/* Sidebar */}
        <aside className="hidden xl:block w-64 shrink-0 sticky top-24">
          <div className="rounded-2xl p-5"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
            <div className="flex items-center gap-2 mb-4">
              <BookMarked className="h-4 w-4" style={{ color: "var(--color-purple-400)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>All Guides</span>
            </div>
            <div className="space-y-1">
              {allGuides.map((g) => (
                <Link key={g.slug} href={`/guides/${g.slug}`}
                  className="block px-3 py-2 rounded-lg text-xs transition-colors"
                  style={{
                    background: g.slug === slug ? "rgba(124,58,237,0.1)" : "transparent",
                    color: g.slug === slug ? "var(--color-purple-400)" : "var(--color-text-muted)",
                    borderLeft: g.slug === slug ? "2px solid var(--color-purple-500)" : "2px solid transparent",
                  }}>
                  {g.title}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
