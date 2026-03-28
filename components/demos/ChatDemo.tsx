"use client";

import { useState, useRef, useEffect } from "react";
import { Send, RotateCcw, Loader2, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [system, setSystem] = useState("You are a helpful AI engineering tutor. Be concise and technically precise.");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const updated: Message[] = [...messages, { role: "user", content: text }];
    setMessages(updated);
    setLoading(true);

    // Add empty assistant message to stream into
    setMessages([...updated, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, system }),
      });

      if (!res.ok || !res.body) {
        setMessages([...updated, { role: "assistant", content: "Error: API not available." }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value);
        setMessages([...updated, { role: "assistant", content: accumulated }]);
      }
    } catch {
      setMessages([...updated, { role: "assistant", content: "Request failed — check your API key." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--color-border-default)" }}>
      {/* System prompt bar */}
      <div className="px-4 py-2.5 flex items-center gap-2 shrink-0"
        style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-subtle)" }}>
        <span className="text-xs font-semibold uppercase tracking-widest shrink-0"
          style={{ color: "var(--color-text-muted)" }}>System</span>
        <input value={system} onChange={(e) => setSystem(e.target.value)}
          className="flex-1 text-xs bg-transparent outline-none"
          style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-jetbrains, monospace)" }} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ background: "var(--color-bg-surface)" }}>
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
              Ask anything about AI engineering…
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5"
              style={{
                background: m.role === "user" ? "var(--color-purple-700)" : "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-default)",
              }}>
              {m.role === "user"
                ? <User className="h-3.5 w-3.5 text-white" />
                : <Bot className="h-3.5 w-3.5" style={{ color: "var(--color-cyan-400)" }} />}
            </div>
            <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={{
                background: m.role === "user" ? "rgba(124,58,237,0.15)" : "var(--color-bg-elevated)",
                border: `1px solid ${m.role === "user" ? "rgba(124,58,237,0.3)" : "var(--color-border-subtle)"}`,
                color: "var(--color-text-secondary)",
                whiteSpace: "pre-wrap",
              }}>
              {m.content}
              {loading && i === messages.length - 1 && m.role === "assistant" && m.content === "" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin inline" style={{ color: "var(--color-text-muted)" }} />
              )}
              {loading && i === messages.length - 1 && m.role === "assistant" && m.content !== "" && (
                <span className="animate-pulse" style={{ color: "var(--color-purple-400)" }}>▊</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 flex gap-3 shrink-0"
        style={{ background: "var(--color-bg-elevated)", borderTop: "1px solid var(--color-border-subtle)" }}>
        <button onClick={() => { setMessages([]); }}
          className="p-2 rounded-lg transition-colors shrink-0"
          style={{ color: "var(--color-text-muted)" }} title="Clear chat">
          <RotateCcw className="h-4 w-4" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Ask about LLMs, prompt engineering, RAG…"
          className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: "var(--color-text-primary)" }}
        />
        <button onClick={send} disabled={!input.trim() || loading}
          className="p-2 rounded-lg transition-all disabled:opacity-40 shrink-0"
          style={{
            background: "var(--color-purple-600)",
            color: "#fff",
          }}>
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
