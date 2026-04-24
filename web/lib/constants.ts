export const NAV_LINKS = [
  { label: "Research engine", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Audit log", href: "#performance" },
  { label: "Pricing", href: "#pricing" },
] as const;

export const PLANS = [
  {
    name: "Free",
    description: "See what the engine sees. A daily taste of the research.",
    monthly: { price: "$0", period: "forever", slug: "free" },
    annual:  { price: "$0", period: "forever", slug: "free", savings: null as string | null },
    features: [
      "Top 3 signals daily",
      "Lens thesis on the top 3",
      "5 research pages / day",
      "1 watchlist · 5 items",
      "Morning research digest",
      "Public audit log access",
    ],
    cta: "Start free",
    popular: false,
  },
  {
    name: "Pro",
    description: "The full research layer. Everything a self-directed trader needs to stress-test ideas every morning.",
    monthly: { price: "$29", period: "/mo", slug: "pro" },
    annual:  { price: "$299", period: "/yr", slug: "pro-annual", savings: "Save 14% ($49)" },
    features: [
      "Full signal board (50+) with Lens filter chips",
      "Unlimited Lens thesis on every signal",
      "Unlimited research pages",
      "3 watchlists · 30 items",
      "Portfolio import + Lens research layer (3 portfolios)",
      "Real-time research alerts (push + email)",
      "Congress + Insider feeds",
      "Portfolio factor profile + signal-mix breakdown",
    ],
    cta: "Go Pro",
    popular: true,
  },
  {
    name: "Elite",
    description: "Institutional-grade research. Lens tuned to your portfolio.",
    monthly: { price: "$99", period: "/mo", slug: "elite" },
    annual:  { price: "$999", period: "/yr", slug: "elite-annual", savings: "Save 16% ($189)" },
    features: [
      "Everything in Pro",
      "Unlimited portfolios",
      "Lens Personalized — thesis tuned to your holdings and risk profile",
      "Weekly portfolio research PDF (JPM-style layout)",
      "Backtest runner — historical what-if on any Lens filter",
      "Early access to new research modules",
    ],
    cta: "Go Elite",
    popular: false,
  },
] as const;

export const FEATURES = [
  {
    title: "Explainable signals",
    description:
      "Every signal carries a plain-English Lens explanation of why it ranked and which factors drove the score. No black boxes. You can audit every decision the engine made.",
    icon: "brain" as const,
  },
  {
    title: "7-factor scoring",
    description:
      "Momentum, relative volume, news catalysts, earnings, sentiment, trend strength, and risk — each scored 0–100 and weighted by market regime. The full breakdown is published for every signal.",
    icon: "chart" as const,
  },
  {
    title: "Before-the-open research drop",
    description:
      "The morning's research lands in your inbox or on your phone before the bell. Email, SMS, or push — you choose the channel and the quiet hours.",
    icon: "bell" as const,
  },
  {
    title: "Reference levels",
    description:
      "Every signal includes reference entry, stop, and target levels derived from the setup's technical structure and volatility. Research outputs to help you stress-test a trade idea — not instructions to trade.",
    icon: "target" as const,
  },
  {
    title: "Public audit log",
    description:
      "Every signal's outcome is logged and published — hit rate, average move, max drawdown, losers included. No highlight reel. No hidden history. The audit trail is public.",
    icon: "trending" as const,
  },
  {
    title: "Sector heatmap",
    description:
      "Sector-level relative strength at a glance — which sectors are leading, which are bleeding, and how the regime is rotating.",
    icon: "grid" as const,
  },
] as const;

export const STEPS = [
  {
    step: "01",
    title: "We scan the market",
    description:
      "Every morning the engine ingests price data, fundamentals, news sentiment, and alternative data across 500+ US tickers.",
  },
  {
    step: "02",
    title: "The 8-factor bar",
    description:
      "The 8-factor rule engine scores each candidate 0–100 across momentum, volume, catalysts, earnings, sentiment, trend, risk, and smart money. No AI guesswork — a structured, weighted, regime-gated test. Only setups above the bar pass to the research set.",
  },
  {
    step: "03",
    title: "Lens explains why",
    description:
      "Lens translates the structured score into plain English. You see which factors drove the score, what the setup is, and where the risks sit. No jargon, no black box, no recommendation — just the research.",
  },
  {
    step: "04",
    title: "You review the research",
    description:
      "The morning's research set lands in your inbox, phone, or dashboard before the open. You decide whether to act on it. Fintrest publishes research — your trades are yours.",
  },
] as const;

export const STATS = [
  { value: "73%", label: "Backtested hit rate" },
  { value: "12.4%", label: "Backtested avg move / signal" },
  { value: "2,400+", label: "Signals in backtest window" },
  { value: "<3%", label: "Backtested avg drawdown" },
] as const;
