"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Zap } from "lucide-react";
import { AuthButton } from "@/components/auth/AuthButton";

const nav = [
  { label: "Learn", href: "/learn" },
  { label: "Guides", href: "/guides" },
  { label: "Quizzes", href: "/quizzes" },
  { label: "DataLab", href: "/datalab" },
  { label: "Demos", href: "/demos" },
  { label: "Playground", href: "/playground" },
  { label: "Donate", href: "/donate" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: "rgba(10, 10, 18, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <div className="mx-auto max-w-7xl px-6 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: "linear-gradient(135deg, var(--color-purple-600), var(--color-cyan-500))",
            }}
          >
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span
            className="text-lg font-bold tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Gadaa<span className="gradient-text">Labs</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link px-4 py-2 rounded-lg${active ? " nav-active" : ""}`}
                style={{
                  color: active ? "var(--color-purple-400)" : "var(--color-text-secondary)",
                  background: active ? "rgba(124, 58, 237, 0.1)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA + Auth */}
        <div className="hidden md:flex items-center gap-3">
          <AuthButton />
          <Link
            href="/playground"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
              color: "#fff",
              boxShadow: "var(--glow-purple-sm)",
            }}
          >
            Try Playground
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg"
          style={{ color: "var(--color-text-secondary)" }}
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div
          className="md:hidden px-6 pb-4 flex flex-col gap-1"
          style={{ borderTop: "1px solid var(--color-border-subtle)" }}
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-3 rounded-lg text-sm font-medium"
              style={{ color: "var(--color-text-secondary)" }}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/playground"
            className="mt-2 px-4 py-3 rounded-lg text-sm font-semibold text-center"
            style={{
              background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
              color: "#fff",
            }}
            onClick={() => setMobileOpen(false)}
          >
            Try Playground
          </Link>
        </div>
      )}
    </header>
  );
}
