import type { Metadata } from "next";
import { Heart, Zap, BookOpen, Code2, Users, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "Donate",
  description: "Support GadaaLabs and help us keep AI education free and open for everyone.",
};

const tiers = [
  {
    name: "Supporter",
    amount: 5,
    period: "month",
    description: "Keep the lights on",
    perks: ["Ad-free experience", "Supporter badge", "Early access to new content"],
    color: "var(--color-cyan-500)",
    glow: "0 0 24px rgba(6,182,212,0.2)",
    featured: false,
  },
  {
    name: "Contributor",
    amount: 15,
    period: "month",
    description: "Fuel new courses",
    perks: [
      "Everything in Supporter",
      "Vote on upcoming courses",
      "Monthly behind-the-scenes update",
      "Name in credits",
    ],
    color: "var(--color-purple-400)",
    glow: "var(--glow-purple)",
    featured: true,
  },
  {
    name: "Patron",
    amount: 50,
    period: "month",
    description: "Champion AI education",
    perks: [
      "Everything in Contributor",
      "1-on-1 office hours (30 min/mo)",
      "Priority support",
      "Company logo in footer",
    ],
    color: "#fbbf24",
    glow: "0 0 24px rgba(251,191,36,0.2)",
    featured: false,
  },
];

const stats = [
  { icon: BookOpen, label: "Free lessons", value: "200+" },
  { icon: Code2, label: "Interactive demos", value: "12" },
  { icon: Users, label: "Learners helped", value: "5,000+" },
  { icon: Star, label: "GitHub stars", value: "Open source" },
];

export default function DonatePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, var(--color-purple-600), #ec4899)",
              boxShadow: "0 0 40px rgba(236,72,153,0.3)",
            }}
          >
            <Heart className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>
          Support <span className="gradient-text">GadaaLabs</span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          GadaaLabs is built by engineers, for engineers — entirely free, no paywalls, no ads.
          Your contribution directly funds new courses, interactive demos, and server costs.
        </p>
      </div>

      {/* Impact stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {stats.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl p-5 text-center"
            style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
          >
            <Icon className="h-5 w-5 mx-auto mb-2" style={{ color: "var(--color-purple-400)" }} />
            <div className="text-xl font-bold gradient-text">{value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className="rounded-2xl p-6 flex flex-col relative"
            style={{
              background: tier.featured ? "rgba(124,58,237,0.06)" : "var(--color-bg-surface)",
              border: `1px solid ${tier.featured ? "var(--color-purple-500)" : "var(--color-border-default)"}`,
              boxShadow: tier.featured ? tier.glow : "none",
            }}
          >
            {tier.featured && (
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold"
                style={{
                  background: "linear-gradient(90deg, var(--color-purple-600), var(--color-cyan-500))",
                  color: "#fff",
                }}
              >
                Most Popular
              </div>
            )}
            <div className="mb-4">
              <h3 className="text-lg font-bold mb-1" style={{ color: tier.color }}>
                {tier.name}
              </h3>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {tier.description}
              </p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                ${tier.amount}
              </span>
              <span className="text-sm ml-1" style={{ color: "var(--color-text-muted)" }}>
                /{tier.period}
              </span>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {tier.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  <Zap className="h-4 w-4 mt-0.5 shrink-0" style={{ color: tier.color }} />
                  {perk}
                </li>
              ))}
            </ul>
            <a
              href={`https://buy.stripe.com/placeholder_${tier.name.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-3 rounded-xl font-semibold text-sm transition-all"
              style={
                tier.featured
                  ? {
                      background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-500))",
                      color: "#fff",
                      boxShadow: "var(--glow-purple-sm)",
                    }
                  : {
                      background: "var(--color-bg-elevated)",
                      color: "var(--color-text-primary)",
                      border: "1px solid var(--color-border-default)",
                    }
              }
            >
              Get Started
            </a>
          </div>
        ))}
      </div>

      {/* One-time donation */}
      <div
        className="rounded-2xl p-8 text-center mb-16"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
      >
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
          Prefer a one-time contribution?
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
          No recurring commitment — every contribution helps.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {[10, 25, 50, 100].map((amt) => (
            <a
              key={amt}
              href={`https://buy.stripe.com/placeholder_onetime`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-text-primary)",
              }}
            >
              ${amt}
            </a>
          ))}
        </div>
        <p className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
          Payments processed securely via Stripe. GadaaLabs does not store card information.
        </p>
      </div>

      {/* Why donate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: "Free Forever",
            body: "We believe quality AI education should be accessible to every developer, regardless of their budget.",
          },
          {
            title: "No VC Funding",
            body: "GadaaLabs is self-funded and community-supported. Your donation directly funds the work — no investors to answer to.",
          },
          {
            title: "Open Roadmap",
            body: "Contributors vote on what gets built next. Your support gives you a voice in shaping the platform.",
          },
        ].map(({ title, body }) => (
          <div
            key={title}
            className="rounded-xl p-5"
            style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)" }}
          >
            <h3 className="font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
              {title}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              {body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
