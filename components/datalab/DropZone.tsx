"use client";

import { useRef, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";

interface Props {
  onData: (rows: Record<string, unknown>[], fileName: string, sizeKB: number) => void;
  onError: (msg: string) => void;
  loading: boolean;
}

export function DropZone({ onData, onError, loading }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const process = async (file: File) => {
    const sizeKB = Math.round(file.size / 1024);
    if (file.size > 50 * 1024 * 1024) {
      onError("File too large — max 50 MB supported.");
      return;
    }

    try {
      if (file.name.endsWith(".csv")) {
        const Papa = (await import("papaparse")).default;
        Papa.parse(file, {
          header: true,
          dynamicTyping: false,
          skipEmptyLines: true,
          complete: (result) => {
            if (result.errors.length > 0 && result.data.length === 0) {
              onError("Could not parse CSV: " + result.errors[0].message);
              return;
            }
            onData(result.data as Record<string, unknown>[], file.name, sizeKB);
          },
          error: (err) => onError("Parse error: " + err.message),
        });
      } else {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
        onData(rows, file.name, sizeKB);
      }
    } catch (e) {
      onError("Failed to read file: " + String(e));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) process(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) process(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current?.click()}
      className="cursor-pointer rounded-2xl flex flex-col items-center justify-center gap-4 py-16 px-8 text-center transition-all"
      style={{
        border: `2px dashed ${dragging ? "var(--color-purple-500)" : "var(--color-border-default)"}`,
        background: dragging ? "rgba(124,58,237,0.06)" : "var(--color-bg-surface)",
      }}
    >
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleChange} />

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}>
        {loading
          ? <FileSpreadsheet className="h-6 w-6 animate-pulse" style={{ color: "var(--color-purple-400)" }} />
          : <Upload className="h-6 w-6" style={{ color: "var(--color-purple-400)" }} />}
      </div>

      <div>
        <p className="font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
          {loading ? "Processing file…" : "Drop your dataset here"}
        </p>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          CSV, XLSX, or XLS · max 50 MB
        </p>
      </div>

      {!loading && (
        <span className="text-sm px-4 py-2 rounded-xl transition-all"
          style={{
            background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
            color: "#fff",
            boxShadow: "var(--glow-purple-sm)",
          }}>
          Choose file
        </span>
      )}
    </div>
  );
}
