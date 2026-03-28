"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle, XCircle, RotateCcw, Trophy } from "lucide-react";
import type { Quiz } from "@/lib/quizzes";

function saveQuizResult(quizSlug: string, score: number, total: number, userId?: string) {
  if (typeof window === "undefined") return;
  const key = userId ? `gadaalabs_quiz_results_${userId}` : "gadaalabs_quiz_results";
  try {
    const existing = JSON.parse(localStorage.getItem(key) ?? "{}");
    existing[quizSlug] = { score, total, completedAt: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(existing));
  } catch { /* ignore */ }
}

export function QuizSession({ quiz }: { quiz: Quiz }) {
  const { data: session } = useSession();
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(quiz.questions.length).fill(null));
  const [done, setDone] = useState(false);

  const q = quiz.questions[current];
  const isCorrect = selected === q.correct;
  const score = answers.filter((a, i) => a === quiz.questions[i].correct).length;

  const confirm = () => {
    if (selected === null) return;
    const updated = [...answers];
    updated[current] = selected;
    setAnswers(updated);
    setConfirmed(true);
  };

  const next = () => {
    if (current < quiz.questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setConfirmed(false);
    } else {
      const finalScore = answers.filter((a, i) => a === quiz.questions[i].correct).length;
      saveQuizResult(quiz.slug, finalScore, quiz.questions.length, session?.user?.id);
      setDone(true);
    }
  };

  const reset = () => {
    setCurrent(0);
    setSelected(null);
    setConfirmed(false);
    setAnswers(Array(quiz.questions.length).fill(null));
    setDone(false);
  };

  if (done) {
    const pct = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: "rgba(124,58,237,0.12)", border: "2px solid var(--color-purple-500)" }}>
            <Trophy className="h-9 w-9" style={{ color: "var(--color-purple-400)" }} />
          </div>
        </div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
          Quiz Complete!
        </h2>
        <p className="text-lg mb-8" style={{ color: "var(--color-text-secondary)" }}>
          You scored <span className="gradient-text font-bold">{score}/{quiz.questions.length}</span> ({pct}%)
        </p>

        {/* Per-question review */}
        <div className="text-left space-y-3 mb-8">
          {quiz.questions.map((q, i) => {
            const correct = answers[i] === q.correct;
            return (
              <div key={q.id} className="flex items-start gap-3 p-4 rounded-xl"
                style={{
                  background: correct ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                  border: `1px solid ${correct ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}>
                {correct
                  ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-success)" }} />
                  : <XCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-error)" }} />}
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{q.question}</p>
                  {!correct && (
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                      Correct: <span style={{ color: "var(--color-success)" }}>{q.options[q.correct]}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold"
          style={{
            background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
            color: "#fff", boxShadow: "var(--glow-purple-sm)",
          }}>
          <RotateCcw className="h-4 w-4" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
          Question {current + 1} of {quiz.questions.length}
        </span>
        <div className="flex gap-1.5">
          {quiz.questions.map((_, i) => (
            <div key={i} className="h-1.5 w-8 rounded-full transition-all"
              style={{
                background: i < current
                  ? "var(--color-purple-600)"
                  : i === current
                  ? "var(--color-purple-400)"
                  : "var(--color-border-default)",
              }} />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="rounded-2xl p-6 mb-5"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <h2 className="text-lg font-semibold leading-snug" style={{ color: "var(--color-text-primary)" }}>
          {q.question}
        </h2>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {q.options.map((opt, i) => {
          let borderColor = "var(--color-border-default)";
          let bg = "var(--color-bg-surface)";
          let textColor = "var(--color-text-secondary)";

          if (confirmed) {
            if (i === q.correct) { borderColor = "rgba(16,185,129,0.5)"; bg = "rgba(16,185,129,0.07)"; textColor = "var(--color-text-primary)"; }
            else if (i === selected && i !== q.correct) { borderColor = "rgba(239,68,68,0.5)"; bg = "rgba(239,68,68,0.07)"; }
          } else if (selected === i) {
            borderColor = "var(--color-purple-500)";
            bg = "rgba(124,58,237,0.08)";
            textColor = "var(--color-text-primary)";
          }

          return (
            <button key={i} onClick={() => !confirmed && setSelected(i)}
              disabled={confirmed}
              className="w-full text-left px-5 py-4 rounded-xl transition-all flex items-center gap-3"
              style={{ background: bg, border: `1px solid ${borderColor}`, color: textColor }}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: selected === i && !confirmed ? "var(--color-purple-600)" : "var(--color-bg-elevated)",
                  color: selected === i && !confirmed ? "#fff" : "var(--color-text-muted)",
                  border: "1px solid var(--color-border-default)",
                }}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm leading-snug">{opt}</span>
              {confirmed && i === q.correct && <CheckCircle className="ml-auto h-4 w-4 shrink-0" style={{ color: "var(--color-success)" }} />}
              {confirmed && i === selected && i !== q.correct && <XCircle className="ml-auto h-4 w-4 shrink-0" style={{ color: "var(--color-error)" }} />}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {confirmed && (
        <div className="rounded-xl px-5 py-4 mb-6"
          style={{
            background: isCorrect ? "rgba(16,185,129,0.06)" : "rgba(59,130,246,0.06)",
            border: `1px solid ${isCorrect ? "rgba(16,185,129,0.2)" : "rgba(59,130,246,0.2)"}`,
          }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: isCorrect ? "var(--color-success)" : "#60a5fa" }}>
            {isCorrect ? "Correct!" : "Incorrect"}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            {q.explanation}
          </p>
        </div>
      )}

      {/* Actions */}
      {!confirmed ? (
        <button onClick={confirm} disabled={selected === null}
          className="w-full py-3.5 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
            color: "#fff", boxShadow: selected !== null ? "var(--glow-purple-sm)" : "none",
          }}>
          Check Answer
        </button>
      ) : (
        <button onClick={next}
          className="w-full py-3.5 rounded-xl font-semibold"
          style={{
            background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
            color: "#fff", boxShadow: "var(--glow-purple-sm)",
          }}>
          {current < quiz.questions.length - 1 ? "Next Question →" : "See Results"}
        </button>
      )}
    </div>
  );
}
