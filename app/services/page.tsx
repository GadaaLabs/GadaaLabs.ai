// app/services/page.tsx
import type { Metadata } from "next";
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
