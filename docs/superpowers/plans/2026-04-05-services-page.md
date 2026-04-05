# Services Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/services` page with portfolio + Calendly CTA, a homepage teaser strip, and a footer Services column to GadaaLabs.com.

**Architecture:** Four file changes — two new components (`ServicesTeaser`, `app/services/page.tsx`) and two edits (`app/page.tsx`, `components/layout/Footer.tsx`). No API calls, no CMS, no auth. All data is hardcoded static arrays. Main nav is untouched.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Tailwind CSS v4 · Lucide React · CSS custom properties from `globals.css`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `components/marketing/ServicesTeaser.tsx` | Compact homepage strip — headline + CTA to `/services` |
| Create | `app/services/page.tsx` | Full services page — hero, service cards, portfolio grid, how-it-works, CTA |
| Modify | `app/page.tsx` | Wire in `<ServicesTeaser />` after `<LiveDemoTeaser />` |
| Modify | `components/layout/Footer.tsx` | Add "Services" link column |

---

## Task 1: Create the ServicesTeaser component

**Files:**
- Create: `components/marketing/ServicesTeaser.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/marketing/ServicesTeaser.tsx
import Link from "next/link";
import { Globe } from "lucide-react";

export function ServicesTeaser() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <div
        className="rounded-2xl px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.04))",
          border: "1px solid rgba(124,58,237,0.2)",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl mt-0.5"
            style={{
              background: "linear-gradient(135deg, var(--color-purple-600), var(--color-cyan-500))",
            }}
          >
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <p
              className="text-lg font-bold mb-1"
              style={{ color: "var(--color-text-primary)" }}
            >
              Need a website for your business?
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              We build fast, modern websites for small businesses. See our work and book a free call.
            </p>
          </div>
        </div>
        <Link
          href="/services"
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
            color: "#fff",
            boxShadow: "var(--glow-purple-sm)",
          }}
        >
          View Our Services →
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: build succeeds (component not yet used, but should compile cleanly).

- [ ] **Step 3: Commit**

```bash
git add components/marketing/ServicesTeaser.tsx
git commit -m "feat(services): add ServicesTeaser homepage strip component"
```

---

## Task 2: Wire ServicesTeaser into the homepage

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update the homepage**

```tsx
// app/page.tsx
import { Hero } from "@/components/marketing/Hero";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { LiveDemoTeaser } from "@/components/marketing/LiveDemoTeaser";
import { ServicesTeaser } from "@/components/marketing/ServicesTeaser";
import { getAllCourses } from "@/lib/courses";

export default function HomePage() {
  const courseCount = getAllCourses().length;
  return (
    <>
      <Hero courseCount={courseCount} />
      <FeatureGrid />
      <LiveDemoTeaser />
      <ServicesTeaser />
    </>
  );
}
```

- [ ] **Step 2: Run dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:3000`. Scroll to the bottom of the homepage. The purple teaser strip should appear above the footer with "Need a website for your business?" on the left and "View Our Services →" on the right.

- [ ] **Step 3: Build to confirm no TypeScript errors**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(services): wire ServicesTeaser into homepage"
```

---

## Task 3: Create the full /services page

**Files:**
- Create: `app/services/page.tsx`

- [ ] **Step 1: Create the page with all data and sections**

```tsx
// app/services/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe,
  Layout,
  User,
  ExternalLink,
  Calendar,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Web Development Services | GadaaLabs",
  description:
    "GadaaLabs builds modern, fast websites for small businesses. See our portfolio and book a free discovery call.",
};

const services = [
  {
    icon: Globe,
    title: "Business Websites",
    description:
      "Full multi-page sites that represent your business professionally online — built to load fast, rank well, and convert visitors.",
    features: ["Mobile-first design", "Fast load times", "SEO-ready structure"],
  },
  {
    icon: Layout,
    title: "Landing Pages",
    description:
      "High-conversion single-page sites for products, launches, or campaigns — laser-focused on one goal.",
    features: ["Conversion-focused layout", "Clear calls to action", "Analytics-ready"],
  },
  {
    icon: User,
    title: "Portfolio & Showcase",
    description:
      "Personal or company showcase sites for professionals and creatives — clean, memorable, and easy to share.",
    features: ["Clean, modern design", "Easy to update", "Shareable and memorable"],
  },
];

const portfolio = [
  {
    name: "Immigration Services",
    description:
      "A polished, trust-building website for an immigration consulting agency — designed to turn anxious visitors into confident clients.",
    url: "https://preview.gadaalabs.com/",
    category: "Business Website",
  },
  {
    name: "Mimz Barbershop",
    description:
      "A sharp, modern site for a premium barbershop — built to make a strong first impression and keep clients coming back.",
    url: "https://mimz.gadaalabs.com/",
    category: "Business Website",
  },
  {
    name: "Perth City Barbershop",
    description:
      "A sleek, mobile-first site for a city barbershop that commands attention, communicates quality, and drives bookings.",
    url: "https://perthcity.gadaalabs.com/",
    category: "Business Website",
  },
];

