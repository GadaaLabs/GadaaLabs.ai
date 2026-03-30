"use client";

import { useState, useRef, useEffect } from "react";
import {
  FileSearch, Briefcase, Scale, ShieldAlert, Zap,
  Send, Loader2, ArrowLeft, Copy, CheckCheck,
  ChevronDown, ChevronUp, Paperclip, X,
} from "lucide-react";
import { EXPERT_AGENTS } from "@/lib/agents";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  FileSearch,
  Briefcase,
  Scale,
  ShieldAlert,
  Zap,
};

// ─────────────────────────────────────────────
// Agent metadata
// ─────────────────────────────────────────────

const EXPERT_LIST = Object.values(EXPERT_AGENTS);

const CATEGORIES = [
  {
    label: "Document & Data",
    ids: ["doc-intelligence"],
    description: "Analyze documents, extract data, fill forms, scrape datasets",
  },
  {
    label: "Business & Strategy",
    ids: ["business-strategist", "risk-analyst"],
    description: "Business plans, proposals, revenue growth, risk analysis",
  },
  {
    label: "Legal & Compliance",
    ids: ["legal-expert"],
    description: "Immigration law, contracts, employment, IP, compliance",
  },
  {
    label: "Engineering",
    ids: ["electrical-engineer"],
    description: "Power, signals, telecom, RF/microwave, control systems, circuits",
  },
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function AgentHubCard({
  agent,
  onSelect,
}: {
  agent: (typeof EXPERT_LIST)[0];
  onSelect: (id: string) => void;
}) {
  const Icon = ICON_MAP[agent.iconName] ?? Zap;
  return (
    <button
      onClick={() => onSelect(agent.id)}
      className="text-left rounded-2xl p-5 transition-all hover:scale-[1.02]"
      style={{
        background: "var(--color-bg-surface)",
        border: `1px solid var(--color-border-default)`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: agent.bgColor, border: `1px solid ${agent.color}33` }}
        >
          <Icon className="h-5 w-5" style={{ color: agent.color }} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm mb-0.5" style={{ color: "var(--color-text-primary)" }}>
            {agent.name}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {agent.description}
          </p>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const copy = () => {
    navigator.clipboard.writeText(msg.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="relative group max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={{
          background: isUser
            ? "linear-gradient(135deg, var(--color-purple-700), var(--color-purple-600))"
            : "var(--color-bg-surface)",
          border: isUser ? "none" : "1px solid var(--color-border-default)",
          color: isUser ? "#fff" : "var(--color-text-primary)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg.content}
        {!isUser && (
          <button
            onClick={copy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg"
            style={{ background: "var(--color-bg-elevated)" }}
          >
            {copied
              ? <CheckCheck className="h-3 w-3" style={{ color: "var(--color-success)" }} />
              : <Copy className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Chat panel
// ─────────────────────────────────────────────

function ExpertChat({
  agentId,
  onBack,
}: {
  agentId: string;
  onBack: () => void;
}) {
  const agent = EXPERT_AGENTS[agentId];
  const Icon = ICON_MAP[agent.iconName] ?? Zap;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [documentText, setDocumentText] = useState("");
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [docFileName, setDocFileName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFilePaste = async (file: File) => {
    const text = await file.text();
    setDocumentText(text.slice(0, 20000));
    setDocFileName(file.name);
    setShowDocPanel(true);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/expert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          messages: newMessages,
          documentText: documentText || undefined,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantText };
          return updated;
        });
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${String(e)}. Please try again.` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
      >
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: agent.bgColor }}
        >
          <Icon className="h-4 w-4" style={{ color: agent.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
            {agent.name}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
            {agent.description}
          </p>
        </div>
        <button
          onClick={() => setMessages([])}
          className="text-xs px-3 py-1 rounded-lg transition-colors"
          style={{
            background: "var(--color-bg-elevated)",
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-border-default)",
          }}
        >
          Clear
        </button>
      </div>

      {/* Document context panel */}
      {showDocPanel && (
        <div
          className="rounded-xl p-3 mb-3 text-xs"
          style={{
            background: "rgba(124,58,237,0.06)",
            border: "1px solid rgba(124,58,237,0.2)",
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span style={{ color: "var(--color-purple-400)" }} className="font-medium">
              Document loaded: {docFileName}
            </span>
            <button onClick={() => { setDocumentText(""); setDocFileName(""); setShowDocPanel(false); }}>
              <X className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
            </button>
          </div>
          <button
            onClick={() => setShowDocPanel((v) => !v)}
            className="flex items-center gap-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            {showDocPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {documentText.length} chars loaded
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: agent.bgColor, border: `1px solid ${agent.color}33` }}
            >
              <Icon className="h-7 w-7" style={{ color: agent.color }} />
            </div>
            <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
              Ask anything — I&apos;m your {agent.name}.<br />
              Use <kbd className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--color-bg-elevated)" }}>📎</kbd> to attach a document for context.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2 items-center" style={{ color: "var(--color-text-muted)" }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Thinking…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex gap-2 items-end rounded-2xl p-3"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.pdf,.csv,.json,.xml"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await handleFilePaste(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="p-2 rounded-xl transition-colors hover:bg-white/5 shrink-0"
          style={{ color: "var(--color-text-muted)" }}
          title="Attach document for context"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
          placeholder={`Ask the ${agent.name}… (Shift+Enter for new line)`}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm outline-none"
          style={{
            color: "var(--color-text-primary)",
            maxHeight: "160px",
            overflowY: "auto",
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 160) + "px";
          }}
        />

        <button
          onClick={() => void sendMessage()}
          disabled={!input.trim() || loading}
          className="shrink-0 flex items-center justify-center h-8 w-8 rounded-xl transition-all disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, var(--color-purple-700), var(--color-purple-600))",
            boxShadow: "var(--glow-purple-sm)",
          }}
        >
          {loading
            ? <Loader2 className="h-4 w-4 text-white animate-spin" />
            : <Send className="h-4 w-4 text-white" />}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main ExpertHub
// ─────────────────────────────────────────────

export function ExpertHub() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  if (selectedAgent) {
    return (
      <div style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
        <ExpertChat agentId={selectedAgent} onBack={() => setSelectedAgent(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
          Expert Agent Hub
        </h2>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Select a specialized expert agent. Each is an autonomous AI expert in its domain. Attach documents for context.
        </p>
      </div>

      {CATEGORIES.map((cat) => {
        const agents = EXPERT_LIST.filter((a) => cat.ids.includes(a.id));
        return (
          <div key={cat.label}>
            <div className="mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {cat.label}
              </h3>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {cat.description}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agents.map((agent) => (
                <AgentHubCard key={agent.id} agent={agent} onSelect={setSelectedAgent} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
