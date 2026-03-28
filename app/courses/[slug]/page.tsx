import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseBySlug, getAllCourses } from "@/lib/courses";
import { BookOpen, Clock, ArrowRight, CheckCircle } from "lucide-react";

export async function generateStaticParams() {
  return getAllCourses().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) return {};
  return { title: course.title, description: course.description };
}

const difficultyColor = {
  beginner:     { color: "#34d399", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)" },
  intermediate: { color: "#fbbf24", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  advanced:     { color: "#f87171", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)" },
};

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) notFound();

  const d = difficultyColor[course.difficulty];
  const totalMins = course.lessons.reduce((s, l) => s + l.duration, 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Back */}
      <Link href="/learn" className="inline-flex items-center gap-2 text-sm mb-8"
        style={{ color: "var(--color-text-muted)" }}>
        ← Back to Learn
      </Link>

      {/* Header */}
      <div className="mb-10">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize"
            style={{ color: d.color, background: d.bg, border: `1px solid ${d.border}` }}>
            {course.difficulty}
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <Clock className="h-3.5 w-3.5" />{totalMins} min total
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <BookOpen className="h-3.5 w-3.5" />{course.lessons.length} lessons
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>
          {course.title}
        </h1>
        <p className="text-lg leading-relaxed mb-6" style={{ color: "var(--color-text-secondary)" }}>
          {course.description}
        </p>
        <div className="flex flex-wrap gap-2">
          {course.tags.map((tag) => (
            <span key={tag} className="text-xs px-2.5 py-1 rounded-lg"
              style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-muted)", border: "1px solid var(--color-border-subtle)" }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Start CTA */}
      <Link href={`/courses/${slug}/${course.lessons[0].slug}`}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold mb-10"
        style={{
          background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
          color: "#fff", boxShadow: "var(--glow-purple-sm)",
        }}>
        Start Course <ArrowRight className="h-4 w-4" />
      </Link>

      {/* Lesson list */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border-default)" }}>
        <div className="px-6 py-4" style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-subtle)" }}>
          <h2 className="font-semibold" style={{ color: "var(--color-text-primary)" }}>Course Lessons</h2>
        </div>
        {course.lessons.map((lesson, i) => (
          <Link key={lesson.slug} href={`/courses/${slug}/${lesson.slug}`}
            className="flex items-center gap-4 px-6 py-4 transition-colors group"
            style={{
              background: "var(--color-bg-surface)",
              borderBottom: i < course.lessons.length - 1 ? "1px solid var(--color-border-subtle)" : "none",
            }}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: "var(--color-bg-elevated)", color: "var(--color-purple-400)", border: "1px solid var(--color-border-default)" }}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium group-hover:text-white transition-colors truncate"
                style={{ color: "var(--color-text-primary)" }}>{lesson.title}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{lesson.duration} min</span>
              <CheckCircle className="h-4 w-4 opacity-0 group-hover:opacity-60 transition-opacity"
                style={{ color: "var(--color-purple-400)" }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
