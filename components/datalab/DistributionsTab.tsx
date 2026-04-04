"use client";
import type { DatasetSummary } from "@/lib/datalab";
import { ChartPanel } from "./ChartPanel";

interface Props {
  summary: DatasetSummary;
  chartInsights?: Record<string, string>;
}

export function DistributionsTab({ summary, chartInsights }: Props) {
  return (
    <div>
      <p style={{ fontSize: 12, color: "#5c6a80", marginBottom: 16 }}>
        Each column shown with its agent-selected chart type, annotated with distribution shape, stats, and AI insight.
      </p>
      <ChartPanel summary={summary} />
    </div>
  );
}
