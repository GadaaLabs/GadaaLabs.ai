"use client";

import { useState, useRef, useEffect } from "react";
import {
  FileSearch, Briefcase, Scale, ShieldAlert, Zap,
  Send, Loader2, ArrowLeft, Copy, CheckCheck,
  Paperclip, X, ChevronRight, Sparkles, BookOpen,
  MessageSquare, Star, Terminal,
} from "lucide-react";
import { EXPERT_AGENTS } from "@/lib/agents";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Message { role: "user" | "assistant"; content: string; }

const ICON_MAP: Record<string, React.ElementType> = {
  FileSearch, Briefcase, Scale, ShieldAlert, Zap,
};

// ─────────────────────────────────────────────────────────────────────────────
// Rich agent metadata (capabilities + examples shown on card)
// ─────────────────────────────────────────────────────────────────────────────

interface AgentProfile {
  tagline: string;
  badge: string;
  capabilities: string[];
  examples: { title: string; prompt: string }[];
  tips: string[];
  tags: string[];
}

const PROFILES: Record<string, AgentProfile> = {

  "doc-intelligence": {
    tagline: "Your senior NLP engineer, paralegal, and data extraction specialist — all in one.",
    badge: "Document AI",
    capabilities: [
      "Summarize any document at three depth levels: executive, standard, or deep-dive",
      "Extract all key facts, dates, obligations, parties, and monetary values from contracts and legal filings",
      "Analyze NDAs, employment agreements, leases, privacy policies, and ToS for risk clauses",
      "Generate structured JSON or CSV from tables buried inside PDFs or scanned documents",
      "Guide you through filling any government, visa, insurance, or business application field by field",
      "Write complete Python scraping scripts (BeautifulSoup, Scrapy, Playwright) for any public data source",
      "Identify the best free public datasets and APIs for your research (Census, FRED, WHO, World Bank)",
      "Compare two document versions and produce a red-line diff with risk commentary",
    ],
    examples: [
      {
        title: "Contract Risk Scan",
        prompt: "I've pasted a SaaS vendor agreement below. Identify all clauses that create liability for my company, flag unusual terms, and give me a risk score out of 10 with recommended redlines.",
      },
      {
        title: "Scrape a Government Dataset",
        prompt: "Write me a complete Python script to download all historical unemployment data from the BLS public API, clean it, and save it as a tidy CSV ready for analysis.",
      },
      {
        title: "Application Form Guide",
        prompt: "Walk me through Form I-485 (Adjustment of Status) field by field. For each section explain what's required, what documents I need, and what common mistakes to avoid.",
      },
      {
        title: "PDF Intelligence",
        prompt: "I'm attaching a 60-page annual report. Extract: (1) revenue and profit by segment, (2) key risk factors, (3) management's top 5 strategic priorities, and (4) any forward-guidance numbers.",
      },
    ],
    tips: [
      "📎 Attach a document using the paperclip button — I'll reason over its full content.",
      "For best contract analysis, paste the full text and ask for a clause-by-clause breakdown.",
      "For scraping tasks, tell me the target URL and what data fields you need.",
    ],
    tags: ["PDF Analysis", "Contract Review", "Data Extraction", "Web Scraping", "Form Guidance", "NLP"],
  },

  "business-strategist": {
    tagline: "McKinsey-grade strategic thinking. Goldman-caliber financial modeling. Startup-founder hustle.",
    badge: "Business Expert",
    capabilities: [
      "Write investor-ready pitch decks, business plans, and executive summaries from scratch",
      "Build complete 5-year financial models: P&L, cash flow, balance sheet, and scenario analysis",
      "Design pricing strategy and revenue models (SaaS, marketplace, subscription, usage-based)",
      "Create unit economics models: CAC, LTV, payback period, NRR, magic number",
      "Draft Statements of Work, RFP responses, partnership agreements, and client proposals",
      "Identify revenue leakage and design growth loops for any business model",
      "Produce market sizing (TAM/SAM/SOM) with methodology and comparable benchmarks",
      "Design OKR frameworks, KPI dashboards, and team performance structures",
    ],
    examples: [
      {
        title: "Investor Pitch Structure",
        prompt: "I'm building a B2B SaaS tool for construction project management. We have 12 paying customers and $8k MRR growing 20% month-over-month. Help me structure a seed pitch deck for a $1.5M raise, including what metrics to highlight and the narrative arc.",
      },
      {
        title: "Revenue Growth Plan",
        prompt: "My e-commerce business does $2M ARR but growth has stalled at 5% MoM. Walk me through a full revenue growth diagnosis: what metrics to check, likely root causes, and a 90-day action plan to get back to 15% MoM.",
      },
      {
        title: "Financial Model Build",
        prompt: "Build me a 3-year SaaS financial model. Assumptions: $99/month price, 150 new customers/month growing 10% quarterly, 2% monthly churn, 60% gross margin, $80k/month operating expenses growing 5% quarterly. Show monthly P&L and when we hit break-even.",
      },
      {
        title: "Market Entry Strategy",
        prompt: "I want to enter the HR tech market in Southeast Asia with a payroll automation product. Analyze the competitive landscape, recommend an entry strategy, and outline the first 6 months of go-to-market execution.",
      },
    ],
    tips: [
      "Give me your current metrics (MRR, churn, CAC) and I'll produce analysis grounded in your actual numbers.",
      "For financial models, specify your industry and I'll use real benchmarks from comparable companies.",
      "Ask for 'board-ready' formatting and I'll structure output as presentation-ready slides.",
    ],
    tags: ["Business Plans", "Pitch Decks", "Financial Modeling", "Revenue Strategy", "Market Analysis", "OKRs"],
  },

  "legal-expert": {
    tagline: "20+ years across corporate law, US immigration, employment, IP, and regulatory compliance.",
    badge: "Legal Expert",
    capabilities: [
      "Map every major US visa category (H-1B, O-1, EB-1/2/3/5, TN, L-1, F-1 OPT, asylum) with full procedural roadmaps",
      "Explain green card priority dates, visa bulletin interpretation, and adjustment of status strategy",
      "Review and redline contracts, NDAs, employment agreements, and SaaS terms",
      "Analyze non-compete clauses by state and advise on enforceability risk",
      "Guide entity formation: LLC vs. C-Corp vs. S-Corp with tax and liability implications",
      "Explain equity structures: vesting, option pools, 83(b) elections, dilution, and term sheet provisions",
      "Advise on GDPR, CCPA, HIPAA, and FTC compliance requirements",
      "Draft demand letters, cease-and-desist notices, and settlement agreement frameworks",
    ],
    examples: [
      {
        title: "H-1B Strategy",
        prompt: "I'm a software engineer on F-1 OPT STEM Extension working at a US startup. My OPT expires in 14 months. Walk me through my complete immigration pathway options to stay in the US long-term, ranked by timeline and risk.",
      },
      {
        title: "Startup Equity Structure",
        prompt: "We're three co-founders about to incorporate. Explain how to structure equity splits, vesting schedules (including cliff), option pool sizing for future employees, and what an 83(b) election is and why we need to file it within 30 days.",
      },
      {
        title: "Contract Redline",
        prompt: "I'm signing an employment contract with a non-compete clause covering 'any competing business in North America for 2 years after termination.' How enforceable is this? What are the legal risks? Suggest specific language changes I should request.",
      },
      {
        title: "Privacy Compliance",
        prompt: "We're a SaaS startup with users in California and the EU. What are our CCPA and GDPR obligations? Give me a practical compliance checklist covering data collection, privacy policy, user rights, and penalties for non-compliance.",
      },
    ],
    tips: [
      "⚠️ I provide legal information and education — for your specific situation, consult a licensed attorney.",
      "For immigration questions, specify your current visa status, country of birth, and employer situation for precise guidance.",
      "For contract review, paste the full contract text and specify your role (buyer/seller/employee/employer).",
    ],
    tags: ["US Immigration", "Contracts", "Employment Law", "Equity & Startups", "IP Law", "Compliance"],
  },

  "risk-analyst": {
    tagline: "CRO-level enterprise risk intelligence with quantitative modeling and regulatory depth.",
    badge: "Risk & Strategy",
    capabilities: [
      "Build complete enterprise risk registers with 5×5 heat maps, KRI thresholds, and mitigation playbooks",
      "Perform quantitative risk modeling: VaR, CVaR, Monte Carlo simulation, stress testing",
      "Conduct industry-specific risk assessments for fintech, healthcare, energy, SaaS, manufacturing",
      "Model credit risk (PD/LGD/EAD), market risk (Greeks, volatility), and liquidity risk (LCR, NSFR)",
      "Map regulatory compliance requirements by jurisdiction and industry with gap analysis",
      "Design Business Continuity Plans with RTO/RPO, crisis playbooks, and tabletop exercises",
      "Produce Python code for all quantitative risk models and Monte Carlo simulations",
      "Calculate RAROC, economic capital, and risk-adjusted performance metrics",
    ],
    examples: [
      {
        title: "Startup Risk Register",
        prompt: "I'm launching a fintech lending startup. Build me a comprehensive risk register covering regulatory, credit, operational, technology, and market risks. For each risk give: description, likelihood (1-5), impact (1-5), score, owner, and specific mitigation action.",
      },
      {
        title: "Industry Risk Deep-Dive",
        prompt: "Perform a complete risk analysis for a mid-size renewable energy developer operating solar and wind projects in the US. Cover regulatory, commodity price, technology, construction, operational, and climate transition risks with quantitative impact estimates.",
      },
      {
        title: "VaR Model",
        prompt: "Write Python code to calculate 1-day 99% Value at Risk for a portfolio of 5 stocks using three methods: parametric (variance-covariance), historical simulation (252 days), and Monte Carlo (10,000 simulations). Include correlation matrix and comparison table.",
      },
      {
        title: "Compliance Gap Analysis",
        prompt: "We're a healthcare SaaS company processing patient data. Run a compliance gap analysis for HIPAA, SOC 2 Type II, and GDPR. For each framework, list what we likely have vs. what we're probably missing, with risk severity and remediation priority.",
      },
    ],
    tips: [
      "For quantitative models, specify your industry, portfolio size, and available data for calibrated output.",
      "Ask for Python code alongside any quantitative risk model for immediate implementation.",
      "For regulatory analysis, specify your jurisdiction, industry, and company stage (startup vs. enterprise).",
    ],
    tags: ["Enterprise Risk", "VaR & Monte Carlo", "Industry Analysis", "Regulatory Compliance", "Business Continuity"],
  },

  "electrical-engineer": {
    tagline: "PhD-level EE expertise across power, signals, RF, control, and electronics — with working code.",
    badge: "Engineering Expert",
    capabilities: [
      "Solve power flow, fault analysis, relay coordination, and stability problems from first principles",
      "Design DC-DC converters (buck/boost/flyback/LLC), inverters, and PFC circuits with full calculations",
      "Perform complete RF/microwave analysis: S-parameters, Smith chart matching, LNA and PA design",
      "Design and analyze control systems: PID tuning, root locus, Bode plots, state-space, Kalman filter",
      "Process and filter signals: Laplace/Z/Fourier transforms, FIR/IIR filter design, FFT analysis",
      "Design telecommunications systems: link budgets, modulation BER curves, OFDM, 5G NR analysis",
      "Write Python and MATLAB code for simulations, circuit calculations, and signal processing",
      "Apply IEEE, IEC, NEC, and 3GPP standards with precise citations",
    ],
    examples: [
      {
        title: "Power Systems Fault Analysis",
        prompt: "A 132 kV transmission system has a single-line-to-ground fault at bus 3. The positive, negative, and zero sequence impedances seen from the fault point are Z1=j0.12 pu, Z2=j0.12 pu, Z0=j0.35 pu. Calculate: (1) fault current, (2) sequence voltages, (3) line voltages at fault point. Show all steps using symmetrical components.",
      },
      {
        title: "Buck Converter Design",
        prompt: "Design a synchronous buck converter: Vin=48V, Vout=12V, Iout=10A, fsw=400kHz, ΔiL=20% of Iload, ΔVout=50mV. Calculate: duty cycle, inductor value and current rating, output capacitor, MOSFET selection criteria (Vds, Id, Qg), power loss breakdown, and efficiency estimate.",
      },
      {
        title: "PID Controller with Bode Analysis",
        prompt: "A plant has transfer function G(s) = 10 / (s(s+2)(s+10)). Design a PID controller to achieve: phase margin ≥ 45°, gain margin ≥ 10 dB, zero steady-state error to ramp input. Show Bode plots before and after, root locus, step response. Provide Python code using scipy.signal.",
      },
      {
        title: "RF Link Budget",
        prompt: "Design a 5G NR sub-6GHz link budget for an urban macro cell: 3.5 GHz carrier, 100 MHz bandwidth, 64T64R massive MIMO base station (25 dBm/port), UE with 2 receive antennas. Calculate max path loss, cell coverage radius using 3GPP UMa model, and downlink SNR at cell edge. Include all gains and losses.",
      },
    ],
    tips: [
      "Always specify units, operating conditions, and constraints — I'll derive from first principles and show every step.",
      "Ask for Python/MATLAB code alongside any calculation for immediate simulation and verification.",
      "For standards-compliance questions, specify your region (IEC for Europe, IEEE/NEC for North America, 3GPP for telecom).",
      "Attach datasheets or circuit descriptions using the 📎 button for component-specific analysis.",
    ],
    tags: ["Power Systems", "Power Electronics", "Control Systems", "RF & Microwave", "Signal Processing", "5G/Telecom", "Circuit Design"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Agent Hub Card — expanded profile view
// ─────────────────────────────────────────────────────────────────────────────

function AgentHubCard({
  agentId,
  onOpen,
  onExampleClick,
}: {
  agentId: string;
  onOpen: (id: string, prefill?: string) => void;
  onExampleClick: (id: string, prompt: string) => void;
}) {
  const agent = EXPERT_AGENTS[agentId];
  const profile = PROFILES[agentId];
  const Icon = ICON_MAP[agent.iconName] ?? Zap;
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: "var(--color-bg-surface)",
        border: `1px solid var(--color-border-default)`,
      }}
    >
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: agent.bgColor, border: `1px solid ${agent.color}33` }}
          >
            <Icon className="h-6 w-6" style={{ color: agent.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-base" style={{ color: "var(--color-text-primary)" }}>
                {agent.name}
              </h3>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: `${agent.color}18`,
                  color: agent.color,
                  border: `1px solid ${agent.color}33`,
                }}
              >
                {profile.badge}
              </span>
            </div>
            <p className="text-sm italic" style={{ color: "var(--color-text-secondary)" }}>
              {profile.tagline}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {profile.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-lg"
              style={{
                background: "var(--color-bg-elevated)",
                color: "var(--color-text-muted)",
                border: "1px solid var(--color-border-default)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onOpen(agentId)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{
              background: `linear-gradient(135deg, ${agent.color}cc, ${agent.color}99)`,
              color: "#fff",
            }}
          >
            <MessageSquare className="h-4 w-4" />
            Open Agent
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm transition-all"
            style={{
              background: "var(--color-bg-elevated)",
              color: "var(--color-text-muted)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            <BookOpen className="h-4 w-4" />
            {expanded ? "Less" : "Guide"}
          </button>
        </div>
      </div>

      {/* Expandable guide panel */}
      {expanded && (
        <div
          className="border-t px-5 pb-5 pt-4 space-y-5"
          style={{ borderColor: "var(--color-border-default)" }}
        >
          {/* Capabilities */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4" style={{ color: agent.color }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                What I Can Do
              </span>
            </div>
            <ul className="space-y-1.5">
              {profile.capabilities.map((cap, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: agent.color }} />
                  {cap}
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div
            className="rounded-xl p-3 space-y-1"
            style={{ background: `${agent.color}0d`, border: `1px solid ${agent.color}22` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5" style={{ color: agent.color }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: agent.color }}>
                Pro Tips
              </span>
            </div>
            {profile.tips.map((tip, i) => (
              <p key={i} className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {tip}
              </p>
            ))}
          </div>

          {/* Example scenarios */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="h-4 w-4" style={{ color: agent.color }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                Example Scenarios — Click to Try
              </span>
            </div>
            <div className="space-y-2">
              {profile.examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => onExampleClick(agentId, ex.prompt)}
                  className="w-full text-left rounded-xl p-3 transition-all hover:scale-[1.01]"
                  style={{
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border-default)",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" style={{ color: agent.color }} />
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                        {ex.title}
                      </p>
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
                        {ex.prompt}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const copy = () => {
    navigator.clipboard.writeText(msg.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="relative group max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={{
          background: isUser
            ? "linear-gradient(135deg, var(--color-purple-700), var(--color-purple-600))"
            : "var(--color-bg-surface)",
          border: isUser ? "none" : "1px solid var(--color-border-default)",
          color: isUser ? "#fff" : "var(--color-text-primary)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg.content}
        {!isUser && (
          <button
            onClick={copy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg"
            style={{ background: "var(--color-bg-elevated)" }}
          >
            {copied
              ? <CheckCheck className="h-3 w-3" style={{ color: "var(--color-success)" }} />
              : <Copy className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat panel
// ─────────────────────────────────────────────────────────────────────────────

function ExpertChat({
  agentId,
  prefillPrompt,
  onBack,
}: {
  agentId: string;
  prefillPrompt?: string;
  onBack: () => void;
}) {
  const agent = EXPERT_AGENTS[agentId];
  const profile = PROFILES[agentId];
  const Icon = ICON_MAP[agent.iconName] ?? Zap;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(prefillPrompt ?? "");
  const [loading, setLoading] = useState(false);
  const [documentText, setDocumentText] = useState("");
  const [docFileName, setDocFileName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-focus and send if prefill is provided
  useEffect(() => {
    if (prefillPrompt) {
      textareaRef.current?.focus();
    }
  }, [prefillPrompt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const attachFile = async (file: File) => {
    const text = await file.text();
    setDocumentText(text.slice(0, 20000));
    setDocFileName(file.name);
  };

  const sendMessage = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/ai/expert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          messages: newMessages,
          documentText: documentText || undefined,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantText };
          return updated;
        });
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${String(e)}. Please try again.` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: "560px" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 shrink-0"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
      >
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: agent.bgColor }}
        >
          <Icon className="h-4 w-4" style={{ color: agent.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>
              {agent.name}
            </p>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: `${agent.color}18`, color: agent.color }}
            >
              {profile.badge}
            </span>
          </div>
          <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
            {profile.tagline}
          </p>
        </div>
        <button
          onClick={() => setMessages([])}
          className="text-xs px-3 py-1 rounded-lg shrink-0"
          style={{
            background: "var(--color-bg-elevated)",
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-border-default)",
          }}
        >
          Clear
        </button>
      </div>

      {/* Document context badge */}
      {docFileName && (
        <div
          className="flex items-center justify-between rounded-xl px-3 py-2 mb-3 shrink-0"
          style={{ background: `${agent.color}10`, border: `1px solid ${agent.color}25` }}
        >
          <span className="text-xs font-medium" style={{ color: agent.color }}>
            📎 {docFileName} ({Math.round(documentText.length / 1000)}k chars loaded)
          </span>
          <button onClick={() => { setDocumentText(""); setDocFileName(""); }}>
            <X className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: agent.bgColor,
                border: `1px solid ${agent.color}33`,
                boxShadow: `0 0 30px ${agent.color}20`,
              }}
            >
              <Icon className="h-8 w-8" style={{ color: agent.color }} />
            </div>
            <div className="text-center max-w-sm">
              <p className="font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
                {agent.name}
              </p>
              <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
                {profile.tagline}
              </p>
            </div>
            {/* Quick-start examples */}
            <div className="w-full max-w-lg space-y-2">
              <p className="text-xs text-center mb-2 font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                Try an example
              </p>
              {profile.examples.slice(0, 3).map((ex, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(ex.prompt); textareaRef.current?.focus(); }}
                  className="w-full text-left rounded-xl px-4 py-3 text-sm transition-all hover:scale-[1.01]"
                  style={{
                    background: "var(--color-bg-surface)",
                    border: "1px solid var(--color-border-default)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <span className="font-semibold block mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                    {ex.title}
                  </span>
                  <span className="text-xs line-clamp-1" style={{ color: "var(--color-text-muted)" }}>
                    {ex.prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2 items-center" style={{ color: "var(--color-text-muted)" }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Thinking…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex gap-2 items-end rounded-2xl p-3 shrink-0"
        style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-default)" }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.pdf,.csv,.json,.xml,.docx"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await attachFile(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="p-2 rounded-xl transition-colors hover:bg-white/5 shrink-0"
          style={{ color: "var(--color-text-muted)" }}
          title="Attach document for context"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
          placeholder={`Ask the ${agent.name}… (Shift+Enter for new line)`}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm outline-none"
          style={{ color: "var(--color-text-primary)", maxHeight: "160px", overflowY: "auto" }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 160) + "px";
          }}
        />

        <button
          onClick={() => void sendMessage()}
          disabled={!input.trim() || loading}
          className="shrink-0 flex items-center justify-center h-8 w-8 rounded-xl transition-all disabled:opacity-40"
          style={{
            background: `linear-gradient(135deg, ${agent.color}cc, ${agent.color}88)`,
            boxShadow: `0 0 16px ${agent.color}40`,
          }}
        >
          {loading
            ? <Loader2 className="h-4 w-4 text-white animate-spin" />
            : <Send className="h-4 w-4 text-white" />}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ExpertHub
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    label: "Document & Intelligence",
    icon: FileSearch,
    ids: ["doc-intelligence"],
    description: "PDF analysis, data extraction, form filling, web scraping, legal doc review",
  },
  {
    label: "Business & Strategy",
    icon: Briefcase,
    ids: ["business-strategist", "risk-analyst"],
    description: "Business plans, financial models, revenue strategy, enterprise risk analysis",
  },
  {
    label: "Legal & Compliance",
    icon: Scale,
    ids: ["legal-expert"],
    description: "US immigration, contracts, employment law, IP, regulatory compliance",
  },
  {
    label: "Engineering",
    icon: Zap,
    ids: ["electrical-engineer"],
    description: "Power systems, RF/microwave, control systems, signal processing, circuit design",
  },
];

export function ExpertHub() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<string | undefined>();

  const openAgent = (id: string, prompt?: string) => {
    setPrefill(prompt);
    setSelectedAgent(id);
  };

  if (selectedAgent) {
    return (
      <ExpertChat
        agentId={selectedAgent}
        prefillPrompt={prefill}
        onBack={() => { setSelectedAgent(null); setPrefill(undefined); }}
      />
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.05))",
          border: "1px solid rgba(124,58,237,0.2)",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, var(--color-purple-700), var(--color-cyan-600))",
              boxShadow: "var(--glow-purple)",
            }}
          >
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
              Expert Agent Hub
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              Five world-class AI experts — each with 20+ years of simulated domain experience. Click <strong style={{ color: "var(--color-text-primary)" }}>Guide</strong> on any agent to see their full capabilities and example scenarios. Click <strong style={{ color: "var(--color-text-primary)" }}>Open Agent</strong> to start a session. Use the 📎 button to attach documents for analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Categories */}
      {CATEGORIES.map((cat) => {
        const CatIcon = cat.icon;
        const agents = cat.ids.filter((id) => !!EXPERT_AGENTS[id]);
        return (
          <div key={cat.label}>
            <div className="flex items-center gap-2 mb-4">
              <CatIcon className="h-4 w-4" style={{ color: "var(--color-purple-400)" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                {cat.label}
              </h3>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>— {cat.description}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {agents.map((id) => (
                <AgentHubCard
                  key={id}
                  agentId={id}
                  onOpen={openAgent}
                  onExampleClick={(aid, prompt) => openAgent(aid, prompt)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
