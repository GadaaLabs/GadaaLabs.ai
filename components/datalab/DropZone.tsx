"use client";

import { useRef, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { normalizeJsonToRows, normalizeXmlToRows } from "@/lib/datalab";

interface Props {
  onData: (rows: Record<string, unknown>[], fileName: string, sizeKB: number) => void;
  onError: (msg: string) => void;
  loading: boolean;
}

const ACCEPTED = [
  ".csv", ".tsv", ".txt",
  ".xlsx", ".xls", ".ods",
  ".json", ".jsonl", ".ndjson",
  ".xml",
  ".pdf",
].join(",");

const LABEL =
  "CSV · TSV · JSON · JSONL · XML · XLSX · ODS · PDF · TXT";

export function DropZone({ onData, onError, loading }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const process = async (file: File) => {
    const sizeKB = Math.round(file.size / 1024);
    if (file.size > 500 * 1024 * 1024) {
      onError("File too large — max 500 MB supported.");
      return;
    }

    const name = file.name.toLowerCase();

    try {
      // ── CSV / TSV / TXT ─────────────────────────────────────────────────
      if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
        const Papa = (await import("papaparse")).default;
        const delimiter = name.endsWith(".tsv") ? "\t" : undefined; // auto-detect for csv/txt
        Papa.parse(file, {
          header: true,
          delimiter,
          dynamicTyping: false,
          skipEmptyLines: true,
          complete: (result) => {
            if (result.errors.length > 0 && result.data.length === 0) {
              onError("Could not parse file: " + result.errors[0].message);
              return;
            }
            onData(result.data as Record<string, unknown>[], file.name, sizeKB);
          },
          error: (err) => onError("Parse error: " + err.message),
        });
        return;
      }

      // ── Excel / ODS ──────────────────────────────────────────────────────
      if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".ods")) {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
        onData(rows, file.name, sizeKB);
        return;
      }

      // ── JSON ─────────────────────────────────────────────────────────────
      if (name.endsWith(".json")) {
        const text = await file.text();
        const parsed: unknown = JSON.parse(text);
        const rows = normalizeJsonToRows(parsed);
        if (rows.length === 0) { onError("JSON file has no recognisable tabular data."); return; }
        onData(rows, file.name, sizeKB);
        return;
      }

      // ── JSONL / NDJSON ───────────────────────────────────────────────────
      if (name.endsWith(".jsonl") || name.endsWith(".ndjson")) {
        const text = await file.text();
        const rows = text
          .split("\n")
          .filter((l) => l.trim())
          .map((line) => {
            try { return normalizeJsonToRows(JSON.parse(line))[0] ?? {}; }
            catch { return { _raw: line }; }
          });
        if (rows.length === 0) { onError("JSONL file appears empty."); return; }
        onData(rows, file.name, sizeKB);
        return;
      }

      // ── XML ──────────────────────────────────────────────────────────────
      if (name.endsWith(".xml")) {
        const text = await file.text();
        const rows = normalizeXmlToRows(text);
        if (rows.length === 0) { onError("Could not extract tabular data from XML."); return; }
        onData(rows, file.name, sizeKB);
        return;
      }

      // ── PDF (text extraction → paragraph rows) ───────────────────────────
      if (name.endsWith(".pdf")) {
        const pdfjsLib = await import("pdfjs-dist");
        // Use CDN worker to avoid bundler complexity
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
          fullText += pageText + "\n";
        }

        const paragraphs = fullText
          .split(/\n{2,}/)
          .map((p) => p.replace(/\s+/g, " ").trim())
          .filter((p) => p.length > 30);

        if (paragraphs.length === 0) {
          onError("Could not extract text from PDF. The file may be image-based (scanned).");
          return;
        }

        const rows = paragraphs.map((text, i) => ({
          page_paragraph: i + 1,
          text,
          word_count: text.split(/\s+/).length,
          char_count: text.length,
        }));

        onData(rows, file.name, sizeKB);
        return;
      }

      onError(`Unsupported file type: ${file.name}`);
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
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleChange}
      />

      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}
      >
        {loading
          ? <FileSpreadsheet className="h-6 w-6 animate-pulse" style={{ color: "var(--color-purple-400)" }} />
          : <Upload className="h-6 w-6" style={{ color: "var(--color-purple-400)" }} />}
      </div>

      <div>
        <p className="font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
          {loading ? "Processing file…" : "Drop your dataset here"}
        </p>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {LABEL} · max 500 MB
        </p>
      </div>

      {!loading && (
        <span
          className="text-sm px-4 py-2 rounded-xl transition-all"
          style={{
            background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
            color: "#fff",
            boxShadow: "var(--glow-purple-sm)",
          }}
        >
          Choose file
        </span>
      )}
    </div>
  );
}
