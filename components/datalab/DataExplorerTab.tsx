"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, Download, ChevronUp, ChevronDown, ChevronsUpDown, Filter, X } from "lucide-react";
import type { DatasetSummary } from "@/lib/datalab";

type Row  = Record<string, unknown>;
type Sort = { col: string; dir: "asc" | "desc" } | null;

const PAGE_SIZE = 50;
const MAX_ROWS  = 50_000; // cap for browser performance

function exportCSV(rows: Row[], name: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name;
  a.click();
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(4);
  return String(v);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  activeRows: Row[];
  summary: DatasetSummary;
}

export function DataExplorerTab({ activeRows, summary }: Props) {
  const columns = useMemo(() => summary.columns.map(c => c.name), [summary.columns]);

  // Limit working set for large datasets
  const workingRows = useMemo(
    () => activeRows.length > MAX_ROWS ? activeRows.slice(0, MAX_ROWS) : activeRows,
    [activeRows]
  );

  const [globalSearch, setGlobalSearch]   = useState("");
  const [colFilters, setColFilters]       = useState<Record<string, string>>({});
  const [sort, setSort]                   = useState<Sort>(null);
  const [page, setPage]                   = useState(0);
  const [showFilters, setShowFilters]     = useState(false);

  const activeFilterCount = Object.values(colFilters).filter(Boolean).length + (globalSearch ? 1 : 0);

  const filtered = useMemo(() => {
    let rows = workingRows;

    // Global search
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      rows = rows.filter(row =>
        columns.some(col => String(row[col] ?? "").toLowerCase().includes(q))
      );
    }

    // Per-column filters
    for (const [col, val] of Object.entries(colFilters)) {
      if (!val.trim()) continue;
      const q = val.toLowerCase();
      // Support operators: >, <, >=, <=, != prefix
      if (/^[><!]=?/.test(q)) {
        const op  = q.match(/^([><!]=?)/)?.[1] ?? "=";
        const num = parseFloat(q.replace(/^[><!]=?/, "").trim());
        if (!isNaN(num)) {
          rows = rows.filter(row => {
            const v = parseFloat(String(row[col] ?? ""));
            if (isNaN(v)) return false;
            if (op === ">")  return v > num;
            if (op === ">=") return v >= num;
            if (op === "<")  return v < num;
            if (op === "<=") return v <= num;
            if (op === "!=") return v !== num;
            return true;
          });
          continue;
        }
      }
      rows = rows.filter(row => String(row[col] ?? "").toLowerCase().includes(q));
    }

    return rows;
  }, [workingRows, globalSearch, colFilters, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const { col, dir } = sort;
    return [...filtered].sort((a, b) => {
      const va = a[col], vb = b[col];
      const na = parseFloat(String(va ?? "")), nb = parseFloat(String(vb ?? ""));
      let cmp: number;
      if (!isNaN(na) && !isNaN(nb)) cmp = na - nb;
      else cmp = String(va ?? "").localeCompare(String(vb ?? ""));
      return dir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows   = useMemo(
    () => sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [sorted, page]
  );

  const toggleSort = useCallback((col: string) => {
    setSort(prev => {
      if (!prev || prev.col !== col) return { col, dir: "asc" };
      if (prev.dir === "asc") return { col, dir: "desc" };
      return null;
    });
    setPage(0);
  }, []);

  const setFilter = useCallback((col: string, val: string) => {
    setColFilters(prev => ({ ...prev, [col]: val }));
    setPage(0);
  }, []);

  const clearFilters = useCallback(() => {
    setGlobalSearch("");
    setColFilters({});
    setPage(0);
  }, []);

  // Limit displayed columns for very wide datasets
  const displayCols = columns.slice(0, 25);
  const hiddenColCount = columns.length - displayCols.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>Data Explorer</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {filtered.length.toLocaleString()} / {workingRows.length.toLocaleString()} rows shown
            {activeRows.length > MAX_ROWS && (
              <span style={{ color: "#f59e0b" }}> · first {MAX_ROWS.toLocaleString()} rows loaded</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{
              background: showFilters ? "rgba(124,58,237,0.12)" : "var(--color-bg-elevated)",
              border: `1px solid ${showFilters ? "rgba(124,58,237,0.35)" : "var(--color-border-default)"}`,
              color: showFilters ? "var(--color-purple-300)" : "var(--color-text-muted)",
            }}>
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(124,58,237,0.25)", color: "var(--color-purple-300)" }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs"
              style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
          <button
            onClick={() => exportCSV(sorted, summary.fileName.replace(/\.[^.]+$/, "") + "_filtered.csv")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        {/* Global search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--color-text-disabled)" }} />
          <input
            value={globalSearch}
            onChange={e => { setGlobalSearch(e.target.value); setPage(0); }}
            placeholder="Search across all columns…"
            className="w-full text-sm pl-9 pr-4 py-2.5 rounded-xl outline-none"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}
          />
          {globalSearch && (
            <button onClick={() => { setGlobalSearch(""); setPage(0); }}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-disabled)" }}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Per-column filters */}
        {showFilters && (
          <div className="rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
            <p className="col-span-full text-xs font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
              Per-column filters — supports &gt;, &lt;, &gt;=, &lt;=, != for numeric columns
            </p>
            {displayCols.map(col => (
              <div key={col}>
                <label className="block text-xs mb-1 truncate" style={{ color: "var(--color-text-disabled)" }} title={col}>{col}</label>
                <input
                  value={colFilters[col] ?? ""}
                  onChange={e => setFilter(col, e.target.value)}
                  placeholder="filter…"
                  className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                  style={{ background: "var(--color-bg-surface)", border: `1px solid ${colFilters[col] ? "rgba(124,58,237,0.45)" : "var(--color-border-default)"}`, color: "var(--color-text-secondary)" }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}>
        {pageRows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No rows match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: "collapse", minWidth: "600px" }}>
              <thead>
                <tr style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-default)" }}>
                  <th className="px-3 py-2.5 text-left font-semibold"
                    style={{ color: "var(--color-text-disabled)", width: 50, minWidth: 50 }}>#</th>
                  {displayCols.map(col => {
                    const isActive = sort?.col === col;
                    return (
                      <th key={col}
                        onClick={() => toggleSort(col)}
                        className="px-3 py-2.5 text-left font-semibold cursor-pointer select-none whitespace-nowrap"
                        style={{ color: isActive ? "var(--color-purple-300)" : "var(--color-text-muted)", userSelect: "none" }}>
                        <span className="inline-flex items-center gap-1">
                          {col}
                          {isActive && sort?.dir === "asc"  && <ChevronUp   className="h-3 w-3 shrink-0" />}
                          {isActive && sort?.dir === "desc" && <ChevronDown  className="h-3 w-3 shrink-0" />}
                          {!isActive && <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-30" />}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => {
                  const rowIndex = page * PAGE_SIZE + i + 1;
                  return (
                    <tr key={i}
                      style={{
                        borderBottom: "1px solid var(--color-border-subtle)",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                      }}>
                      <td className="px-3 py-2 font-mono" style={{ color: "var(--color-text-disabled)" }}>
                        {rowIndex}
                      </td>
                      {displayCols.map(col => {
                        const val = row[col];
                        const isNull = val === null || val === undefined || val === "";
                        const numVal = typeof val === "number" ? val : parseFloat(String(val ?? ""));
                        const isNum  = !isNaN(numVal) && val !== "";
                        return (
                          <td key={col} className="px-3 py-2 whitespace-nowrap"
                            style={{
                              color: isNull ? "var(--color-text-disabled)" : isNum ? "var(--color-text-secondary)" : "var(--color-text-secondary)",
                              fontStyle: isNull ? "italic" : "normal",
                              fontFamily: isNum ? "var(--font-jetbrains, monospace)" : "inherit",
                            }}>
                            {isNull ? "null" : fmtVal(val)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Page {page + 1} of {totalPages} · {PAGE_SIZE} rows/page
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(0)} disabled={page === 0}
                className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
                «
              </button>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
                ‹
              </button>
              {/* Page number buttons (show up to 5) */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const half = 2;
                let start = Math.max(0, Math.min(page - half, totalPages - 5));
                const p = start + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: p === page ? "rgba(124,58,237,0.2)" : "var(--color-bg-elevated)",
                      border: `1px solid ${p === page ? "rgba(124,58,237,0.4)" : "var(--color-border-default)"}`,
                      color: p === page ? "var(--color-purple-300)" : "var(--color-text-muted)",
                    }}>
                    {p + 1}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
                ›
              </button>
              <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
                className="px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-30"
                style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}>
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {hiddenColCount > 0 && (
        <p className="text-xs text-center" style={{ color: "var(--color-text-disabled)" }}>
          Showing first 25 of {columns.length} columns. Apply transforms to drop unused columns for a cleaner view.
        </p>
      )}
    </div>
  );
}
