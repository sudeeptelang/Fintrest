export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Performance", href: "#performance" },
  { label: "Pricing", href: "#pricing" },
] as const;

export const PLANS = [
  {
    name: "Free",
    description: "See what the engine sees. Get a taste of the product.",
    monthly: { price: "$0", period: "forever", slug: "free" },
    annual:  { price: "$0", period: "forever", slug: "free", savings: null as string | null },
    features: [
      "Top 3 signals daily",
      "Athena thesis on the top 3",
      "5 stock detail views / day",
      "1 watchlist · 5 items",
      "Morning briefing email",
      "Public performance page",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Pro",
    description: "The full product. Everything the self-directed retail trader needs.",
    monthly: { price: "$19", period: "/mo", slug: "pro" },
    annual:  { price: "$199", period: "/yr", slug: "pro-annual", savings: "Save 13% ($29)" },
    features: [
      "Full signal board (50+) with lens chips",
      "Unlimited Athena thesis",
      "Ask Athena (unlimited chat)",
      "Unlimited stock detail pages",
      "3 watchlists · 30 items",
      "Portfolio import + AI advisor (3 portfolios)",
      "Real-time alerts (push + email)",
      "Congress + Insider feeds",
      "Portfolio factor profile + verdict mix",
    ],
    cta: "Go Pro",
    popular: true,
  },
  {
    name: "Elite",
    description: "Institutional-grade. Athena tuned to your portfolio.",
    monthly: { price: "$45", period: "/mo", slug: "elite" },
    annual:  { price: "$449", period: "/yr", slug: "elite-annual", savings: "Save 17% ($91)" },
    features: [
      "Everything in Pro",
      "Unlimited portfolios",
      "Athena Personalized — thesis tuned to your holdings",
      "Weekly JPM-style portfolio PDF report",
      "Backtest runner (historical what-if on any lens)",
      "Priority Athena (no rate limits)",
      "Early access to new features",
    ],
    cta: "Go Elite",
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
