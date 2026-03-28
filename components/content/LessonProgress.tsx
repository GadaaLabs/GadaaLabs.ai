"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { useProgress } from "@/hooks/useProgress";

interface Props {
  courseSlug: string;
  lessonSlug: string;
  prevLesson: { slug: string; title: string } | null;
  nextLesson: { slug: string; title: string } | null;
}

export function LessonProgress({ courseSlug, lessonSlug, prevLesson, nextLesson }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const { isComplete, markComplete } = useProgress(courseSlug, session?.user?.id);
  const done = isComplete(lessonSlug);

  const handleComplete = () => {
    markComplete(lessonSlug);
    if (nextLesson) {
      router.push(`/courses/${courseSlug}/${nextLesson.slug}`);
    }
  };

  return (
    <div className="mt-12 pt-8" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
      {/* Mark complete button */}
      {!done && (
        <button
          onClick={handleComplete}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mb-6 transition-all"
          style={{
            background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
            color: "#fff",
            boxShadow: "var(--glow-purple-sm)",
          }}
        >
          <CheckCircle className="h-4 w-4" />
          {nextLesson ? "Mark Complete & Continue" : "Mark Complete"}
        </button>
      )}

      {done && (
        <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded-xl"
          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
          <CheckCircle className="h-4 w-4" style={{ color: "var(--color-success)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--color-success)" }}>
            Lesson complete
          </span>
        </div>
      )}

      {/* Prev / Next navigation */}
      <div className="flex gap-3">
        {prevLesson && (
          <Link href={`/courses/${courseSlug}/${prevLesson.slug}`}
            className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">{prevLesson.title}</span>
          </Link>
        )}
        {nextLesson && (
          <Link href={`/courses/${courseSlug}/${nextLesson.slug}`}
            className="flex-1 flex items-center justify-end gap-2 px-4 py-3 rounded-xl text-sm transition-all"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
            <span className="truncate">{nextLesson.title}</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        )}
      </div>
    </div>
  );
}