const steps = [
  {
    number: "01",
    title: "Book a free call",
    description: "Tell us about your business and what you need. No commitment, no pressure.",
  },
  {
    number: "02",
    title: "We scope & quote",
    description: "Clear deliverables, honest timeline, fixed price. No surprises.",
  },
  {
    number: "03",
    title: "We build & deliver",
    description: "Modern, fast, handoff-ready. You own everything — code, domain, content.",
  },
];

const CALENDLY_URL = "https://calendly.com/seif-explorer4";

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">

      {/* Hero */}
      <div className="text-center mb-20">
        <div
          className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
          style={{
            background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.3)",
            color: "var(--color-purple-400)",
          }}
        >
          <Globe className="h-3 w-3" /> Professional Services
        </div>
        <h1
          className="text-5xl font-bold mb-6 leading-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          We Build for <span className="gradient-text">Businesses</span>
        </h1>
        <p
          className="text-lg max-w-2xl mx-auto leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          GadaaLabs keeps world-class AI education free. Professional web development
          is how we sustain it — and we bring the same engineering rigour to every site we ship.
        </p>
      </div>

      {/* What We Build */}
      <div className="mb-20">
        <h2
          className="text-2xl font-bold mb-2 text-center"
          style={{ color: "var(--color-text-primary)" }}
        >
          What We Build
        </h2>
        <p
          className="text-center text-sm mb-10"
          style={{ color: "var(--color-text-muted)" }}
        >
          Every project is built with an industry-leading web stack — fast, modern, and ready to grow with your business.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {services.map(({ icon: Icon, title, description, features }) => (
            <div
              key={title}
              className="rounded-xl p-6"
              style={{
                background: "var(--color-bg-surface)",
                border: "1px solid var(--color-border-default)",
              }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg mb-4"
                style={{
                  background: "rgba(124,58,237,0.12)",
                  border: "1px solid rgba(124,58,237,0.2)",
                }}
              >
                <Icon className="h-5 w-5" style={{ color: "var(--color-purple-400)" }} />
              </div>
              <h3
                className="font-bold text-base mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                {title}
              </h3>
              <p
                className="text-sm leading-relaxed mb-4"
                style={{ color: "var(--color-text-muted)" }}
              >
                {description}
              </p>
              <ul className="space-y-1.5">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-purple-400)" }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio */}
      <div className="mb-20">
        <h2
          className="text-2xl font-bold mb-2 text-center"
          style={{ color: "var(--color-text-primary)" }}
        >
          Our Work
        </h2>
        <p
          className="text-center text-sm mb-10"
          style={{ color: "var(--color-text-muted)" }}
        >
          Live sites we have designed and delivered — click to see them in action.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {portfolio.map(({ name, description, url, category }) => (
            <div
              key={name}
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: "var(--color-bg-surface)",
                border: "1px solid var(--color-border-default)",
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3
                  className="font-bold text-base"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {name}
                </h3>
                <span
                  className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: "rgba(124,58,237,0.1)",
                    color: "var(--color-purple-400)",
                    border: "1px solid rgba(124,58,237,0.2)",
                  }}
                >
                  {category}
                </span>
              </div>
              <p
                className="text-sm leading-relaxed flex-1 mb-5"
                style={{ color: "var(--color-text-muted)" }}
              >
                {description}
              </p>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--color-text-disabled)" }}
                >
                  Industry-leading web stack
                </span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                  style={{
                    background: "rgba(6,182,212,0.1)",
                    color: "var(--color-cyan-400)",
                    border: "1px solid rgba(6,182,212,0.2)",
                  }}
                >
                  View Live <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-20">
        <h2
          className="text-2xl font-bold mb-2 text-center"
          style={{ color: "var(--color-text-primary)" }}
        >
          How It Works
        </h2>
        <p
          className="text-center text-sm mb-12"
          style={{ color: "var(--color-text-muted)" }}
        >
          Simple, transparent process from first conversation to final delivery.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map(({ number, title, description }, i) => (
            <div key={number} className="flex flex-col items-center text-center relative">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full mb-4 text-xl font-black"
                style={{
                  background: "linear-gradient(135deg, var(--color-purple-600), var(--color-cyan-500))",
                  color: "#fff",
                  boxShadow: "var(--glow-purple-sm)",
                }}
              >
                {number}
              </div>
              {i < steps.length - 1 && (
                <div
                  className="hidden md:block absolute top-7 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] h-px"
                  style={{ background: "var(--color-border-default)" }}
                />
              )}
              <h3
                className="font-bold mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div
        className="rounded-2xl p-10 text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.06))",
          border: "1px solid rgba(124,58,237,0.25)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 50% 100%, rgba(124,58,237,0.1) 0%, transparent 70%)",
          }}
        />
        <div className="relative">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-5"
            style={{
              background: "linear-gradient(135deg, var(--color-purple-600), var(--color-cyan-500))",
              boxShadow: "var(--glow-purple)",
            }}
          >
            <Calendar className="h-7 w-7 text-white" />
          </div>
          <h2
            className="text-3xl font-bold mb-3"
            style={{ color: "var(--color-text-primary)" }}
          >
            Ready to get started?
          </h2>
          <p
            className="text-base mb-8 max-w-md mx-auto"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Book a free 30-minute discovery call. Tell us about your business — no commitment required.
          </p>
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-base transition-all hover:-translate-y-0.5 hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
              color: "#fff",
              boxShadow: "var(--glow-purple)",
            }}
          >
            Book a Discovery Call <ArrowRight className="h-4 w-4" />
          </a>
          <p
            className="text-xs mt-4"
            style={{ color: "var(--color-text-disabled)" }}
          >
            We respond within 24 hours.
          </p>
        </div>
      </div>

    </div>
  );
}
```

- [ ] **Step 2: Run dev server and visually verify the page**

```bash
npm run dev
```

Open `http://localhost:3000/services`. Check:
- Hero renders with badge, headline, sub-copy
- 3 service cards visible (Business Websites, Landing Pages, Portfolio & Showcase)
- 3 portfolio cards visible with "View Live" buttons linking to correct subdomains
- How It Works shows 3 numbered steps
- CTA section shows "Book a Discovery Call" button linking to Calendly

