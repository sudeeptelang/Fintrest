# Fintrest.ai — Web (Next.js)

@AGENTS.md

## Stack
- **Next.js 14+** App Router, TypeScript
- **Tailwind CSS** + **shadcn/ui** components
- **Zustand** (global state) + **React Query** (server state)
- **Recharts** (portfolio charts) + **lightweight-charts** (candlesticks)
- **Fonts:** Sora (display), DM Sans (body), DM Mono (data). See `@docs/DESIGN_LANGUAGE_V2.md`.
- **Deploy:** Vercel

## Design Language — v2 Forest & Rust

Full spec: `@docs/DESIGN_LANGUAGE_V2.md`.
Clickable preview: `docs/fintrest_screens_v2_preview.html` (Home / Pricing / About / Disclaimer).

**Tokens at a glance:**
- Brand: `forest #0F4F3A` — nav active, primary CTA, logo, Lens gutter, focus ring
- Hover: `forest-dark #0A3528`
- Accent: `rust #B8502F` — editorial emphasis only ("Lens Editorial", Board-of-the-Day, in-copy highlights)
- Semantic up: `#0A7F4F` — positive performance (separate from brand)
- Semantic down: `#6B5443` — negative performance, warm gray-brown (NOT red)
- Warn: `#B25E09` · Danger: `#912018`
- Ink stack: 13 grays from `#FFFFFF` (ink-0) to `#060C1A` (ink-950)

**The three greens, reconciled:**
- `forest` — the brand is wearing this (nav, buttons, logo).
- `forest-dark` — the brand hovers (pressed/active states).
- `up` — the data is showing this (stock went up, score is high, bullish regime).

## Non-Negotiable Rules

1. **No emoji in the UI.** Lucide icons only, 1.5px stroke.
2. **Three greens, three jobs.** Never swap `forest`, `forest-dark`, `up`.
3. **Down is warm gray-brown, never red.** Red = `danger` (destructive actions only).
4. **Lens thesis always has the forest gutter** (2px forest left border + 16px padding + body-lg DM Sans + ink-800). The typographic signature. Rust gutter when Lens is quoting a source.
5. **Signal levels (entry/target/stop) always together** — never separated in layout. Entry/Target use `up`, Stop uses `down`.
6. **Compliance disclaimer on every signal page** — "Research only — your decision." on any Lens thesis that references a ticker.
7. **Mobile-first**: 390px iPhone 15 Pro is the base canvas.
8. **Every color use has exactly one valid interpretation.** If a swap still reads correctly, the color is decorative and must be removed.

## Three Layout Archetypes

Every screen is one of three. If a screen doesn't fit, the screen is wrong.

| Archetype | Where | Top nav | Left rail | Content max | Base type |
|---|---|---|---|---|---|
| Marketing | `/`, `/pricing`, `/about`, `/disclaimer`, `/risk-disclosure`, legal | 64px | none | 1200px | body 14px |
| App-data | `/today`, `/boards`, `/markets`, `/audit`, `/watchlist/*`, `/alerts`, `/insiders`, `/congress` | 56px | 240px | 1120px | body 14px |
| Focus-reading | `/signal/[id]`, `/ticker/[sym]`, `/boards/[id]`, `/ask`, `/settings/*` | 56px | 240px | 800px | body-lg 16px |

## App IA — 5 Primary Nav Items

1. **Today** `/today` — today's research drop. Lands here on login.
2. **Boards** `/boards` — user boards + editorial boards + discovery.
3. **Markets** `/markets` — sector heatmap + regime + macro. Absorbs Insiders + Congress as filters.
4. **Ask Lens** `/ask` — research chat (rename from `/athena`).
5. **Audit log** `/audit` — public signal performance (rename from `/performance`).

**Secondary (More popover):** Watchlist, Alerts, Insiders, Congress, Notifications, Upload.

**Top nav utilities (right side):** ticker search (`/` to focus), Ask Lens shortcut (⌘K), notifications bell, avatar menu.

**Mobile (< 1024px):** Left rail collapses to bottom tab bar (5 icons). Top nav 56px with logo + search + avatar only. Ask Lens becomes a floating button bottom-right.

## Key Component Patterns (v2)

### SignalCard
- Ticker + score + price in `ink-900` — primary data, no decoration
- **"BUY TODAY"** badge: `forest-light` bg, `forest-dark` text, `forest` border
- **"WATCH"** badge: `ink-100` bg, `ink-700` text, `ink-300` border
- **"AVOID"** badge: `ink-50` bg, `ink-500` text, `ink-200` border, italic
- % change: `up` for positive, `down` for negative — never brand forest
- "LENS EDITORIAL" tag (if editorial): small `rust` chip top-right
- Reference levels: ▲ Entry and ▲ Target in `up`, ▼ Stop in `down`

