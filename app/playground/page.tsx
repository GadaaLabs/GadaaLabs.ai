import type { Metadata } from "next";
import { APIPlayground } from "@/components/demos/APIPlayground";
import { Terminal } from "lucide-react";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Live AI API playground powered by open-source LLMs. Experiment with prompts, models, and parameters in real time.",
};

export default function PlaygroundPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: "rgba(124, 58, 237, 0.12)",
              border: "1px solid rgba(124, 58, 237, 0.25)",
            }}
          >
            <Terminal className="h-4.5 w-4.5" style={{ color: "var(--color-purple-400)" }} />
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            API Playground
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Experiment with open-source LLMs via Groq. Adjust model, temperature, and max tokens in real time.
        </p>
      </div>

      <APIPlayground />
    </div>
  );
}
