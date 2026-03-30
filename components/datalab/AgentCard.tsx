"use client";

import {
  Database, TrendingUp, BarChart2, Wrench, Brain, Calculator,
  Code2, ShieldCheck, FileText, MessageSquare, Clock, ChevronDown,
  ChevronUp, Loader2, CheckCircle2, XCircle, SkipForward, Users,
} from "lucide-react";

export type AgentStatus = "idle" | "thinking" | "streaming" | "done" | "error" | "skipped";

export interface AgentCardProps {
  agentId?: string;
  id?: string;
  name: string;
  iconName: string;
  color: string;
  bgColor: string;
  description: string;
  status: AgentStatus;
  output: string;
  task?: string;
  expanded: boolean;
  onToggle: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Database,
  TrendingUp,
  BarChart2,
  Wrench,
  Brain,
  Calculator,
  Code2,
  ShieldCheck,
  FileText,
  MessageSquare,
  Clock,
  Users,
};

function StatusBadge({ status }: { status: AgentStatus }) {
  const styles: Record<AgentStatus, { label: string; bg: string; color: string; extra?: string }> = {
    idle:      { label: "Idle",      bg: "rgba(60,60,80,0.5)",           color: "var(--color-text-disabled)" },
    thinking:  { label: "Thinking",  bg: "rgba(124,58,237,0.15)",         color: "var(--color-purple-400)",   extra: "animate-pulse" },
    streaming: { label: "Streaming", bg: "rgba(6,182,212,0.12)",          color: "var(--color-cyan-400)" },
    done:      { label: "Done",      bg: "rgba(16,185,129,0.12)",         color: "var(--color-success)" },
    error:     { label: "Error",     bg: "rgba(239,68,68,0.12)",          color: "var(--color-error)" },
    skipped:   { label: "Skipped",   bg: "rgba(60,60,80,0.3)",           color: "var(--color-text-muted)" },
  };

  const s = styles[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.extra ?? ""}`}
      style={{ background: s.bg, color: s.color }}
    >
      {status === "thinking" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "streaming" && (
        <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ background: "var(--color-cyan-400)" }} />
      )}
      {status === "done" && <CheckCircle2 className="h-3 w-3" />}
      {status === "error" && <XCircle className="h-3 w-3" />}
      {status === "skipped" && <SkipForward className="h-3 w-3" />}
      {s.label}
    </span>
  );
}

export function AgentCard({
  agentId,
  name,
  iconName,
  color,
  bgColor,
  description,
  status,
  output,
  task,
  expanded,
  onToggle,
}: AgentCardProps) {
  const Icon = ICON_MAP[iconName] ?? Brain;
  const isSkipped = status === "skipped";
  const isIdle = status === "idle";
  const hasContent = output.length > 0 || task;

  const previewText = output
    ? output.split("\n").slice(0, 2).join("\n")
    : task ?? description;

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col transition-all"
      style={{
        background: isSkipped ? "var(--color-bg-surface)" : "var(--color-bg-surface)",
        border: `1px solid ${isSkipped ? "var(--color-border-subtle)" : "var(--color-border-default)"}`,
        borderLeft: `3px solid ${isSkipped ? "var(--color-text-disabled)" : color}`,
        opacity: isSkipped ? 0.45 : 1,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          background: isSkipped ? "transparent" : bgColor,
          borderBottom: `1px solid ${isSkipped ? "var(--color-border-subtle)" : "var(--color-border-default)"}`,
        }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
          style={{
            background: isSkipped ? "rgba(60,60,80,0.3)" : bgColor,
            border: `1px solid ${isSkipped ? "var(--color-border-subtle)" : color}22`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: isSkipped ? "var(--color-text-disabled)" : color }} />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-sm leading-tight truncate"
            style={{ color: isSkipped ? "var(--color-text-disabled)" : "var(--color-text-primary)" }}
          >
            {name}
          </p>
          {task && !isSkipped && !isIdle && (
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {task.length > 60 ? task.slice(0, 60) + "…" : task}
            </p>
          )}
        </div>

        <StatusBadge status={status} />
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-3">
        {status === "thinking" && (
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: "var(--color-purple-400)" }}>
              Analyzing
            </span>
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    background: "var(--color-purple-400)",
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </span>
          </div>
        )}

        {(status === "idle" || status === "skipped") && (
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {isSkipped ? "Not selected for this analysis" : description}
          </p>
        )}

        {(status === "streaming" || status === "done" || status === "error") && (
          <>
            <div
              className="text-xs leading-relaxed overflow-hidden"
              style={{
                color: status === "error" ? "var(--color-error)" : "var(--color-text-secondary)",
                whiteSpace: "pre-wrap",
                maxHeight: expanded ? "none" : "3.6em",
                fontFamily: "var(--font-inter, sans-serif)",
              }}
            >
              {expanded ? output : previewText}
              {status === "streaming" && (
                <span className="cursor-blink ml-0.5" style={{ color }}>▊</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Toggle */}
      {hasContent && (status === "streaming" || status === "done" || status === "error") && (
        <button
          onClick={onToggle}
          className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium transition-colors"
          style={{
            borderTop: `1px solid var(--color-border-subtle)`,
            color: "var(--color-text-muted)",
            background: "transparent",
          }}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Collapse" : "Show work"}
        </button>
      )}
    </div>
  );
}
