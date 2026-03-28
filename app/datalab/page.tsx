import type { Metadata } from "next";
import { DataLabShell } from "@/components/datalab/DataLabShell";
import { FlaskConical } from "lucide-react";

export const metadata: Metadata = {
  title: "DataLab",
  description:
    "AI-powered data analysis agent. Upload a CSV or Excel file and get instant statistics, charts, and AI-driven EDA insights.",
};

export default function DataLabPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, var(--color-purple-700), var(--color-cyan-600))",
            }}
          >
            <FlaskConical className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              DataLab <span className="gradient-text">Agent</span>
            </h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Upload any CSV or Excel file — get instant stats, charts, and AI-powered insights.
            </p>
          </div>
        </div>
      </div>

      <DataLabShell />
    </div>
  );
}
