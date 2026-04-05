import Link from "next/link";
import { Globe, ArrowRight } from "lucide-react";

export function ServicesTeaser() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <div
        className="rounded-2xl px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.04))",
          border: "1px solid rgba(124,58,237,0.2)",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl mt-0.5"
            style={{
              background: "linear-gradient(135deg, var(--color-purple-600), var(--color-cyan-500))",
            }}
          >
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <p
              className="text-lg font-bold mb-1"
              style={{ color: "var(--color-text-primary)" }}
            >
              Need a website for your business?
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              We build fast, modern websites for small businesses. See our work and book a free call.
            </p>
          </div>
        </div>
        <Link
          href="/services"
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
            color: "#fff",
            boxShadow: "var(--glow-purple-sm)",
          }}
        >
          View Our Services <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
