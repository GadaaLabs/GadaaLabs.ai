"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Play, RotateCcw, Loader2, Terminal, Copy, Check } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ── Pyodide singleton ─────────────────────────────────────────────────────────
type PyodideAPI = {
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackage: (pkgs: string[]) => Promise<void>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
};

let _pyodide: PyodideAPI | null = null;
let _loadPromise: Promise<PyodideAPI> | null = null;
const _loadedPkgs = new Set<string>();

async function getPyodide(packages: string[] = []): Promise<PyodideAPI> {
  if (!_loadPromise) {
    _loadPromise = (async () => {
      if (!document.getElementById("pyodide-cdn")) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement("script");
          s.id = "pyodide-cdn";
          s.src = "https://cdn.jsdelivr.net/pyodide/v0.27.3/full/pyodide.js";
          s.onload = () => res();
          s.onerror = () => rej(new Error("Failed to load Pyodide"));
          document.head.appendChild(s);
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _pyodide = await (window as any).loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.3/full/",
      }) as PyodideAPI;
      return _pyodide;
    })();
  }

  const py = await _loadPromise;

  const toLoad = packages.filter((p) => !_loadedPkgs.has(p));
  if (toLoad.length > 0) {
    await py.loadPackage(toLoad);
    toLoad.forEach((p) => _loadedPkgs.add(p));
  }

  return py;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PythonPlaygroundProps {
  code: string;
  packages?: string[];   // e.g. ["numpy", "pandas", "matplotlib"]
  height?: number;       // editor height px, default 300
  title?: string;
  readOnly?: boolean;
}

type OutputLine = { type: "stdout" | "stderr" | "result" | "error"; text: string };

// ── Component ─────────────────────────────────────────────────────────────────
export function PythonPlayground({
  code: initialCode,
  packages = [],
  height = 300,
  title,
  readOnly = false,
}: PythonPlaygroundProps) {
  const [code, setCode] = useState((initialCode ?? "").trim());
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "running">("idle");
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Scroll output to bottom on new lines
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const run = useCallback(async () => {
    setOutput([]);
    setImages([]);
    setStatus("loading");

    try {
      const py = await getPyodide(packages);
      setStatus("running");

      const lines: OutputLine[] = [];

      py.setStdout({
        batched: (s: string) => {
          lines.push({ type: "stdout", text: s });
          setOutput([...lines]);
        },
      });
      py.setStderr({
        batched: (s: string) => {
          lines.push({ type: "stderr", text: s });
          setOutput([...lines]);
        },
      });

      // Set up matplotlib to render to base64 if package loaded
      const matplotlibSetup = packages.includes("matplotlib")
        ? `
import sys
import io
import base64
_captured_figures = []
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as _plt
    _orig_show = _plt.show
    def _patched_show(*args, **kwargs):
        buf = io.BytesIO()
        _plt.savefig(buf, format="png", bbox_inches="tight", dpi=100)
        buf.seek(0)
        _captured_figures.append(base64.b64encode(buf.read()).decode())
        _plt.close("all")
    _plt.show = _patched_show
except ImportError:
    pass
`
        : "";

      await py.runPythonAsync(matplotlibSetup + "\n" + code);

      // Extract matplotlib figures
      if (packages.includes("matplotlib")) {
        try {
          const figs = await py.runPythonAsync(
            "import json; json.dumps(_captured_figures)"
          ) as string;
          const parsed = JSON.parse(figs) as string[];
          if (parsed.length > 0) setImages(parsed);
        } catch { /* no figures */ }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setOutput((prev) => [...prev, { type: "error", text: msg }]);
    } finally {
      setStatus("idle");
    }
  }, [code, packages]);

  const reset = useCallback(() => {
    setCode(initialCode.trim());
    setOutput([]);
    setImages([]);
  }, [initialCode]);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);

  const hasOutput = output.length > 0 || images.length > 0;

  return (
    <div
      className="my-6 rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--color-border-default)", background: "var(--color-bg-surface)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--color-border-subtle)", background: "var(--color-bg-elevated)" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
            <div className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
            <div className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
          </div>
          <span className="text-xs font-mono ml-2" style={{ color: "var(--color-text-muted)" }}>
            {title ?? "Python"}
          </span>
          {packages.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(124,58,237,0.12)", color: "var(--color-purple-300)", border: "1px solid rgba(124,58,237,0.2)" }}>
              {packages.join(", ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={copy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all"
            style={{ color: "var(--color-text-muted)", background: "transparent" }}
            title="Copy code"
          >
            {copied ? <Check className="h-3.5 w-3.5" style={{ color: "#28c840" }} /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {!readOnly && (
            <button
              onClick={reset}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all"
              style={{ color: "var(--color-text-muted)", background: "transparent" }}
              title="Reset code"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={run}
            disabled={status !== "idle"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
              color: "#fff",
              boxShadow: status === "idle" ? "var(--glow-purple-sm)" : "none",
            }}
          >
            {status === "loading" ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading Python…</>
            ) : status === "running" ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running…</>
            ) : (
              <><Play className="h-3.5 w-3.5" /> Run</>
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <MonacoEditor
        height={height}
        language="python"
        value={code}
        onChange={(v) => !readOnly && setCode(v ?? "")}
        options={{
          readOnly,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          renderLineHighlight: "line",
          padding: { top: 12, bottom: 12 },
          scrollbar: { vertical: "auto", horizontal: "auto" },
          overviewRulerLanes: 0,
          theme: "vs-dark",
          tabSize: 4,
          wordWrap: "on",
          automaticLayout: true,
        }}
        theme="vs-dark"
      />

      {/* Output */}
      {hasOutput && (
        <div
          style={{ borderTop: "1px solid var(--color-border-subtle)", background: "#0a0a0f" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <Terminal className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
            <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>Output</span>
          </div>
          <div
            ref={outputRef}
            className="px-4 py-3 font-mono text-sm max-h-64 overflow-y-auto"
          >
            {output.map((line, i) => (
              <div
                key={i}
                style={{
                  color: line.type === "stderr" || line.type === "error"
                    ? "#f87171"
                    : line.type === "result"
                    ? "var(--color-cyan-400)"
                    : "#e2e8f0",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  lineHeight: "1.6",
                }}
              >
                {line.type === "error" && <span style={{ color: "#f87171" }}>Error: </span>}
                {line.text}
              </div>
            ))}
            {images.map((b64, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={`data:image/png;base64,${b64}`}
                alt={`plot-${i}`}
                className="mt-3 rounded-lg max-w-full"
                style={{ maxHeight: 400 }}
              />
            ))}
          </div>
        </div>
      )}

      {/* First-run hint */}
      {!hasOutput && status === "idle" && (
        <div
          className="px-4 py-2.5 text-xs text-center"
          style={{ borderTop: "1px solid var(--color-border-subtle)", color: "var(--color-text-disabled)" }}
        >
          Click <strong style={{ color: "var(--color-purple-300)" }}>Run</strong> to execute — Python runs in your browser via WebAssembly
        </div>
      )}
    </div>
  );
}
