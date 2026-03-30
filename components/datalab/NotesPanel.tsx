"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  StickyNote, Plus, Trash2, Search, Download, FileText, X,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  datasetName: string;
  createdAt: number;
  updatedAt: number;
}

export interface NotesPanelProps {
  datasetName: string;
  userId?: string;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function NotesPanel({ datasetName, userId }: NotesPanelProps) {
  const storageKey = `datalab_notes_${userId ?? "anon"}`;
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: Note[] = JSON.parse(raw);
        setNotes(parsed);
        if (parsed.length > 0) setSelectedId(parsed[0].id);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const persist = useCallback((updated: Note[]) => {
    localStorage.setItem(storageKey, JSON.stringify(updated));
  }, [storageKey]);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  const filteredNotes = notes.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  const createNote = () => {
    const note: Note = {
      id: uid(),
      title: "Untitled Note",
      content: "",
      datasetName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [note, ...notes];
    setNotes(updated);
    setSelectedId(note.id);
    persist(updated);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    if (selectedId === id) {
      setSelectedId(updated.length > 0 ? updated[0].id : null);
    }
    setDeleteConfirm(null);
    persist(updated);
  };

  const updateField = (field: "title" | "content", value: string) => {
    if (!selectedId) return;
    const updated = notes.map((n) =>
      n.id === selectedId ? { ...n, [field]: value, updatedAt: Date.now() } : n
    );
    setNotes(updated);

    // Debounce save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(false);
    saveTimer.current = setTimeout(() => {
      persist(updated);
      setSaving(true);
      setTimeout(() => setSaving(false), 800);
    }, 1000);
  };

  const exportMarkdown = () => {
    const md = notes
      .map((n) =>
        `# ${n.title}\n\n_Dataset: ${n.datasetName} | ${new Date(n.updatedAt).toLocaleString()}_\n\n${n.content}`
      )
      .join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `datalab_notes_${datasetName.replace(/\.[^.]+$/, "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="rounded-xl overflow-hidden flex"
      style={{
        border: "1px solid var(--color-border-default)",
        height: 560,
        background: "var(--color-bg-surface)",
      }}
    >
      {/* Sidebar */}
      <div
        className="flex flex-col shrink-0"
        style={{
          width: 240,
          borderRight: "1px solid var(--color-border-default)",
          background: "var(--color-bg-elevated)",
        }}
      >
        {/* Sidebar header */}
        <div
          className="flex items-center justify-between px-3 py-3"
          style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
        >
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4" style={{ color: "var(--color-purple-400)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Notes
            </span>
          </div>
          <button
            onClick={createNote}
            className="flex items-center justify-center h-6 w-6 rounded-md transition-colors"
            style={{ background: "rgba(124,58,237,0.15)", color: "var(--color-purple-400)" }}
            title="New note"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "var(--color-bg-base)", border: "1px solid var(--color-border-default)" }}>
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-text-disabled)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: "var(--color-text-primary)" }}
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} />
              </button>
            )}
          </div>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 && notes.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 h-full px-4 text-center">
              <FileText className="h-8 w-8" style={{ color: "var(--color-text-disabled)" }} />
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Create your first note
              </p>
              <button
                onClick={createNote}
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{
                  background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
                  color: "#fff",
                }}
              >
                New Note
              </button>
            </div>
          )}

          {filteredNotes.length === 0 && notes.length > 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No notes match your search</p>
            </div>
          )}

          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => setSelectedId(note.id)}
              className="relative group cursor-pointer px-3 py-2.5 transition-colors"
              style={{
                background: selectedId === note.id ? "rgba(124,58,237,0.1)" : "transparent",
                borderLeft: `2px solid ${selectedId === note.id ? "var(--color-purple-500)" : "transparent"}`,
                borderBottom: "1px solid var(--color-border-subtle)",
              }}
            >
              <p
                className="text-xs font-medium truncate"
                style={{ color: selectedId === note.id ? "var(--color-purple-300)" : "var(--color-text-primary)" }}
              >
                {note.title || "Untitled"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(124,58,237,0.1)",
                    color: "var(--color-purple-400)",
                    fontSize: "0.65rem",
                  }}
                >
                  {note.datasetName.length > 12 ? note.datasetName.slice(0, 12) + "…" : note.datasetName}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-disabled)", fontSize: "0.65rem" }}>
                  {timeAgo(note.updatedAt)}
                </span>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(note.id); }}
                className="absolute right-2 top-2.5 hidden group-hover:flex items-center justify-center h-5 w-5 rounded transition-colors"
                style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-error)" }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar footer */}
        {notes.length > 0 && (
          <div className="px-3 py-2" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
            <button
              onClick={exportMarkdown}
              className="flex items-center gap-2 w-full text-xs px-2 py-1.5 rounded-lg transition-colors"
              style={{ color: "var(--color-text-muted)", background: "transparent" }}
            >
              <Download className="h-3.5 w-3.5" />
              Export all as Markdown
            </button>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedNote ? (
          <>
            {/* Title bar */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: "1px solid var(--color-border-default)" }}
            >
              <input
                value={selectedNote.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="flex-1 bg-transparent outline-none font-semibold text-base"
                style={{ color: "var(--color-text-primary)" }}
                placeholder="Note title…"
              />
              {saving && (
                <span className="text-xs" style={{ color: "var(--color-success)" }}>Saved</span>
              )}
              <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
                {timeAgo(selectedNote.updatedAt)}
              </span>
            </div>

            {/* Content */}
            <textarea
              value={selectedNote.content}
              onChange={(e) => updateField("content", e.target.value)}
              className="flex-1 bg-transparent outline-none resize-none p-4 text-sm leading-relaxed"
              style={{
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-inter, sans-serif)",
              }}
              placeholder="Write your observations, insights, and analysis notes here…"
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-3">
            <StickyNote className="h-10 w-10" style={{ color: "var(--color-text-disabled)" }} />
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {notes.length === 0 ? "No notes yet — create your first note" : "Select a note to edit"}
            </p>
            <button
              onClick={createNote}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium"
              style={{
                background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
                color: "#fff",
                boxShadow: "var(--glow-purple-sm)",
              }}
            >
              <Plus className="h-4 w-4" /> New Note
            </button>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div
          className="absolute inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <div
            className="rounded-xl p-5 max-w-xs w-full mx-4"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-strong)" }}
          >
            <p className="font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>Delete note?</p>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-lg text-sm"
                style={{ border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteNote(deleteConfirm)}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ background: "rgba(239,68,68,0.15)", color: "var(--color-error)", border: "1px solid rgba(239,68,68,0.3)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
