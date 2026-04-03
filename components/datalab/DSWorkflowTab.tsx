"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Lock, Circle } from "lucide-react";
import type { DatasetSummary } from "@/lib/datalab";

const TX1 = "#e8edf5", TX2 = "#9ba8bc", TX3 = "#5c6a80";
const CYAN = "#22d3ee", GREEN = "#34d399";
const BORDER = "rgba(255,255,255,0.07)";

export interface WorkflowStep {
  id: string;
  number: number;
  title: string;
  status: "done" | "active" | "locked";
  agentName: string;
  output?: string;
  code?: string;
}

interface Props {
  summary: DatasetSummary;
  steps?: WorkflowStep[];
  analysisComplete: boolean;
}

const DEFAULT_STEPS: WorkflowStep[] = [
  {
    id: "ingest", number: 1,
    title: "Data Ingestion & Schema Validation",
    status: "done", agentName: "Data Quality",
    output: "Schema validated. Auto-detected column types. Ready for EDA.",
  },
  {
    id: "eda", number: 2,
    title: "Exploratory Data Analysis",
    status: "done", agentName: "Data Analyst",
    output: "EDA complete. See Distributions, Correlations and Outliers tabs for full results.",
  },
  {
    id: "quality", number: 3,
    title: "Data Quality & Cleaning",
    status: "active", agentName: "Data Quality",
    code: `# Auto-generated cleaning pipeline
import pandas as pd
from sklearn.impute import SimpleImputer

# Drop columns with >50% nulls
df = df.dropna(thresh=len(df)*0.5, axis=1)

# Impute remaining nulls
num_imputer = SimpleImputer(strategy='median')
cat_imputer = SimpleImputer(strategy='most_frequent')`,
  },
  {
    id: "features", number: 4,
    title: "Feature Engineering",
    status: "active", agentName: "Feature Engineer",
    output: "Waiting for agent output...",
  },
  {
    id: "preprocessing", number: 5,
    title: "Preprocessing Pipeline",
    status: "active", agentName: "Feature Engineer",
    code: `from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer

# Configure transformer (update column lists as needed)
preprocessor = ColumnTransformer([
  ('num', StandardScaler(), numeric_features),
  ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
])`,
  },
  {
    id: "target", number: 6,
    title: "Target Variable Analysis",
    status: "locked", agentName: "Data Analyst",
  },
  {
    id: "baseline", number: 7,
    title: "Baseline Model & Cross-Validation",
    status: "locked", agentName: "ML Expert",
  },
  {
    id: "tuning", number: 8,
    title: "Hyperparameter Tuning (Optuna)",
    status: "locked", agentName: "ML Expert",
  },
  {
    id: "eval", number: 9,
    title: "Model Evaluation & SHAP Interpretability",
    status: "locked", agentName: "ML Expert",
  },
  {
    id: "deploy", number: 10,
    title: "Deployment Preparation & Notebook Export",
    status: "locked", agentName: "Code Generator",
  },
];

export function DSWorkflowTab({ summary: _summary, steps, analysisComplete }: Props) {
  const [expanded, setExpanded] = useState<string | null>("ingest");
  const workflowSteps = steps ?? DEFAULT_STEPS;

  function statusIcon(status: WorkflowStep["status"]) {
    if (status === "done") return <CheckCircle2 size={16} color={GREEN} />;
    if (status === "active") return <Circle size={16} color={CYAN} />;
    return <Lock size={14} color={TX3} />;
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: TX3, marginBottom: 16 }}>
        End-to-end data science workflow —{" "}
        {analysisComplete
          ? "agent outputs pre-populated below"
          : "run analysis to populate agent outputs"}.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {workflowSteps.map((step) => {
          const isOpen = expanded === step.id;
          const isLocked = step.status === "locked";
          const borderColor =
            step.status === "done"   ? "rgba(52,211,153,0.2)" :
            step.status === "active" ? "rgba(34,211,238,0.2)" :
            BORDER;

          return (
            <div key={step.id} style={{
              background: "#0c0c18", border: `1px solid ${borderColor}`,
              borderRadius: 12, overflow: "hidden",
            }}>
              <button
                disabled={isLocked}
                onClick={() => setExpanded(isOpen ? null : step.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", background: "transparent", border: "none",
                  cursor: isLocked ? "not-allowed" : "pointer", textAlign: "left",
                }}
              >
                <span style={{
                  fontSize: 10, fontWeight: 700, color: TX3,
                  background: "rgba(255,255,255,0.04)", borderRadius: 6,
                  padding: "2px 6px", minWidth: 22, textAlign: "center",
                }}>
                  {step.number}
                </span>
                {statusIcon(step.status)}
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600,
                  color: isLocked ? TX3 : TX1 }}>
                  {step.title}
                </span>
                <span style={{
                  fontSize: 10, color: TX3,
                  background: "rgba(255,255,255,0.04)", borderRadius: 20,
                  padding: "1px 8px",
                }}>
                  {step.agentName}
                </span>
                {!isLocked && (
                  isOpen
                    ? <ChevronDown size={14} color={TX3} />
                    : <ChevronRight size={14} color={TX3} />
                )}
              </button>

              {isOpen && !isLocked && (
                <div style={{ borderTop: `1px solid ${BORDER}`, padding: 14 }}>
                  {step.output && (
                    <p style={{
                      fontSize: 12, color: TX2, lineHeight: 1.6,
                      marginBottom: step.code ? 12 : 0,
                    }}>
                      {step.output}
                    </p>
                  )}
                  {step.code && (
                    <pre style={{
                      fontSize: 11, color: "#a5f3fc",
                      background: "#06060e", border: `1px solid ${BORDER}`,
                      borderRadius: 8, padding: 12, overflowX: "auto",
                      margin: 0, lineHeight: 1.7,
                    }}>
                      {step.code}
                    </pre>
                  )}
                  {!step.output && !step.code && (
                    <p style={{ fontSize: 12, color: TX3, fontStyle: "italic" }}>
                      Run analysis to populate this step.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