- [ ] **Step 3: Build to confirm no TypeScript errors**

```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/services/page.tsx
git commit -m "feat(services): add full /services page with portfolio and Calendly CTA"
```

---

## Task 4: Add Services column to the footer

**Files:**
- Modify: `components/layout/Footer.tsx`

- [ ] **Step 1: Update the links object and footer grid**

The current `links` object in `components/layout/Footer.tsx` has three columns: Learn, Tools, Company. Add a Services column. The footer grid currently renders the brand col as `col-span-2 md:col-span-1` and three link columns — adding a fourth column fits naturally.

Replace:
```tsx
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
    { label: "DataLab", href: "/datalab" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Donate", href: "/donate" },
    { label: "Contact", href: "/contact" },
    { label: "Dashboard", href: "/dashboard" },
  ],
};
```

With:
```tsx
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
    { label: "DataLab", href: "/datalab" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Donate", href: "/donate" },
    { label: "Contact", href: "/contact" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  Services: [
    { label: "Services Overview", href: "/services" },
    { label: "Book a Call", href: "https://calendly.com/seif-explorer4" },
  ],
};
```

- [ ] **Step 2: Update the footer grid to accommodate 4 columns**

The grid div currently reads:
```tsx
<div className="grid grid-cols-2 gap-8 md:grid-cols-4">
```

This already uses `md:grid-cols-4`. The brand column takes `col-span-2 md:col-span-1`, leaving 3 columns for links. Adding a 4th link column means updating the grid:

```tsx
<div className="grid grid-cols-2 gap-8 md:grid-cols-5">
```

The brand col stays `col-span-2 md:col-span-1`. The 4 link columns fill the remaining 4 slots on desktop. On mobile, all cols stack naturally in a 2-column grid.

- [ ] **Step 3: Run dev server and verify footer**

```bash
npm run dev
```

Open `http://localhost:3000` and scroll to the footer. Confirm "Services" column appears with "Services Overview" and "Book a Call" links. Click both — "Services Overview" should navigate to `/services`, "Book a Call" should open `https://calendly.com/seif-explorer4` in a new tab.

Note: "Book a Call" links to an external URL. The footer's `Link` component renders anchor tags — for the external link, verify it doesn't produce a Next.js navigation warning. If it does, change that specific item to an `<a>` tag with `target="_blank" rel="noopener noreferrer"` inside the footer render loop.

- [ ] **Step 4: Build and lint**

```bash
npm run build && npm run lint
```

Expected: both pass with no errors.

- [ ] **Step 5: Commit**

```bash
git add components/layout/Footer.tsx
git commit -m "feat(services): add Services column to footer with Calendly link"
```

---

## Self-Review

**Spec coverage check:**
- [x] `/services` page — Task 3
- [x] Hero (badge, headline, sub-copy with honest model framing) — Task 3, Block 1
- [x] What We Build (3 service cards with features) — Task 3, Block 2
- [x] Portfolio grid (3 projects, live links, "industry-leading web stack" badge, no tech disclosure) — Task 3, Block 3
- [x] How It Works (3-step process) — Task 3, Block 4
- [x] CTA with Calendly URL `https://calendly.com/seif-explorer4` — Task 3, Block 5
- [x] ServicesTeaser homepage strip — Task 1
- [x] Wire teaser into homepage after `<LiveDemoTeaser />` — Task 2
- [x] Footer Services column with two links — Task 4
- [x] Main nav untouched — confirmed, no nav changes in any task

**Placeholder scan:** No TBD, no TODO, no "implement later". All code blocks are complete and runnable.

**Type consistency:** `portfolio`, `services`, and `steps` arrays are defined and consumed within the same file. No cross-file type dependencies introduced.
