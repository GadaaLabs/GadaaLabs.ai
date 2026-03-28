import { MDXRemote } from "next-mdx-remote/rsc";
import { highlight } from "@/lib/shiki";
import { Copy } from "lucide-react";

// Server-side Shiki code block
async function CodeBlock({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const lang = className?.replace("language-", "") ?? "text";
  const html = await highlight(String(children).trim(), lang);

  return (
    <div className="group relative my-6">
      {/* Language badge */}
      {lang && lang !== "text" && (
        <span
          className="absolute top-3 right-10 text-xs px-2 py-0.5 rounded font-mono uppercase tracking-wider z-10"
          style={{
            color: "var(--color-text-muted)",
            background: "var(--color-bg-elevated)",
          }}
        >
          {lang}
        </span>
      )}
      {/* Copy button (progressive enhancement — needs client hydration for clipboard) */}
      <span
        className="absolute top-2.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
        style={{ color: "var(--color-text-muted)" }}
        title="Copy code"
      >
        <Copy className="h-3.5 w-3.5" />
      </span>
      {/* Highlighted output */}
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        className="shiki-wrapper"
        style={{ borderRadius: "0.75rem", overflow: "hidden" }}
      />
    </div>
  );
}

function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "tip" | "danger";
  children: React.ReactNode;
}) {
  const styles = {
    info:    { bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.3)",  label: "Info",    color: "#60a5fa" },
    tip:     { bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.3)",  label: "Tip",     color: "#34d399" },
    warning: { bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.3)",  label: "Warning", color: "#fbbf24" },
    danger:  { bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.3)",   label: "Danger",  color: "#f87171" },
  };
  const s = styles[type];
  return (
    <div
      className="my-5 rounded-xl px-5 py-4"
      style={{ background: s.bg, borderLeft: `3px solid ${s.border}` }}
    >
      <span className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: s.color }}>
        {s.label}
      </span>
      <div style={{ color: "var(--color-text-secondary)" }}>{children}</div>
    </div>
  );
}

export const MDXComponents = {
  // Headings
  h1: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-3xl font-bold mt-10 mb-4 scroll-mt-20" style={{ color: "var(--color-text-primary)" }} {...p} />
  ),
  h2: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-2xl font-bold mt-10 mb-4 scroll-mt-20 gradient-text" {...p} />
  ),
  h3: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-lg font-semibold mt-6 mb-3 scroll-mt-20" style={{ color: "var(--color-text-primary)" }} {...p} />
  ),
  // Body
  p: (p: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="my-4 leading-relaxed" style={{ color: "var(--color-text-secondary)" }} {...p} />
  ),
  // Lists
  ul: (p: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-4 ml-6 space-y-2 list-disc" style={{ color: "var(--color-text-secondary)" }} {...p} />
  ),
  ol: (p: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-4 ml-6 space-y-2 list-decimal" style={{ color: "var(--color-text-secondary)" }} {...p} />
  ),
  li: (p: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...p} />
  ),
  // Inline code
  code: (p: React.HTMLAttributes<HTMLElement> & { className?: string }) => {
    if (p.className) return <code {...p} />;
    return (
      <code
        className="px-1.5 py-0.5 rounded text-sm font-mono"
        style={{
          background: "var(--color-bg-elevated)",
          color: "var(--color-purple-300)",
          border: "1px solid var(--color-border-default)",
        }}
        {...p}
      />
    );
  },
  // Code blocks — delegate to async Shiki component
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement> & { children?: React.ReactElement<{ className?: string; children: string }> }) => {
    if (children && typeof children === "object" && "props" in children) {
      return (
        <CodeBlock className={children.props.className}>
          {children.props.children}
        </CodeBlock>
      );
    }
    return <pre {...props}>{children}</pre>;
  },
  // Table
  table: (p: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 overflow-x-auto rounded-xl" style={{ border: "1px solid var(--color-border-default)" }}>
      <table className="w-full text-sm" {...p} />
    </div>
  ),
  thead: (p: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border-default)" }} {...p} />
  ),
  th: (p: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }} {...p} />
  ),
  td: (p: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)", borderTop: "1px solid var(--color-border-subtle)" }} {...p} />
  ),
  // Blockquote
  blockquote: (p: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-5 pl-5 italic"
      style={{
        borderLeft: "3px solid var(--color-purple-600)",
        color: "var(--color-text-muted)",
      }}
      {...p}
    />
  ),
  // Horizontal rule
  hr: () => <hr className="my-8" style={{ borderColor: "var(--color-border-default)" }} />,
  // Links
  a: (p: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="underline decoration-dotted underline-offset-4 transition-colors"
      style={{ color: "var(--color-purple-400)" }}
      target={p.href?.startsWith("http") ? "_blank" : undefined}
      rel={p.href?.startsWith("http") ? "noopener noreferrer" : undefined}
      {...p}
    />
  ),
  // Custom components available in MDX
  Callout,
};

export function MDXContent({ source }: { source: string }) {
  return (
    <div className="mdx-content max-w-none">
      <MDXRemote source={source} components={MDXComponents} />
    </div>
  );
}
