import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const EDA_SYSTEM = `You are DataLab, an expert Senior Data Scientist and ML Engineer at GadaaLabs.
You have 15+ years of experience in production data science across finance, healthcare, and tech.

You are given a structured dataset summary. Produce a comprehensive, expert-level analysis covering:

## 1. Executive Summary
A 3–5 sentence overview: what this dataset appears to represent, its scale, and the most important finding.

## 2. Data Quality Assessment
Score the dataset out of 10. For each issue found:
- Column name, issue type (nulls / type mismatch / outliers / cardinality / skew)
- Severity: Critical / Warning / Info
- Exact remediation code snippet

## 3. Univariate Analysis
For each numeric column: distribution shape, skewness interpretation, outlier rate, recommended transform (log1p / Box-Cox / none).
For each categorical: cardinality risk, dominant class imbalance, encoding recommendation.

## 4. Bivariate & Multivariate Patterns
Identify the 3–5 most important relationships between columns. Flag any multicollinearity risks for modelling.

## 5. Feature Engineering Recommendations
Suggest 5+ concrete, named features to create. Include the Python expression for each.

## 6. ML Readiness & Target Detection
Detect the most likely target variable. Recommend the ML task type (classification / regression / clustering / anomaly detection).
Suggest top 3 algorithms with brief justification. Identify train/test split strategy.

## 7. Production Concerns
Flag data drift risks, privacy-sensitive columns (PII), and schema validation rules to enforce.

## 8. Prioritised Action Plan
Numbered list of the 8 most important next steps, ordered by impact.

Rules:
- Be specific: cite exact column names and actual numbers from the statistics
- Include Python code snippets for critical remediation steps
- Be direct and actionable — no generic platitudes
- Format with clean Markdown headings`;

const NOTEBOOK_SYSTEM = `You are an expert Python data scientist. Generate a complete, production-quality Python script for a full data science pipeline.

The script must use # %% cell markers (VS Code / Jupyter cell format) to delimit logical sections.

Structure:
# %% [markdown]
# ## Section Title

# %%
# code here

Sections required:
1. Feature Engineering (create derived features, encode categoricals, scale numerics)
2. Train/Test Split with stratification if classification
3. Baseline Model (appropriate for the task — include imports)
4. Model Evaluation (metrics, confusion matrix or residual plot)
5. Feature Importance (if tree-based) or coefficients (if linear)
6. Hyperparameter Tuning (GridSearchCV or RandomizedSearchCV, 5-fold CV)
7. Final Model Fit + Prediction on test set
8. Save model with joblib

Use realistic sklearn, xgboost, or lightgbm code. Use the actual column names from the dataset summary.
Assume df is already loaded and cleaned. Output ONLY the Python code, no explanation outside cells.`;

export async function POST(req: Request) {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "anonymous";

  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { summaryText, messages, stage } = await req.json();

  if (!summaryText) {
    return new Response(JSON.stringify({ error: "Missing summaryText" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Notebook code generation stage
  if (stage === "notebook") {
    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: `${NOTEBOOK_SYSTEM}\n\nDATASET SUMMARY:\n${summaryText}`,
      messages: [{ role: "user", content: "Generate the complete ML pipeline code for this dataset." }],
      maxOutputTokens: 3000,
      temperature: 0.2,
    });
    return result.toTextStreamResponse();
  }

  // Chat stage
  if (messages && messages.length > 0) {
    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: `${EDA_SYSTEM}\n\nDATASET SUMMARY:\n${summaryText}`,
      messages,
      maxOutputTokens: 2048,
      temperature: 0.3,
    });
    return result.toTextStreamResponse();
  }

  // Full EDA analysis
  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: `${EDA_SYSTEM}\n\nDATASET SUMMARY:\n${summaryText}`,
    messages: [{ role: "user", content: "Perform the complete expert analysis on this dataset. Be thorough, specific, and production-focused." }],
    maxOutputTokens: 4096,
    temperature: 0.25,
  });

  return result.toTextStreamResponse();
}
