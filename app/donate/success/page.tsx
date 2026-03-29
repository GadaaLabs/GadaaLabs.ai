import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Thank You — GadaaLabs",
  description: "Your contribution to GadaaLabs has been received. Thank you for supporting free AI education.",
};

export default function DonateSuccessPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <div className="flex justify-center mb-6">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.3)" }}
        >
          <CheckCircle2 className="h-10 w-10" style={{ color: "#22c55e" }} />
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>
        Thank you for your support!
      </h1>
      <p className="text-lg leading-relaxed mb-3" style={{ color: "var(--color-text-secondary)" }}>
        Your contribution keeps GadaaLabs free and open for engineers everywhere.
      </p>
      <p className="text-sm mb-12" style={{ color: "var(--color-text-muted)" }}>
        A receipt has been sent to your email. If you have any questions, reach out on GitHub.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/learn"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
            color: "#fff",
            boxShadow: "var(--glow-purple-sm)",
          }}
        >
          <BookOpen className="h-4 w-4" /> Start Learning
        </Link>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-default)",
            color: "var(--color-text-primary)",
          }}
        >
          Back to Home <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
