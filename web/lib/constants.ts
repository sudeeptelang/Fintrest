export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Performance", href: "#performance" },
  { label: "Pricing", href: "#pricing" },
] as const;

export const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with basic signals",
    features: [
      "3 daily stock picks",
      "Delayed signals",
      "Basic stock pages",
      "Market summary",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Starter",
    price: "$19",
    period: "/mo",
    description: "For active traders who want an edge",
    features: [
      "All 12 daily picks",
      "Watchlist with alerts",
      "9 AM email alerts",
      "Full signal breakdowns",
      "Sector heatmap access",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    description: "Early signals and AI-powered analysis",
    features: [
      "Everything in Starter",
      "6:30 AM early alerts",
      "Full trade zones (entry/stop/target)",
      "AI-generated analysis",
      "Performance analytics",
      "Priority support",
    ],
    cta: "Go Pro",
    popular: true,
  },
  {
    name: "Premium",
    price: "$99",
    period: "/mo",
    description: "Real-time everything, plus API access",
    features: [
      "Everything in Pro",
      "Real-time SMS & push alerts",
      "Stop-loss triggered alerts",
      "India + US markets",
      "API access",
      "Dedicated support",
    ],
    cta: "Go Premium",
    popular: false,
  },
] as const;

export const FEATURES = [
  {
    title: "AI-Explained Signals",
    description:
      "Every pick comes with a plain-English explanation of why it ranked. No black boxes — just transparent, auditable scoring.",
    icon: "brain" as const,
  },
  {
    title: "7-Factor Scoring",
    description:
      "Momentum, volume, catalysts, earnings, sentiment, trend strength, and risk — each weighted and scored 0-100.",
    icon: "chart" as const,
  },
  {
    title: "Before-Market Alerts",
    description:
      "Get your trade ideas delivered before the bell rings. Email, SMS, or push — you choose the channel and timing.",
    icon: "bell" as const,
  },
  {
    title: "Trade Zones",
    description:
      "Every signal includes precise entry, stop-loss, and target prices. Know your risk before you enter.",
    icon: "target" as const,
  },
  {
    title: "Performance Tracking",
    description:
      "We track every signal's outcome. See win rates, average returns, and drawdowns — fully transparent.",
    icon: "trending" as const,
  },
  {
    title: "Sector Heatmap",
    description:
      "Visual sector-level performance at a glance. Spot where money is flowing and where it's leaving.",
    icon: "grid" as const,
  },
] as const;

export const STEPS = [
  {
    step: "01",
    title: "We Scan The Market",
    description:
      "Every day, our engine ingests price data, fundamentals, news sentiment, and alternative data across thousands of stocks.",
  },
  {
    step: "02",
    title: "Signals Are Scored",
    description:
      "Our 7-factor rule engine scores each opportunity 0-100. No AI guesswork — just structured, weighted analysis.",
  },
  {
    step: "03",
    title: "AI Explains Why",
    description:
      "An AI layer translates the structured score into plain English. You see exactly what drove each ranking.",
  },
  {
    step: "04",
    title: "You Get Alerted",
    description:
      "Top picks are delivered to your inbox, phone, or dashboard before the market opens. Act with confidence.",
  },
] as const;

export const STATS = [
  { value: "73%", label: "Avg Win Rate" },
  { value: "12.4%", label: "Avg Return / Trade" },
  { value: "2,400+", label: "Signals Tracked" },
  { value: "<3%", label: "Avg Drawdown" },
] as const;
