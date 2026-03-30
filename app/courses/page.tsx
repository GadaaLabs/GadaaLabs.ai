import type { Metadata } from "next";
import Link from "next/link";
import { getAllCourses } from "@/lib/courses";
import { BookOpen, Clock, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "All Courses",
  description: "Browse all AI engineering, Python, data science, and developer courses — free, browser-based, and built for engineers.",
};

const difficultyColor = {
  beginner:     { color: "#34d399", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)" },
  intermediate: { color: "#fbbf24", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  advanced:     { color: "#f87171", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)" },
};

export default function CoursesPage() {
  const courses = getAllCourses();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <Link href="/learn" className="inline-flex items-center gap-1.5 text-sm mb-6"
          style={{ color: "var(--color-text-muted)" }}>
          ← Back to Learn
        </Link>
        <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
          All <span className="gradient-text">Courses</span>
        </h1>
        <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
          {courses.length} courses covering Python, AI engineering, data science, Git, and more — all free.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((course) => {
          const d = difficultyColor[course.difficulty];
          const totalMins = course.lessons.reduce((s, l) => s + l.duration, 0);
          return (
            <Link
              key={course.slug}
              href={`/courses/${course.slug}`}
              className="group flex flex-col rounded-2xl p-6 transition-all hover:-translate-y-1"
              style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize"
                  style={{ color: d.color, background: d.bg, border: `1px solid ${d.border}` }}>
                  {course.difficulty}
                </span>
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  <Clock className="h-3 w-3" />{totalMins} min
                </span>
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  <BookOpen className="h-3 w-3" />{course.lessons.length} lessons
                </span>
              </div>
              <h2 className="text-lg font-bold mb-2 group-hover:text-white transition-colors flex-1"
                style={{ color: "var(--color-text-primary)" }}>{course.title}</h2>
              <p className="text-sm leading-relaxed mb-4 line-clamp-3"
                style={{ color: "var(--color-text-secondary)" }}>{course.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {course.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-md"
                    style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-muted)", border: "1px solid var(--color-border-subtle)" }}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold mt-auto"
                style={{ color: "var(--color-purple-400)" }}>
                Start course <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
