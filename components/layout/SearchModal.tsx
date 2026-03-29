"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, BookOpen, FileText, Map, Layers, Loader2 } from "lucide-react";
import type { SearchResult } from "@/app/api/search/route";

const TYPE_META: Record<SearchResult["type"], { label: string; color: string; Icon: React.ElementType }> = {
  course:  { label: "Course",  color: "var(--color-purple-400)", Icon: Layers },
  lesson:  { label: "Lesson",  color: "var(--color-purple-300)", Icon: BookOpen },
  article: { label: "Article", color: "var(--color-cyan-400)",   Icon: FileText },
  guide:   { label: "Guide",   color: "#34d399",                 Icon: Map },
};

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const tid = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json() as SearchResult[];
        setResults(data);
        setActiveIdx(0);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(tid);
  }, [query]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && results[activeIdx]) { navigate(results[activeIdx].href); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, activeIdx, navigate, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          {loading
            ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: "var(--color-purple-400)" }} />
            : <Search className="h-4 w-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, lessons, articles, guides…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--color-text-primary)" }}
          />
          <div className="flex items-center gap-2">
            <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-muted)", border: "1px solid var(--color-border-subtle)" }}>
              ESC
            </kbd>
            <button onClick={onClose} style={{ color: "var(--color-text-muted)" }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-96 overflow-y-auto py-2">
            {results.map((r, i) => {
              const meta = TYPE_META[r.type];
              return (
                <li key={r.href}>
                  <button
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => navigate(r.href)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left transition-all"
                    style={{ background: i === activeIdx ? "rgba(124,58,237,0.08)" : "transparent" }}
                  >
                    <meta.Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: meta.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        {r.difficulty && (
                          <span className="text-xs capitalize" style={{ color: "var(--color-text-disabled)" }}>
                            · {r.difficulty}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                        {r.title}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        {r.description}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="px-4 py-10 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {!query && (
          <div className="px-4 py-6 text-center text-xs" style={{ color: "var(--color-text-disabled)" }}>
            Type to search courses, lessons, articles and guides
            <div className="flex justify-center gap-4 mt-3">
              {(Object.entries(TYPE_META) as [SearchResult["type"], typeof TYPE_META[SearchResult["type"]]][]).map(([type, m]) => (
                <span key={type} className="flex items-center gap-1" style={{ color: m.color }}>
                  <m.Icon className="h-3 w-3" /> {m.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2.5 text-xs" style={{ borderTop: "1px solid var(--color-border-subtle)", color: "var(--color-text-disabled)" }}>
          <span><kbd className="px-1 py-0.5 rounded" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)" }}>↑↓</kbd> navigate</span>
          <span><kbd className="px-1 py-0.5 rounded" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)" }}>↵</kbd> open</span>
          <span><kbd className="px-1 py-0.5 rounded" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)" }}>ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
