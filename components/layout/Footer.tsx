import Link from "next/link";
import { Zap, Code2, Share2 } from "lucide-react";

const links = {
  Learn: [
    { label: "Courses", href: "/learn" },
    { label: "Guides", href: "/guides" },
    { label: "Articles", href: "/articles" },
    { label: "Quizzes", href: "/quizzes" },
  ],
  Tools: [
    { label: "Playground", href: "/playground" },
    { label: "Demos", href: "/demos" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Donate", href: "/donate" },
    { label: "Dashboard", href: "/dashboard" },
  ],
};

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--color-border-subtle)",
        background: "var(--color-bg-surface)",
      }}
    >
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-purple-600), var(--color-cyan-500))",
                }}
              >
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <span
                className="font-bold tracking-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                Gadaa<span className="gradient-text">Labs</span>
              </span>
            </Link>
            <p
              className="text-sm leading-relaxed mb-4"
              style={{ color: "var(--color-text-muted)" }}
            >
              AI education for engineers. Learn by building.
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/gadaalabs"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg transition-colors"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="GitHub"
              >
                <Code2 className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com/gadaalabs"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg transition-colors"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Twitter / X"
              >
                <Share2 className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <h3
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--color-text-muted)" }}
              >
                {group}
              </h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm transition-colors hover:text-white"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-10 pt-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs"
          style={{
            borderTop: "1px solid var(--color-border-subtle)",
            color: "var(--color-text-muted)",
          }}
        >
          <p>© {new Date().getFullYear()} GadaaLabs. All rights reserved.</p>
          <p>Built for engineers, by engineers.</p>
        </div>
      </div>
    </footer>
  );
}
