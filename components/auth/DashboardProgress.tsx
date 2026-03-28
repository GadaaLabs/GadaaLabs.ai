"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, BookOpen, HelpCircle, ArrowRight } from "lucide-react";

interface CourseInfo {
  slug: string;
  title: string;
  difficulty: string;
  totalLessons: number;
}

interface Props {
  userId: string;
  courses: CourseInfo[];
  quizSlugs: string[];
}

const difficultyColor: Record<string, { color: string; bg: string; border: string }> = {
  beginner:     { color: "#34d399", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)" },
  intermediate: { color: "#fbbf24", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  advanced:     { color: "#f87171", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)" },
};

export function DashboardProgress({ userId, courses, quizSlugs }: Props) {
  const [progress, setProgress] = useState<Record<string, string[]>>({});
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);

  useEffect(() => {
    const key = `gadaalabs_progress_${userId}`;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgress(JSON.parse(localStorage.getItem(key) ?? "{}"));
    } catch { /* ignore */ }

    const quizKey = `gadaalabs_quiz_results_${userId}`;
    try {
      const quizData = JSON.parse(localStorage.getItem(quizKey) ?? "{}");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompletedQuizzes(Object.keys(quizData));
    } catch { /* ignore */ }
  }, [userId]);

  const totalLessons = courses.reduce((s, c) => s + c.totalLessons, 0);
  const completedLessons = courses.reduce((s, c) => s + (progress[c.slug]?.length ?? 0), 0);

  return (
    <div className="space-y-10">
      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Lessons Completed", value: completedLessons, total: totalLessons },
          { label: "Courses Started", value: courses.filter((c) => (progress[c.slug]?.length ?? 0) > 0).length, total: courses.length },
          { label: "Quizzes Taken", value: completedQuizzes.length, total: quizSlugs.length },
          { label: "Overall Progress", value: `${totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%`, total: null },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-5 text-center"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
            <div className="text-2xl font-bold gradient-text">
              {s.value}{s.total !== null ? <span className="text-sm font-normal" style={{ color: "var(--color-text-muted)" }}>/{s.total}</span> : ""}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Course progress */}
      <div>
        <h2 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
          <BookOpen className="h-5 w-5" style={{ color: "var(--color-purple-400)" }} />
          Course Progress
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => {
            const done = progress[course.slug]?.length ?? 0;
            const pct = course.totalLessons > 0 ? Math.round((done / course.totalLessons) * 100) : 0;
            const d = difficultyColor[course.difficulty] ?? difficultyColor.beginner;
            return (
              <Link key={course.slug} href={`/courses/${course.slug}`}
                className="group rounded-xl p-5 transition-all hover:-translate-y-0.5"
                style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                    style={{ color: d.color, background: d.bg, border: `1px solid ${d.border}` }}>
                    {course.difficulty}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {done}/{course.totalLessons} lessons
                  </span>
                </div>
                <h3 className="font-semibold mb-3 group-hover:text-white transition-colors"
                  style={{ color: "var(--color-text-primary)" }}>
                  {course.title}
                </h3>
                {/* Progress bar */}
                <div className="rounded-full overflow-hidden mb-1" style={{ height: 4, background: "var(--color-bg-elevated)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: pct === 100
                        ? "var(--color-success)"
                        : "linear-gradient(90deg, var(--color-purple-600), var(--color-cyan-500))",
                    }} />
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span style={{ color: "var(--color-text-muted)" }}>{pct}% complete</span>
                  {pct === 100 && <CheckCircle className="h-3.5 w-3.5" style={{ color: "var(--color-success)" }} />}
                  {pct < 100 && <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--color-purple-400)" }} />}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quizzes */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
          <HelpCircle className="h-5 w-5" style={{ color: "var(--color-purple-400)" }} />
          Quizzes
        </h2>
        <div className="flex flex-wrap gap-3">
          {quizSlugs.map((slug) => {
            const done = completedQuizzes.includes(slug);
            return (
              <Link key={slug} href={`/quizzes/${slug}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
                style={{
                  background: done ? "rgba(16,185,129,0.08)" : "var(--color-bg-surface)",
                  border: `1px solid ${done ? "rgba(16,185,129,0.25)" : "var(--color-border-default)"}`,
                  color: done ? "var(--color-success)" : "var(--color-text-secondary)",
                }}>
                {done && <CheckCircle className="h-3.5 w-3.5" />}
                {slug.replace(/-/g, " ")}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
