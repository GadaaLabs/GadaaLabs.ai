import type { Metadata } from "next";
import Link from "next/link";
import { getAllCourses } from "@/lib/courses";
import { getAllArticles } from "@/lib/articles";
import { BookOpen, FileText, ArrowRight, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Learn",
  description: "AI engineering courses, articles, and guides — built for developers.",
};

const difficultyColor = {
  beginner:     { color: "#34d399", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)" },
  intermediate: { color: "#fbbf24", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  advanced:     { color: "#f87171", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)" },
};

export default function LearnPage() {
  const courses = getAllCourses();
  const articles = getAllArticles().slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
          Learn <span className="gradient-text">AI Engineering</span>
        </h1>
        <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
          Structured courses, deep-dive articles, and hands-on exercises.
        </p>
      </div>

      {/* Courses */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
            <BookOpen className="h-5 w-5" style={{ color: "var(--color-purple-400)" }} />
            Courses
          </h2>
          <Link href="/courses" className="text-sm flex items-center gap-1" style={{ color: "var(--color-purple-400)" }}>
            All courses <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {courses.map((course) => {
            const d = difficultyColor[course.difficulty];
            const totalMins = course.lessons.reduce((s, l) => s + l.duration, 0);
            return (
              <Link
                key={course.slug}
                href={`/courses/${course.slug}`}
                className="group rounded-2xl p-6 transition-all hover:-translate-y-1"
                style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize"
                    style={{ color: d.color, background: d.bg, border: `1px solid ${d.border}` }}>
                    {course.difficulty}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    <Clock className="h-3 w-3" />{totalMins} min · {course.lessons.length} lessons
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-white transition-colors"
                  style={{ color: "var(--color-text-primary)" }}>{course.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {course.description}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-purple-400)" }}>
                  Start course <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Articles */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
            <FileText className="h-5 w-5" style={{ color: "var(--color-purple-400)" }} />
            Recent Articles
          </h2>
          <Link href="/articles" className="text-sm flex items-center gap-1" style={{ color: "var(--color-purple-400)" }}>
            All articles <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {articles.map((article) => {
            const d = difficultyColor[article.difficulty];
            return (
              <Link key={article.slug} href={`/articles/${article.slug}`}
                className="group rounded-2xl p-5 transition-all hover:-translate-y-1"
                style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize"
                    style={{ color: d.color, background: d.bg, border: `1px solid ${d.border}` }}>
                    {article.difficulty}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{article.readingTimeText}</span>
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-white transition-colors"
                  style={{ color: "var(--color-text-primary)" }}>{article.title}</h3>
                <p className="text-sm line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>
                  {article.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
