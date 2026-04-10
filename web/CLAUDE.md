# Fintrest.ai — Web (Next.js)

@AGENTS.md

## Stack
- **Next.js 14+** App Router, TypeScript
- **Tailwind CSS** + **shadcn/ui** components
- **Zustand** (global state) + **React Query** (server state)
- **Recharts** (portfolio charts) + **lightweight-charts** (candlesticks)
- **Fonts:** Satoshi via fontshare (headings 900, body 500/700), DM Mono via Google Fonts
- **Deploy:** Vercel

## UI/UX Design Reference

**`docs/fintrest_screens_v2_final.html`** in the docs folder is the pixel-perfect design reference.
Open it in a browser to see all 22 screens in dark phone shells with Finxoom warm editorial style.

When implementing any screen, match the HTML mockup exactly:
- Color bar on left edge of signal/holding items (green=bull, red=bear, amber=watch)
- Avatar tiles: 34-46px, border-radius 10-14px
- Entry/Target/Stop always shown as a 3-column grid unit
- Confidence shown as progress bar + percentage
- Athena output always in navy gradient cards (`#0d1a2e` to `#172640`)
- Bottom nav: 5 tabs with blur backdrop, active = `#00b87c`

## Factor Profile (Prospero.ai Style)

The stock detail page's 7-factor score breakdown must show **7 individual mini-charts/gauges** — one per factor (Momentum, Rel Volume, News, Fundamentals, Sentiment, Trend, Risk). NOT just a single radar chart. Each factor gets its own circular arc gauge or score card showing score (0-100), weight, and a brief data source label. Reference: Prospero.ai factor profile layout.

## Key Component Patterns

### SignalCard
- Left color bar: green=bull, red=bear, amber=watch
- Pills: green default, red/amber/blue variants
- Always show: entry / target / stop in a 3-col grid
- Always show: confidence progress bar

### NavyCard (Athena panels)
- bg: `linear-gradient(160deg, #0d1a2e, #172640)`
- border: `rgba(0,184,124,.2)`
- text: `rgba(255,255,255,.75)`
- Athena icon: 24-30px green rounded square

### BottomNav (5 tabs)
- Items: Home | Signals | Athena | Portfolio | Alerts
- Active: color `#00b87c`
- bg: `rgba(255,255,255,.72)` with `backdrop-filter: blur`

### RiskScore
- Score 0-100 as large number
- 0-40: green | 41-65: amber | 66-100: red
- Progress bar with matching color
- Label: Low / Medium / Medium-High / High

## App Router Structure
```
app/
  (auth)/login, signup
  (app)/
    layout.tsx          # Shell with bottom nav
    dashboard/          # Screen 03
    signals/            # Screen 04, [ticker] -> 05, score -> 21, chart -> 22
    athena/             # Screen 06
    portfolio/          # Screens 07-12
    watchlist/          # Screen 13
    alerts/             # Screens 14-15
    markets/            # Screen 16
    notifications/      # Screen 17
    settings/           # Screen 19
  pricing/              # Screen 18
  api/                  # Thin proxy routes
```

## Rules
- Page background is always `#f4f1eb` — never pure white
- Signal levels (entry/target/stop) are always shown together, never separated
- Compliance disclaimer footer on every signal page — non-negotiable
- Mobile-first: design for 390px width (iPhone 15 Pro)
- Score breakdown accessible from signal detail — tap confidence to open screen 21
- Chart view accessible from signal detail — tap price area to open screen 22