### Lens Thesis Block (the signature)
- Border-left: **2px `forest`** (or **2px `rust`** when quoting a source)
- Padding-left: 16px
- Typography: `body-lg` (16/26) DM Sans 400, `ink-800`
- Max-width: 640px (60–70 char measure)
- Optional eyebrow: "LENS" in `forest-dark`, or "LENS · EDITORIAL" in `rust-dark`
- Mandatory footer on any ticker ref: caption, `ink-500`, *"Research only — your decision."*
- Low-confidence variant: border `ink-400`, eyebrow "LENS · LOW CONFIDENCE" in `warn`

### Score Ring (7-factor)
- 7 segments, one per factor (Momentum, Rel Volume, News, Fundamentals, Sentiment, Trend, Risk)
- Segment fill: `up #0A7F4F` for scores ≥ 40, `ink-400` below. Track: `ink-100`.
- Center number: DM Mono 500
- Animate on mount: stroke-dash 400ms ease-out, 40ms stagger

### Pin Card
- `ink-0` bg · 1px `ink-200` · 8px radius · 20px padding
- Hover: `ink-300` border + shadow-e1
- Ticker: Sora 700 / 24px / `ink-900`
- Lens excerpt: body-sm `ink-600`, 2-line clamp, 1px `forest` left border, 12px left padding
- Editorial pin: small `rust` "ED" chip top-right

### Board Card
- Cover swatch 24×24 top-left from 8-color palette: `forest`, `rust`, `ink-700`, `ink-500`, `olive #5A6B3E`, `clay #8A5A3B`, `slate #4A5A6E`, `plum #6B4A5E`. No saturated primaries.
- Editorial variant: `rust-light` bg + `rust` cover + "LENS EDITORIAL" eyebrow

### Filter Chip (Lens chip)
- Pill · 32px height · 14px horizontal padding · DM Sans 500 / 13px
- Inactive: `ink-50` bg, `ink-700` text, `ink-200` border
- Active: `forest-light` bg, `forest-dark` text, `forest` border, ✕ remove
- Editorial filter: `rust-light` bg, `rust-dark` text, `rust` border

### Nav Shell
- Top nav: 56px app / 64px marketing · `ink-0` bg · 1px `ink-200` bottom border (no shadow, no scroll-bg-change)
- Logo: Sora 700 / 16px / `ink-900`, wordmark only in header
- Left rail: 240px · `ink-50` bg · 1px `ink-200` right border
- Left rail item: 40px height, `ink-700` text, hover `ink-900` + `ink-100` bg
- Left rail active: `forest` text + 2px `forest` left border + `forest-light` bg (subtle)

### RiskScore
- Score 0-100 as large number (DM Mono 500)
- 0-40: `down`-toned or `ink-400` · 41-65: `warn` · 66-100: `up`
- Label: Low / Medium / Medium-High / High

## App Router Structure

```
app/
  (auth)/login, signup
  (app)/
    layout.tsx          # Shell with top nav + left rail (desktop) or bottom tab (mobile)
    today/              # Primary landing (replaces /dashboard for logged-in flow)
    boards/             # Primary nav #2
    markets/            # Primary nav #3 (absorbs /insiders, /congress as filters)
    ask/                # Primary nav #4 (Ask Lens — rename from /athena)
    audit/              # Primary nav #5 (rename from /performance)
    signal/[id]         # Focus-reading
    ticker/[sym]        # Focus-reading (stock detail)
    portfolio/          # Screens 07-12 (existing)
    watchlist/          # Secondary (More)
    alerts/             # Secondary (More)
    notifications/      # Secondary — bell icon in top nav
    settings/           # Focus-reading
  (marketing)/
    page.tsx            # Homepage
    pricing/, about/, blog/, contact/
    disclaimer/, risk-disclosure/, refund/, terms/, privacy/
  api/                  # Thin proxy routes
```

## Rules (recap)
- Page background is `ink-0` or `ink-50` — never colored chrome
- Signal levels (entry/target/stop) always shown together
- Compliance footer on every signal page — non-negotiable
- Mobile-first: design for 390px width
- Score breakdown accessible from signal detail (tap confidence)
- Chart view accessible from signal detail (tap price area)
- Never hardcode stock prices — always from data providers
