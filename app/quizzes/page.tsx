import type { Metadata } from "next";
import Link from "next/link";
import { getAllQuizzes } from "@/lib/quizzes";
import { HelpCircle, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Quizzes",
  description: "Test your AI engineering knowledge with hands-on quizzes.",
};

const difficultyColor = {
  beginner:     { color: "#34d399", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)" },
  intermediate: { color: "#fbbf24", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  advanced:     { color: "#f87171", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)" },
};

export default function QuizzesPage() {
  const quizzes = getAllQuizzes();
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}>
          <HelpCircle className="h-4 w-4" style={{ color: "var(--color-purple-400)" }} />
        </div>
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>Quizzes</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Test your understanding. Explanations included for every question.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {quizzes.map((quiz) => {
          const d = difficultyColor[quiz.difficulty];
          return (
            <Link key={quiz.slug} href={`/quizzes/${quiz.slug}`}
              className="group rounded-2xl p-6 transition-all hover:-translate-y-1"
              style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize"
                  style={{ color: d.color, background: d.bg, border: `1px solid ${d.border}` }}>
                  {quiz.difficulty}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {quiz.questions.length} questions
                </span>
              </div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-white transition-colors"
                style={{ color: "var(--color-text-primary)" }}>{quiz.title}</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-text-secondary)" }}>
                {quiz.description}
              </p>
              <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--color-purple-400)" }}>
                Start quiz <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
