import type { Metadata } from "next";
import { getAllArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/content/ArticleCard";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Articles",
  description:
    "Technical deep-dives on LLMs, prompt engineering, RAG, agents, and AI systems — written for engineers.",
};

export default function ArticlesPage() {
  const articles = getAllArticles();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: "rgba(124, 58, 237, 0.12)",
              border: "1px solid rgba(124, 58, 237, 0.25)",
            }}
          >
            <FileText className="h-4 w-4" style={{ color: "var(--color-purple-400)" }} />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Articles
          </h1>
        </div>
        <p className="text-base max-w-xl" style={{ color: "var(--color-text-secondary)" }}>
          Technical deep-dives on AI systems, LLM internals, and engineering patterns — with code you can run.
        </p>
      </div>

      {/* Article grid */}
      {articles.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>No articles yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
