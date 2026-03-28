import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getQuizBySlug, getAllQuizzes } from "@/lib/quizzes";
import { QuizSession } from "@/components/quiz/QuizSession";
import { ArrowLeft } from "lucide-react";

export function generateStaticParams() {
  return getAllQuizzes().map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const quiz = getQuizBySlug(slug);
  if (!quiz) return {};
  return { title: quiz.title, description: quiz.description };
}

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const quiz = getQuizBySlug(slug);
  if (!quiz) notFound();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link href="/quizzes" className="inline-flex items-center gap-1.5 text-sm mb-8"
        style={{ color: "var(--color-text-muted)" }}>
        <ArrowLeft className="h-3.5 w-3.5" /> All Quizzes
      </Link>
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
          {quiz.title}
        </h1>
        <p className="text-base" style={{ color: "var(--color-text-secondary)" }}>{quiz.description}</p>
      </div>
      <QuizSession quiz={quiz} />
    </div>
  );
}
