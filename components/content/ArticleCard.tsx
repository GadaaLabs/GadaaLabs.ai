import Link from "next/link";
import type { Article } from "@/lib/articles";
import { Clock, Tag } from "lucide-react";

const difficultyColor = {
  beginner:     { color: "#34d399", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)" },
  intermediate: { color: "#fbbf24", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  advanced:     { color: "#f87171", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)" },
};

export function ArticleCard({ article }: { article: Article }) {
  const d = difficultyColor[article.difficulty];

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group block rounded-2xl p-6 transition-all hover:-translate-y-1"
      style={{
        background: "var(--color-bg-surface)",
        border: "1px solid var(--color-border-default)",
      }}
    >
      {/* Difficulty + reading time */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize"
          style={{ color: d.color, background: d.bg, border: `1px solid ${d.border}` }}
        >
          {article.difficulty}
        </span>
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
          <Clock className="h-3 w-3" />
          {article.readingTimeText}
        </span>
      </div>

      {/* Title */}
      <h3
        className="text-lg font-bold mb-2 leading-snug group-hover:text-white transition-colors"
        style={{ color: "var(--color-text-primary)" }}
      >
        {article.title}
      </h3>

      {/* Description */}
      <p
        className="text-sm leading-relaxed mb-4 line-clamp-3"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {article.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {article.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md"
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

      {/* Footer */}
      <div
        className="mt-4 pt-4 flex items-center justify-between text-xs"
        style={{ borderTop: "1px solid var(--color-border-subtle)", color: "var(--color-text-muted)" }}
      >
        <span>{article.author}</span>
        <span>{new Date(article.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      </div>
    </Link>
  );
}
