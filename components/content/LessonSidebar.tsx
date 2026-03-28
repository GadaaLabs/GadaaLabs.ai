"use client";

import Link from "next/link";
import { CheckCircle, Circle, BookOpen } from "lucide-react";
import { useSession } from "next-auth/react";
import { useProgress } from "@/hooks/useProgress";
import type { LessonMeta } from "@/lib/courses";

interface Props {
  courseSlug: string;
  courseTitle: string;
  lessons: LessonMeta[];
  currentLesson: string;
}

export function LessonSidebar({ courseSlug, courseTitle, lessons, currentLesson }: Props) {
  const { data: session } = useSession();
  const { isComplete } = useProgress(courseSlug, session?.user?.id);

  return (
    <aside className="w-64 shrink-0">
      <div className="sticky top-24 rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--color-border-default)" }}>
        {/* Course title */}
        <div className="px-4 py-3 flex items-center gap-2"
          style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-subtle)" }}>
          <BookOpen className="h-4 w-4 shrink-0" style={{ color: "var(--color-purple-400)" }} />
          <span className="text-xs font-semibold line-clamp-2" style={{ color: "var(--color-text-primary)" }}>
            {courseTitle}
          </span>
        </div>

        {/* Lesson list */}
        <div style={{ background: "var(--color-bg-surface)" }}>
          {lessons.map((lesson, i) => {
            const active = lesson.slug === currentLesson;
            const done = isComplete(lesson.slug);
            return (
              <Link key={lesson.slug}
                href={`/courses/${courseSlug}/${lesson.slug}`}
                className="flex items-start gap-3 px-4 py-3 transition-colors"
                style={{
                  background: active ? "rgba(124,58,237,0.1)" : "transparent",
                  borderLeft: active ? "2px solid var(--color-purple-500)" : "2px solid transparent",
                  borderBottom: i < lessons.length - 1 ? "1px solid var(--color-border-subtle)" : "none",
                }}>
                {done ? (
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-success)" }} />
                ) : (
                  <Circle className="h-4 w-4 mt-0.5 shrink-0"
                    style={{ color: active ? "var(--color-purple-400)" : "var(--color-text-disabled)" }} />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-snug"
                    style={{ color: active ? "var(--color-purple-300)" : done ? "var(--color-text-secondary)" : "var(--color-text-muted)" }}>
                    {lesson.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-disabled)" }}>
                    {lesson.duration} min
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
