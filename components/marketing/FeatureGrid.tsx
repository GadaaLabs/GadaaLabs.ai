import { BookOpen, Cpu, FileText, HelpCircle } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Deep-Dive Articles",
    description:
      "Technical articles on LLM internals, prompt engineering, RAG, agents, and more — with syntax-highlighted code you can copy and run.",
    accent: "var(--color-purple-500)",
    bg: "rgba(124, 58, 237, 0.08)",
    border: "rgba(124, 58, 237, 0.2)",
  },
  {
    icon: Cpu,
    title: "Interactive Demos",
    description:
      "Live AI playgrounds powered by open-source LLMs. Experiment with tokenizers, chat, completions, and embeddings — no account needed.",
    accent: "var(--color-cyan-400)",
    bg: "rgba(6, 182, 212, 0.08)",
    border: "rgba(6, 182, 212, 0.2)",
  },
  {
    icon: BookOpen,
    title: "Hands-On Courses",
    description:
      "Structured learning paths from API basics to building production AI agents. Each lesson includes exercises and code you can ship.",
    accent: "var(--color-purple-400)",
    bg: "rgba(167, 139, 250, 0.08)",
    border: "rgba(167, 139, 250, 0.2)",
  },
  {
    icon: HelpCircle,
    title: "Quizzes & Assessments",
    description:
      "Test your understanding after every module. Questions written for engineers — no fluff, straight to the concepts that matter.",
    accent: "var(--color-cyan-500)",
    bg: "rgba(6, 182, 212, 0.06)",
    border: "rgba(6, 182, 212, 0.15)",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      {/* Section header */}
      <div className="text-center mb-12">
        <h2
          className="text-3xl md:text-4xl font-bold mb-4"
          style={{ color: "var(--color-text-primary)" }}
        >
          Everything you need to{" "}
          <span className="gradient-text">master AI engineering</span>
        </h2>
        <p
          className="max-w-xl mx-auto text-base"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Four learning formats that work together — read, experiment, build, test.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl p-6 flex flex-col gap-4 transition-transform hover:-translate-y-1"
            style={{
              background: f.bg,
              border: `1px solid ${f.border}`,
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: `${f.bg}`, border: `1px solid ${f.border}` }}
            >
              <f.icon className="h-5 w-5" style={{ color: f.accent }} />
            </div>
            <h3
              className="font-semibold text-base"
              style={{ color: "var(--color-text-primary)" }}
            >
              {f.title}
            </h3>
            <p
              className="text-sm leading-relaxed flex-1"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
