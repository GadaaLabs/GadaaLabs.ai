import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleBySlug, getAllArticleSlugs } from "@/lib/articles";
import { MDXContent } from "@/components/content/MDXContent";
import { ReadingProgress } from "@/components/content/ReadingProgress";
import { ArrowLeft, Clock, Calendar, Tag } from "lucide-react";

export async function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
  };
}

const difficultyColor = {
  beginner:     { color: "#34d399", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)" },
  intermediate: { color: "#fbbf24", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  advanced:     { color: "#f87171", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)" },
};

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const d = difficultyColor[article.difficulty];

  return (
    <>
    <ReadingProgress />
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex gap-10">
        {/* Main content */}
        <article className="min-w-0 flex-1 max-w-3xl">
          {/* Back link */}
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-sm mb-8 transition-colors"
            style={{ color: "var(--color-text-muted)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            All Articles
          </Link>

          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize"
              style={{ color: d.color, background: d.bg, border: `1px solid ${d.border}` }}
            >
              {article.difficulty}
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
              <Clock className="h-3.5 w-3.5" />
              {article.readingTimeText}
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
              <Calendar className="h-3.5 w-3.5" />
              {new Date(article.publishedAt).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-3xl md:text-4xl font-bold mb-4 leading-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            {article.title}
          </h1>

          {/* Description */}
          <p
            className="text-lg mb-6 leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {article.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-10 pb-8" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                style={{
                  background: "var(--color-bg-elevated)",
                  color: "var(--color-text-muted)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
          </div>

          {/* MDX body */}
          <MDXContent source={article.content} />
        </article>

        {/* Sidebar */}
        <aside className="hidden xl:block w-64 shrink-0">
          <div className="sticky top-24">
            <div
              className="rounded-xl p-5"
              style={{
                background: "var(--color-bg-surface)",
                border: "1px solid var(--color-border-default)",
              }}
            >
              <h3
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: "var(--color-text-muted)" }}
              >
                About this article
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>Author</span>
                  <p className="font-medium mt-0.5" style={{ color: "var(--color-text-primary)" }}>
                    {article.author}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>Published</span>
                  <p className="font-medium mt-0.5" style={{ color: "var(--color-text-primary)" }}>
                    {new Date(article.publishedAt).toLocaleDateString("en-US", {
                      month: "long", day: "numeric", year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>Reading time</span>
                  <p className="font-medium mt-0.5" style={{ color: "var(--color-text-primary)" }}>
                    {article.readingTimeText}
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/playground"
              className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
                color: "#fff",
                boxShadow: "var(--glow-purple-sm)",
              }}
            >
              Try in Playground →
            </Link>
          </div>
        </aside>
      </div>
    </div>
    </>
  );
}
