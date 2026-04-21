# Fintrest.ai — Design Language v2.0 (Forest & Rust)

> **Source:** DSYS Inc. · April 2026 · supersedes v1.0
> **Status:** Locked — the visual system for all new work.
> **Companion files:**
> - `docs/fintrest_screens_v2_preview.html` — marketing screens (Home / Pricing / About / Disclaimer)
> - `docs/fintrest_app_screens_v2_preview.html` — app screens (Today / Signal / Portfolio / Ticker / Boards / Markets / Audit / Ask Lens). Tier toggle (Free / Pro / Elite) built into the preview.

One product. One system. One voice. This is the palette, type, spacing, motion, nav, and atomic-component contract that marketing, app, and focus-reading surfaces must all share.

---

## 1. What changed from v1

| Aspect | v1.0 | v2.0 |
|---|---|---|
| Brand color | Signature green `#00B87C` (bright) | Forest `#0F4F3A` (deep, institutional) |
| Accent | None — one green did all work | Rust `#B8502F` for editorial emphasis |
| Performance up | Same as brand | Separate up-green `#0A7F4F` — brand chrome and data chrome are never confused |
| Performance down | ink-500 (neutral gray) | Warm gray-brown `#6B5443` (not red) |
| Page background | Warm parchment `#f4f1eb` | White `#FFFFFF` / `#FAFBFC` |
| Screen archetypes | Implicit | Three named: Marketing · App-data · Focus-reading |
| App navigation | 11 sidebar items, 3 groups | 5 primary + "More" popover |
| Athena AI surface | Navy gradient cards | Forest-gutter Lens thesis block |
| Emoji | Allowed by omission | Explicitly forbidden |

**Why the color split matters.** Most fintech products use one green for brand AND up-performance. Forest (brand) / up-green (data) / forest-dark (interaction) are three distinct greens with exactly one job each — the same discipline FT, The Economist, and Bloomberg Intelligence use to separate editorial chrome from data chrome.

---

## 2. Color tokens

### Ink stack (unchanged from v1)
| Token | Hex | Use |
|---|---|---|
| ink-0 | `#FFFFFF` | pure white |
| ink-50 | `#FAFBFC` | page bg |
| ink-100 | `#F2F4F7` | surface alt |
| ink-200 | `#E4E7EC` | borders |
| ink-300 | `#D0D5DD` | dividers |
| ink-400 | `#98A2B3` | muted |
| ink-500 | `#667085` | captions |
| ink-600 | `#475467` | secondary |
| ink-700 | `#344054` | body |
| ink-800 | `#1D2939` | heading |
| ink-900 | `#101828` | primary |
| ink-950 | `#060C1A` | true black |

### Brand — forest green
| Token | Hex | Use |
|---|---|---|
| forest | `#0F4F3A` | brand identity — nav active, primary CTAs, focus rings, Lens gutter, logo |
| forest-light | `#E8F1EC` | backgrounds, hover tints |
| forest-dark | `#0A3528` | pressed / hover state on forest elements |

### Accent — warm rust
| Token | Hex | Use |
|---|---|---|
| rust | `#B8502F` | editorial emphasis — "Lens Editorial" badge, Board-of-the-Day, in-copy highlights |
| rust-light | `#FBF0EA` | editorial backgrounds |
| rust-dark | `#8A3B1F` | rust hover |

### Semantic — performance only
| Token | Hex | Use |
|---|---|---|
| up | `#0A7F4F` | price arrows, % up, score ring fill ≥ 40, bullish regime |
| down | `#6B5443` | price arrows, % down, bearish regime |

### Lens card surface (new in app screens)
| Token | Hex | Use |
|---|---|---|
| lens-bg | `#DCEBE2` | Background of every Lens thesis card — mid-tone between forest-light and ink. The visual signature of "Lens is writing here." Do not use for anything else. |

### Board cover palette — 8 colors for user boards
Low-saturation only. No primaries. Guarantees distinct boards without visual noise.

| Token | Hex | Token | Hex |
|---|---|---|---|
| cover-forest | `#0F4F3A` | cover-olive | `#5A6B3E` |
| cover-rust | `#B8502F` | cover-clay | `#8A5A3B` |
| cover-ink-700 | `#344054` | cover-slate | `#4A5A6E` |
| cover-ink-500 | `#667085` | cover-plum | `#6B4A5E` |

### Sector heatmap ramp — 8 steps around "flat"
Diverging scale. Up side = green family, down side = brown family, flat = slate. Never use red or reverse-ramp.

| Token | Hex | Range |
|---|---|---|
| heat-up-4 | `#0A7F4F` | ≥ +3.0% |
| heat-up-3 | `#228B5C` | +1.5% to +3.0% |
| heat-up-2 | `#4DA67A` | +0.5% to +1.5% |
| heat-up-1 | `#7DBF9B` | 0% to +0.5% |
| heat-flat | `#9DAABF` | within ±0.1% |
| heat-down-1 | `#9E8570` | 0% to -0.5% |
| heat-down-2 | `#7D6A58` | -0.5% to -1.5% |
| heat-down-3 | `#6B5443` | ≤ -1.5% |

### Functional — sparing
| Token | Hex | Use |
|---|---|---|
| warn | `#B25E09` | heads-up — earnings within 7d, low-confidence Lens tag, rate-limit banner |
| warn-light | `#FEF6E7` | warn backgrounds |
| danger | `#912018` | destructive action — delete confirm, hard errors |
| danger-light | `#FEE4E2` | danger backgrounds |

---

## 3. Color discipline — rules, not suggestions

| Color | Meaning | Use for | Never use for |
|---|---|---|---|
| forest | Brand identity | Nav active, primary CTA, logo, Lens gutter, focus ring | Price up/down, chart data, decoration |
| forest-dark | Hover of forest | Hover/pressed on forest elements | Any standalone meaning |
| rust | Editorial emphasis | Lens Editorial badge, Board-of-the-Day, in-copy emphasis | Primary CTAs, up-performance, errors |
| up (`#0A7F4F`) | Positive performance | Price arrows, % up, score-ring ≥ 70, bullish regime | Brand chrome, buttons, nav |
| down (`#6B5443`) | Negative performance | Price arrows down, % down, bearish regime | Error states, destructive UI |
| warn | Heads-up | Earnings within 7d chip, low-confidence Lens, rate-limit banner | Signal type, performance |
| danger | Destructive action | Delete confirm, revoke share, hard errors | Performance down, chart data |
| ink-500 | Caption / meta | Timestamps, captions, secondary metadata | Primary body content |
| ink-900 | Primary text | Body, headings, primary data values | Decoration, backgrounds |

**The three greens, reconciled:**
- **forest `#0F4F3A`** — "the brand is wearing this." Nav, buttons, logo, Lens gutter.
- **forest-dark `#0A3528`** — "the brand hovers." Pressed / active on forest elements.
- **up `#0A7F4F`** — "the data is showing this." Stock went up. Score is high. Bullish regime.

**Litmus test.** If you can swap forest for rust or up-green in a mockup and the design still reads correctly, the color is being used decoratively and should be removed. Every color use should have exactly one valid interpretation.

---

## 4. Three layout archetypes

Every screen in Fintrest is one of three archetypes. If a screen doesn't fit cleanly, the screen is wrong.

### Archetype 1 — Marketing
Landing, pricing, about, blog, legal. Single column, no sidebar.

| Property | Value |
|---|---|
| Top nav height | 64px |
| Content max-width | 1200px |
| Horizontal gutter | 24px desktop · 16px mobile |
| Section vertical padding | 96px desktop · 64px mobile |
| Hero top padding | 128px desktop · 80px mobile |
| Background | ink-0 primary, ink-50 alternate, forest-light for Lens sections, rust-light for editorial moments |
| Footer | Dark — ink-950 bg, ink-300 body, ink-0 headings, 4-col grid |
| Pages | `/` · `/pricing` · `/about` · `/blog` · `/contact` · `/disclaimer` · `/risk-disclosure` · `/refund` · `/terms` · `/privacy` |

### Archetype 2 — App-data
Primary app surface. Dense, scanning-oriented.

| Property | Value |
|---|---|
| Top nav height | 56px · ink-0 bg · 1px ink-200 bottom border |
| Left rail width | 240px fixed · ink-50 bg · 1px ink-200 right border |
| Content max-width | 1120px centered in remaining space |
| Top padding (content) | 48px |
| Horizontal padding (content) | 32px |
| Vertical rhythm | Title → 16px → meta row → 48px → Lens take (if any) → 48px → primary content |
| Left rail active | forest text + 2px forest left border + forest-light bg (subtle) |
| Pages | `/today` · `/boards` · `/markets` · `/audit` · `/watchlist/[id]` · `/alerts` · `/insiders` · `/congress` |

### Archetype 3 — Focus-reading
Long-form surfaces. Signal detail, pin detail, board detail, Ask Lens, settings.

| Property | Value |
|---|---|
| Top nav height | 56px (same as app-data) |
| Left rail | Same 240px with current section highlighted |
| Content max-width | **800px** (reading column) |
| Top padding | 64px |
| Horizontal padding | 48px |
| Typography base | **body-lg (16px)** — reading-optimized |
| Vertical rhythm | 24px between paragraphs, 32px between sections, Lens thesis dominates |
| Pages | `/signal/[id]` · `/ticker/[sym]` · `/boards/[id]` · `/boards/[id]/pins/[pid]` · `/ask` · `/settings/*` |

---

## 5. App IA — 11 items → 5

### Primary nav (left rail, in order)
1. **Today** `/today` — today's research drop. Signal board + regime card + Lens morning take. Lands here on login.
2. **Boards** `/boards` — user boards + editorial boards + discovery feed. The curation layer.
3. **Markets** `/markets` — sector heatmap + regime dashboard + macro. Absorbs Insiders + Congress as filters.
4. **Ask Lens** `/ask` — research chat. Rename from `/athena`.
5. **Audit log** `/audit` — public signal performance. Rename from `/performance`. The trust surface.

### Secondary — "More" popover from left rail
| Label | URL | Why demoted |
|---|---|---|
| Watchlist | `/watchlist` | A tool, not a destination. Users arrive from signal cards. |
| Alerts | `/alerts` | Configuration. Visit occasionally. |
| Insiders | `/insiders` | Merged into `/markets` as a filter/tab. |
| Congress | `/congress` | Merged into `/markets` as a filter/tab. |
| Notifications | `/notifications` | Bell icon in top nav instead. |
| Upload | `/portfolio/upload` | Action inside `/portfolio`, not nav. |

### Top nav utilities (right side)
- **Ticker search** — global, `/` to focus. Highest-frequency utility.
- **Ask Lens shortcut** — icon opens Ask Lens slide-over. ⌘K.
- **Notifications bell** — replaces the nav item. Badge count on unread.
- **Avatar menu** — Settings, Billing, Logout. Nothing else.

### Mobile (< lg / 1024px)
- Left rail collapses. Primary nav moves to bottom tab bar (5 icons: Today / Boards / Markets / Ask / Audit).
- Top nav compresses to 56px: logo + ticker search + avatar.
- Ask Lens becomes a floating button bottom-right above the tab bar.
- Content horizontal padding drops to 16px.

---

## 6. Typography

| Token | Size / Line / Tracking | Weight / Family | Use |
|---|---|---|---|
| display-xl | 72 / 80 / -0.03em | 700 Sora | Hero H1 — one per page |
| display-lg | 56 / 64 / -0.025em | 700 Sora | Major marketing section headers |
| display-md | 40 / 48 / -0.02em | 700 Sora | App page titles |
| h1 | 32 / 40 / -0.015em | 600 Sora | Primary in-view headings |
| h2 | 24 / 32 / -0.01em | 600 Sora | Section titles |
| h3 | 20 / 28 / -0.005em | 600 Sora | Card titles |
| h4 | 16 / 24 / 0 | 600 DM Sans | Small headings |
| body-lg | 16 / 26 / 0 | 400 DM Sans | Reading-optimized body (focus screens, Lens thesis) |
| body | 14 / 22 / 0 | 400 DM Sans | Default body |
| body-sm | 13 / 20 / 0 | 400 DM Sans | Secondary, helpers |
| caption | 12 / 18 / 0.01em | 400 DM Sans | Timestamps, footnotes |
| eyebrow | 11 / 16 / 0.1em | 600 DM Sans UPPERCASE | Section eyebrows |
| data-lg | 32 / 40 / -0.01em | 500 DM Mono | Hero metrics |
| data | 16 / 24 / 0 | 500 DM Mono | Default numeric |
| data-sm | 13 / 20 / 0 | 500 DM Mono | Inline data |

**Fonts to load** (globals.css):
```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
```

### Lens thesis — the typographic signature
Every piece of research text Lens writes is typeset in `body-lg DM Sans 400 / ink-800 / max-width 640px`, with a **2px forest left border** and **16px left padding**. Nothing else in the product gets this combination. When a user sees it, they know they're reading Lens.

**New in v2:** when Lens is quoting a source, the left border becomes **rust** instead of forest — visually separating "Lens is writing" from "Lens is quoting."

---

## 7. The 8 atoms

### 1. Score ring
| Spec | Value |
|---|---|
| Stroke | 2 / 4 / 8 px at 24 / 48 / 96 px sizes |
| Fill (score ≥ 40) | **up `#0A7F4F`** — reports data, not brand |
| Fill (score < 40) | ink-400 |
| Track | ink-100 |
| Center font | DM Mono 500 |
| Animation | stroke-dash 400ms ease-out, 40ms stagger |
| Hover (96px) | segment brightens to `#0D9660`, tooltip shows factor name |

### 2. Signal badge
| Variant | Colors |
|---|---|
| BUY TODAY | bg forest-light · text forest-dark · border forest |
| WATCH | bg ink-100 · text ink-700 · border ink-300 |
| AVOID | bg ink-50 · text ink-500 · border ink-200 · italic |

Height 24px, 8px horizontal padding, DM Sans 600 / 11px / UPPERCASE / 0.1em tracking, 4px radius.

### 3. Pin card
ink-0 bg · 1px ink-200 · 8px radius · 20px padding · hover ink-300 border + shadow-e1.
Ticker: Sora 700 / 24px / ink-900. Lens excerpt: body-sm / ink-600 / 2-line clamp / 1px forest left border / 12px left padding. Performance: DM Mono 500 / 14px / up or down / ▲ or ▼ glyph.
**NEW:** Editorial pins get a small rust "ED" chip top-right.

### 4. Lens thesis block
| Spec | Value |
|---|---|
| Border (Lens writing) | 2px **forest** left |
| Border (Lens quoting) | 2px **rust** left |
| Typography | body-lg DM Sans 400 / 16px / 26px / ink-800 |
| Max-width | 640px (60–70 char measure) |
| Left padding | 16px |
| Eyebrow | "LENS" forest-dark, or "LENS · EDITORIAL" rust-dark |
| Footer (on any ticker ref) | caption · ink-500 · *"Research only — your decision."* |
| Low-confidence | Border → ink-400, eyebrow → "LENS · LOW CONFIDENCE" in warn |

### 5. Reference level bar
Horizontal rule, 48px height, 1px ink-200 axis. ▲ up-green for ENTRY and TARGET, ▼ down-brown for STOP. R:R chip: DM Mono 500 / 12px / ink-700 / ink-100 bg / 4px radius. Numbers: DM Mono 500 / 14px / ink-900. Labels: eyebrow style.

### 6. Board card
Cover swatch 24×24 / 4px radius / top-left. **Cover color palette:** forest · rust · ink-700 · ink-500 · olive `#5A6B3E` · clay `#8A5A3B` · slate `#4A5A6E` · plum `#6B4A5E`. No saturated primaries. Name: Sora 600 / 20px / ink-900. Meta: body-sm / ink-500. Performance: data / 14px / up or down.
**Editorial variant:** rust-light bg + rust cover swatch + "LENS EDITORIAL" eyebrow.

### 7. Filter chip (Lens chip)
Pill · 32px height · 14px horizontal padding. DM Sans 500 / 13px.
| State | Colors |
|---|---|
| Inactive | bg ink-50 · text ink-700 · border ink-200 |
| Active | bg forest-light · text forest-dark · border forest · ✕ remove |
| Editorial (filter → Lens-editorial) | bg rust-light · text rust-dark · border rust |

### 8. App atoms (extended from app-screens preview)

> These atoms appear only inside the App-data and Focus-reading archetypes. Marketing surfaces never use them.

#### 8a. Lens card (the signature, promoted to full card)
The Lens thesis block evolves into a full card in app contexts.

| Spec | Value |
|---|---|
| Background | `lens-bg #DCEBE2` |
| Border | `1px rgba(15,79,58,0.18)` |
| Radius | 10px |
| Padding | 28px 32px |
| Mark | 22×22 forest square, 5px radius, white "L" in Sora 700 / 12px |
| Label | DM Sans 600 / 11px / forest-dark / UPPERCASE / 0.14em tracking — e.g. "LENS'S MORNING TAKE" |
| Meta | DM Mono 400 / 11px / ink-500, right-aligned |
| Title | Sora 600 / 22px / 30px / ink-950 / -0.01em |
| Body | DM Sans 400 / 16px / 28px / ink-800 / max-width 720px |
| Signature | Italic DM Sans 400 / 12px / ink-600 with 24×1px forest prefix line |

**Variants**
- **Personalized** (Elite only): `linear-gradient(135deg, lens-bg 0%, #D4E3DA 100%)`, border `rgba(184,80,47,0.25)`, adds a rust "Personalized" badge after the label
- **Locked** (Free tier): body is cut off with a 40px lens-bg gradient fade, a CTA row with upgrade button pinned below

#### 8b. Score ring (large — 140px)
Seven arcs around a 120px stroke circle. One arc per factor. Default reads the full-fill 87 composite ring.

| Spec | Value |
|---|---|
| Viewbox | 140×140, stroke 8px |
| Track | `#F2F4F7` (ink-100) |
| Fill (factor ≥ 40) | `up #0A7F4F` |
| Fill (factor < 40) | `ink-400 #98A2B3` |
| Center value | DM Mono 500 / 40px / ink-950 / -0.02em |
| Center "out of 100" | DM Mono 500 / 11px / ink-500 |
| Rotation | `-90deg` so 12 o'clock is start |

A **mini** version (34×34, 3px stroke) is used inline in signal tables.

#### 8c. Signal table row
A dense, scannable row. Columns, in order: rank · ticker · mini-ring · price · change · signal-badge · Lens thesis · sector · pin button.

| Spec | Value |
|---|---|
| Grid | `40px 90px 60px 80px 85px 100px 1fr 100px 40px` |
| Padding | 14px 24px |
| Row divider | `1px ink-100` |
| Hover | bg → ink-50 |
| Ticker | Sora 700 / 14px / ink-900 |
| Price | DM Mono 500 / 13px / ink-900 |
| Change | DM Mono 500 / 13px / up or down |
| Thesis (unlocked) | DM Sans 400 / 13px / ink-600 / `2px forest left border` + 10px left padding / 1-line clamp |
| Thesis (locked, Free) | italic ink-400 text + `lock-chip` at end, border becomes `ink-300` |

**Lock chip** (Free-tier upgrade indicator inside locked content): 2px 7px pad, forest-light bg, forest-dark text, 9px padlock icon, rounded 3px — reads "Pro" in 9px / 0.1em tracking UPPERCASE.

#### 8d. Featured signal card (magazine view)
A 3-column grid at the top of Today. Each card: ticker/company + price data bar + Lens thesis block (with 2px forest left border, matching the Lens thesis block signature) + reference-level line.

| Spec | Value |
|---|---|
| Radius | 10px |
| Padding | 24px |
| Ticker | Sora 700 / 24px / ink-950 / -0.01em |
| Price | DM Mono 500 / 22px / ink-950 |
| Score | DM Mono 500 / 16px / ink-900 (inside a `XX/100` pair with "/100" in DM Mono 500 / 12px / ink-500) |
| Thesis | DM Sans 400 / 13px / 20px / ink-700 · 2px forest left border · 14px left padding · min-height 80px |
| Thesis eyebrow | DM Sans 600 / 9px / forest-dark / 0.16em tracking / UPPERCASE |
| Hover | `translateY(-1px)` + shadow-e1 + border ink-300 |

#### 8e. Regime strip
Full-width status bar at the top of Today.

| Spec | Value |
|---|---|
| Grid | `auto auto auto 1fr auto` |
| Padding | 16px 24px |
| Regime indicator | forest-light pill, pulsing 8px forest dot, forest-dark text |
| Item label | DM Sans 600 / 10px / ink-500 / 0.14em tracking UPPERCASE |
| Item value | DM Mono 500 / 16px / ink-900 (or up for positive) |

#### 8f. Reference-level bar (horizontal)
The entry/stop/target visualization. Always shows R:R chip in the header.

| Spec | Value |
|---|---|
| Container | ink-0 bg, 1px ink-200, 10px radius, 24px 28px padding |
| Axis | 1px ink-200 horizontal line |
| Ticks | Absolute-positioned, translate(-50%, -50%); each has glyph + label + price stacked |
| Glyph | ▲ up for entry + target (color: up), ▼ for stop (color: down) |
| Label | DM Sans 600 / 9px / ink-500 / 0.14em tracking UPPERCASE |
| Price | DM Mono 500 / 13px / ink-900 |
| R:R chip | ink-100 bg, DM Mono 500 / 11px / ink-700 ("2.6" in ink-900 600) |

#### 8g. Factor breakdown row
One row per factor. Grid: `150px 60px 160px 1fr 20px` — name, score, bar, summary, chevron.

| Spec | Value |
|---|---|
| Name | DM Sans 600 / 13px / ink-900 |
| Score | DM Mono 500 / 15px / ink-900 |
| Bar track | 6px tall, ink-100, 3px radius |
| Bar fill (≥ 40) | up |
| Bar fill (< 40) | ink-400 |
| Summary | DM Sans 400 / 12px / 18px / ink-600 · **bold first clause** in ink-900 500 |
| Chevron | ink-400, 12px, › |

#### 8h. Fundamental scorecard row
Grid: `140px 1fr 60px 80px` — label, bar with peer marker, score, verdict chip.

| Spec | Value |
|---|---|
| Label | DM Sans 600 / 11px / ink-700 / 0.08em tracking UPPERCASE |
| Bar track | 8px tall, ink-100, 4px radius |
| Bar fill | strong=up, med=ink-500, weak=ink-300 |
| Peer marker | 2px vertical line ink-800, extends -4/-4 above/below bar, "PEER" label 8px under |
| Score | DM Mono 500 / 14px / ink-900, right-aligned |
| Verdict | DM Sans 600 / 10px / 0.12em tracking UPPERCASE — strong=up, med=ink-500, weak=down |

#### 8i. Plain-English takeaways list
White card, 10px radius, 24px 28px padding. Each item: 6px forest dot (8px top margin) + DM Sans 400 / 14px / 22px / ink-800 with **bold strong tags in ink-950**. Row divider: 1px dashed ink-200.

#### 8j. Technicals section (full data snapshot)
A collapsible section holding every detailed metric. Lives below the plain-English pyramid. Groups:
- Valuation (12 cells) + inline Fintrest fair value card + Street consensus card
- Margins & Estimates (8 cells)
- Performance (8 cells — week / month / quarter / YTD / year / 3y / 5y / since IPO)
- Quote & Volume (12 cells)
- Technical indicators (12 cells — SMA 20/50/200, RSI, ATR, etc.)
- Price history chart
- Shareholder comparison table
- Recent news list

Each group uses a `technicals-grid`: `repeat(4, 1fr)`, 1px gap on ink-100 — cells look like a unified matrix. Group header is an eyebrow label in forest-dark + 1px ink-100 underline.

A compact version (**technicals strip**) of 6 cells lives on Signal Detail as a "at a glance" strip, with a link to the full section on the Ticker page.

#### 8k. Portfolio stat card
Grid: `2fr 1fr 1fr 1fr`. First card is dark-primary; the other three are light.

| Spec | Value |
|---|---|
| Primary | ink-950 bg, ink-0 value, ink-400 label, 10px radius |
| Secondary | ink-0 bg, 1px ink-200, ink-950 value |
| Value | DM Mono 500 / 28px / -0.015em |
| Label | DM Sans 600 / 10px / ink-500 / 0.14em UPPERCASE |
| Sub | DM Mono 500 / 13px (up / down / neutral) |

#### 8l. Holdings table row
Grid: `140px 100px 100px 90px 110px 90px 70px 1fr`. Columns: ticker+company / price / fair value / 7D / total return / weight / signal-badge / 1Y sparkline.

- **Fair value** cell: value (DM Mono 500 / ink-700) + tag ("21.6% under" in up or "12% over" in down) stacked
- **Sparkline**: 80×22 viewBox inline SVG polyline, 1.5px stroke, up-green (or down-brown for loss)

#### 8m. Board card (pin collection)
| Spec | Value |
|---|---|
| Cover | 28×28 colored swatch, 6px radius, top-left |
| Name | Sora 600 / 17px / ink-950 |
| Meta | DM Sans 400 / 12px / ink-500 |
| Perf | DM Mono 500 / 14px / up or down |
| Editorial variant | `rust-lt` bg, rust cover, small rust "ED" chip top-right |

**New board tile** (blank slot): dashed ink border, ink-50 bg, hover→forest border + forest text.

#### 8n. Editorial boards strip
Full-width banner for Lens-curated daily collections.

| Spec | Value |
|---|---|
| Background | `linear-gradient(135deg, rust-light 0%, #FCE8DC 100%)` |
| Border | 1px `rgba(184,80,47,0.2)` |
| Radius | 10px, 28px padding |
| Title | Sora 600 / 16px / rust-dark + 20×20 rust square with "L" |
| Items | 4-col grid of mini cards, ink-0 bg, 1px `rgba(184,80,47,0.15)`, hover border rust |

#### 8o. Audit banner
Dark banner above audit metrics, establishes the trust tone.

| Spec | Value |
|---|---|
| Background | `ink-950` |
| Text | `ink-0` title (Sora 600 / 22px) + `ink-400` subtitle |
| Padding | 32px 40px, 10px radius |
| Hypothetical badge | warn-tinted chip — `rgba(178,94,9,0.14)` bg, `rgba(178,94,9,0.35)` border, `#E5B57F` text |

#### 8p. Audit metrics grid
4 cells, 1px internal divider on ink-200 shared background. Each cell: DM Mono 500 / 32px value, DM Sans 600 / 10px label, DM Sans 400 / 11px sub.

#### 8q. Filter chip (pill, 32px)
(Same as 7 above; repeated here because it's key to Today.)

#### 8r. Lock chip (Free-tier marker inside locked content)
Inline forest-light pill with padlock icon. Never used as a standalone button.

#### 8s. Upgrade gate row
Bottom-of-table row replacing locked rows for Free. Light gradient bg (ink-50→ink-0), flex layout with copy + primary "Upgrade" button.

#### 8t. Sector heatmap cell
Colored rectangle using the 8-step heat ramp. Name: Sora 600 / 13px. Perf: DM Mono 500 / 22px. Count: DM Mono 400 / 11px. Hover: `translateY(-2px)`.

| Sector delta | Cell text color |
|---|---|
| up-4, up-3, up-2 | ink-0 (white on dark green) |
| up-1, flat | ink-900 (dark on light) |
| down-1 | ink-0 |
| down-2, down-3 | ink-0 |

#### 8u. Ask Lens surface
Two-column layout inside Focus-reading.

| Spec | Value |
|---|---|
| Sidebar | 260px, ink-50 bg, 1px ink-200 right border, 24px 16px padding |
| Conversation list item | 10px 12px padding, 6px radius, hover ink-100, active forest-light bg + forest-dark title |
| Message (user) | avatar + DM Sans 500 / 15px / 24px / ink-900 |
| Message (Lens) | `lens-bg` card, 10px radius, 24px 28px padding — with sources row (forest chips) and action buttons below |
| Source chip | DM Mono 500 / 11px / forest-dark, ink-0 bg, `rgba(15,79,58,0.15)` border — hover: forest fill + ink-0 text |
| Input | 1.5px ink-300 border, 12px radius, focus: forest border + 3px forest/8% ring |
| Rate-limit chip | warn-light bg, DM Sans 500 / 11px / warn — "8 / 50 queries today" |

#### 8v. Ask Lens FAB
Fixed bottom-right, ink-950 pill, 12px 18px padding, 100px radius, shadow-e2. Contains: 18×18 forest "L" square + DM Sans 600 / 13px label ("Ask Lens" or context-specific "Ask Lens about NVDA").

---

### 9. Nav shell
| Spec | Value |
|---|---|
| Top nav height | 56px app · 64px marketing |
| Top nav bg | ink-0 · 1px ink-200 bottom border (no shadow, no scroll-bg-change) |
| Logo | Sora 700 / 16px / ink-900 · wordmark only in header |
| Marketing nav items | DM Sans 500 / 14px · ink-600 inactive · ink-900 active + 2px forest underline |
| Left rail (app) | 240px · ink-50 bg · 1px ink-200 right border · 5 primary + More |
| Left rail item height | 40px |
| Left rail active | forest text + 2px forest left border + forest-light bg (subtle) |
| Left rail inactive | ink-700 text · hover ink-900 + ink-100 bg |
| Mobile | top nav 56px + bottom tab 64px · 5 icons (Today / Boards / Markets / Ask / Audit) · active = 2px forest top border |

---

## 8. Spacing + breakpoints

| Token | Value | Use |
|---|---|---|
| space-1 | 4px | Icon-label gaps |
| space-2 | 8px | Inline pairings |
| space-3 | 12px | Compact stacks |
| space-4 | 16px | Default paragraph / card internal |
| space-6 | 24px | Card padding / card-to-card gap |
| space-8 | 32px | Section-to-section within page |
| space-12 | 48px | Between major page sections |
| space-16 | 64px | Top padding on page titles |
| space-24 | 96px | Marketing vertical rhythm |
| space-32 | 128px | Hero-to-content transitions |

| Breakpoint | Value | Notes |
|---|---|---|
| sm | 640px | small mobile |
| md | 768px | large mobile / small tablet |
| lg | 1024px | **left rail appears here** |
| xl | 1280px | primary target |
| 2xl | 1536px | large desktop |

---

## 9. Motion (unchanged from v1)

1. Every transition is **120ms ease-out**. No exceptions.
2. Motion must show causality or confirm state. Never decorative.
3. One motion per interaction. Never stack.
4. No parallax, scroll-triggered animation, or mouse-follow.
5. No skeleton shimmer. Use a subtle pulse.

Shadow scale:
- `e1` — `0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.08)`
- `e2` — `0 4px 8px rgba(16,24,40,0.08), 0 12px 24px rgba(16,24,40,0.10)`

Border radius: sm 4px · default 6px · md 8px · lg 12px.

---

## 10. Tailwind config (drop-in)

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          0: '#FFFFFF', 50: '#FAFBFC', 100: '#F2F4F7',
          200: '#E4E7EC', 300: '#D0D5DD', 400: '#98A2B3',
          500: '#667085', 600: '#475467', 700: '#344054',
          800: '#1D2939', 900: '#101828', 950: '#060C1A',
        },
        forest: { DEFAULT: '#0F4F3A', light: '#E8F1EC', dark: '#0A3528' },
        rust:   { DEFAULT: '#B8502F', light: '#FBF0EA', dark: '#8A3B1F' },
        up: '#0A7F4F',
        down: '#6B5443',
        warn:   { DEFAULT: '#B25E09', light: '#FEF6E7' },
        danger: { DEFAULT: '#912018', light: '#FEE4E2' },
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['DM Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'eyebrow':    ['11px', { lineHeight: '16px', letterSpacing: '0.1em' }],
        'caption':    ['12px', { lineHeight: '18px', letterSpacing: '0.01em' }],
        'body-sm':    ['13px', { lineHeight: '20px' }],
        'body':       ['14px', { lineHeight: '22px' }],
        'body-lg':    ['16px', { lineHeight: '26px' }],
        'h4':         ['16px', { lineHeight: '24px' }],
        'h3':         ['20px', { lineHeight: '28px', letterSpacing: '-0.005em' }],
        'h2':         ['24px', { lineHeight: '32px', letterSpacing: '-0.01em' }],
        'h1':         ['32px', { lineHeight: '40px', letterSpacing: '-0.015em' }],
        'display-md': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em' }],
        'display-lg': ['56px', { lineHeight: '64px', letterSpacing: '-0.025em' }],
        'display-xl': ['72px', { lineHeight: '80px', letterSpacing: '-0.03em' }],
        'data-sm':    ['13px', { lineHeight: '20px' }],
        'data':       ['16px', { lineHeight: '24px' }],
        'data-lg':    ['32px', { lineHeight: '40px', letterSpacing: '-0.01em' }],
      },
      boxShadow: {
        'e1': '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.08)',
        'e2': '0 4px 8px rgba(16,24,40,0.08), 0 12px 24px rgba(16,24,40,0.10)',
      },
      transitionDuration: {
        '80': '80ms', '120': '120ms', '160': '160ms', '200': '200ms',
      },
      borderRadius: {
        'sm': '4px', DEFAULT: '6px', 'md': '8px', 'lg': '12px',
      },
    },
  },
  plugins: [],
}
export default config
```

---

## 11. Non-negotiables

1. **No emoji in the UI.** Icons from Lucide only, 1.5px stroke, consistent sizes.
2. **Three greens, three jobs.** forest (brand), forest-dark (interaction), up (data). Never swap.
3. **Down is warm gray-brown, never red.** Red is reserved for `danger` (destructive actions).
4. **Lens thesis always has the forest gutter.** The typographic signature.
5. **Signal levels (entry/target/stop) always together.** Never separated in layout.
6. **Compliance disclaimer on every signal page** — non-negotiable, not optional.
7. **R:R < 1.5 → signal isn't published.**
8. **Never hardcode stock prices** — always pull from data providers.
9. **Every color use has exactly one valid interpretation.** If a swap still reads correctly, the color is decorative and must be removed.

---

## 12. App screen specs (source: `docs/fintrest_app_screens_v2_preview.html`)

Eight screens make up the logged-in product. Each screen composes the atoms above — no bespoke chrome.

### Today (`/today`) — App-data
The morning drop. Lands here on login.

Vertical order: regime strip → Lens's morning take (card variants by tier) → filter chips → featured signals (3-col magazine, top 3 by score) → full signal table → upgrade gate (Free only). Ask Lens FAB bottom-right.

**Tiered content:**
- Free: top 3 featured signals unlocked, rows 4–7 locked (thesis masked with lock chip), upgrade gate at row 8
- Pro: full signal table, all theses unlocked, standard Lens morning take
- Elite: all Pro content + personalized Lens morning take tuned to portfolio

### Signal detail (`/signal/[id]`) — Focus-reading
Promote the Lens thesis above the factor tables. Order: breadcrumb → signal-hero (ticker + price + 140px score ring, side-by-side) → Lens thesis card → plain-English takeaways → reference-level bar → 7-factor breakdown → compact technicals strip with link to Ticker page for full data.

### Ticker detail (`/ticker/[sym]`) — Focus-reading
The feature piece. Same Lens-first hierarchy as Signal detail, plus the full Technicals section (atom 8j) and fundamental scorecard (atom 8h).

Order: ticker-hero → Lens thesis → plain-English takeaways → reference levels → fundamental scorecard → 7-factor breakdown → full Technicals section (Valuation · Margins · Performance · Quote/Volume · Indicators · Price chart · Shareholder comparison · Recent news).

### Portfolio (`/portfolio`) — App-data
Order: portfolio stat cards (4, primary + 3) → Lens take card (tier-variant) → returns breakdown → holdings table (with sparklines).

### Boards (`/boards`) — App-data
Order: stats strip (boards · pins · above pin price · avg move) → editorial boards strip (rust-tinted) → your boards grid (3-col, 6 boards) → Lens suggestion card (Pro+). Free gets a locked message instead of the grid.

### Markets (`/markets`) — App-data
4 tabs: Sector heatmap · Congress · Insiders · Regime. Lens market-read card persists above tabs. Sector tab uses the heat ramp (12 sectors, 4-col grid). Congress + Insiders use `markets-table` with action badges (buy=forest-light, sell=ink-50 with down text). **Absorbs the legacy `/insiders` and `/congress` routes.**

### Audit log (`/audit`) — App-data
The trust surface. Order: audit banner (dark) → audit metrics grid (4 cells) → hypothetical disclaimer (warn-tinted) → full signal history table with outcome badges (hit=forest-light, stop=down-tinted, flat/open=ink-100). **Rename from `/performance`.**

### Ask Lens (`/ask`) — Focus-reading
2-col layout: 260px sidebar with conversation history + main chat pane. User messages inline (avatar + body), Lens replies in `lens-bg` cards with sources chips + action buttons below. Input is a 1.5px-bordered textarea with send button, suggested prompts below, rate-limit pill for Pro, unlimited indicator for Elite, upgrade chip for Free. **Rename from `/athena`.**

---

## 13. Implementation plan

| Phase | Scope | Status |
|---|---|---|
| Phase 1 — Tokens | CSS variable layer + font imports + radius scale + shadow utilities | ✅ done |
| Phase 2 — Marketing | Homepage, pricing, about, disclaimer, risk-disclosure, footer, nav, OG image | ✅ done |
| Phase 3 — App shell | `(app)/layout.tsx` shared shell — 56px top nav + 240px rail + 5-item IA + "More" popover + Ask Lens FAB + mobile bottom-tab | 🟡 next |
| Phase 4 — Atoms | Build the 22 app atoms in `components/app/*` — one file per atom, no one-off chrome anywhere | 🟡 next |
| Phase 5 — Screen ports | Rebuild each app route against atoms — in order: Today → Signal → Ticker → Portfolio → Boards → Markets → Audit → Ask Lens | 🟡 next |
| Phase 6 — IA consolidation | Merge `/insiders` + `/congress` into `/markets` as tabs · rename `/performance` → `/audit` · rename `/athena` → `/ask` · add redirects | 🟡 next |
| Phase 7 — Cleanup | Remove v1 Athena navy gradient cards, drop dead emerald/navy aliases, final emoji audit | 🟡 last |

### Suggested build order within each phase
**Phase 3** — shell first, so all screens get the new chrome for free while being ported.

**Phase 4** — atoms in dependency order: Lens card → Score ring (lg + mini) → Signal badge → Lock chip → Filter chip → Signal-table row → Featured signal card → Reference bar → Factor breakdown → Fundamental scorecard → Takeaways → Technicals strip + section → Portfolio stat → Holdings row → Board card → Editorial strip → Audit banner + metrics → Sector cell → Ask Lens surface → FAB.

**Phase 5** — screens in user-impact order: Today (every user sees this every morning) → Signal detail (drill-down from Today) → Ticker detail (the feature piece) → the rest.

---

## 14. Gap audit — things caught on review

The preview HTML is desktop-only and happy-path only. This section patches the
gaps so implementation matches real app behavior, not just the preview.

### 14.1 IA correction — 6 primary, not 5
Earlier drafts said 5. The app-screens preview actually shows **6**:
**Today · Boards · Portfolio · Markets · Ask Lens · Audit log.** Portfolio is
primary because every paying user lives in it. The 5-count was wrong.

**More** popover (secondary): Watchlist · Alerts · Insiders · Congress · Notifications · Upload. Insiders and Congress also appear as tabs inside Markets — both paths valid.

### 14.2 Mobile behavior (preview is desktop-only)
| Surface | `< 1024px` behavior |
|---|---|
| Left rail (240px) | Collapse — becomes a hamburger-triggered slide-over (280px wide, ink-0 bg, spring transition). Bottom tab bar replaces it on `< 640px` with 5 icons (Today / Boards / Markets / Ask / Audit); Portfolio demoted behind tab. |
| Top nav | Stays 56px. Shows: hamburger + logo + compact search + avatar. Tier badge hidden `< 640px`. |
| Ask Lens FAB | Tucks above bottom tab bar (`bottom: 88px` on `< 640px`). |
| Signal table | Collapse to a card list: ticker + mini-ring + price stacked, thesis full-width below. No horizontal scroll. |
| Featured signals | 3-col → 1-col. |
| Score ring (140px in hero) | Stacks above ticker info on `< 768px`. |
| Technicals grid (4-col) | → 2-col `< 768px`. |
| Holdings table | Horizontal scroll with sticky first column (ticker). |
| Ask Lens layout | Sidebar slides out as a drawer; main chat takes full width. |
| Regime strip (5-col grid) | → horizontal scroll on `< 768px` with snap points. |
| Content padding | 32px → 16px horizontal on `< 640px`. Top padding 48px → 24px. |

### 14.3 State atoms (missed — every screen needs these)
| State | Pattern |
|---|---|
| **Loading** | Container gets a subtle pulse on opacity (0.6 → 1.0 over 1.2s ease-in-out). Skeleton text uses fixed-width ink-100 blocks, same height as real content, 4px radius. **No shimmer animation** (v2 motion rule). |
| **Empty** | Typography-only. Eyebrow "No [thing] yet" in ink-500 / 11px UPPERCASE · title h3 ink-900 · body-sm ink-600 explanation · single primary CTA. No illustration. |
| **Error** | Border + bg in `danger-light`. Title "Something broke" in danger-dark / h4. Body explains what happened. "Try again" primary action + "Report" ghost action. |
| **Toast** | Bottom-right stack. Single ink-950 pill at shadow-e2, 280px max width, 12px 16px padding. Auto-dismiss at 4s unless `action` present. Success = forest dot prefix, error = danger dot prefix. |
| **Modal** | Centered, ink-0 surface, 480px max width, 12px radius, shadow-e2. Backdrop ink-950/40 with backdrop-blur-sm. Header: h3 + close icon. Body: body. Footer: right-aligned primary + ghost actions, 16px gap. |
| **Confirmation** (destructive) | Modal variant. Primary button uses danger token. Body leads with the consequence: *"This deletes your watchlist. This cannot be undone."* |
| **Dropdown / Menu** | ink-0 bg · 1px ink-200 · 8px radius · shadow-e2 · 4px internal padding · 8px 12px per item · hover ink-100 · active forest-light + forest text. |
| **Tooltip** | ink-950 bg · ink-0 text · 11px DM Sans · 6px 10px padding · 4px radius · shadow-e1 · 200ms delay · 120ms fade. |
| **Banner (page-level)** | Full-width strip above content. Info=ink-100/ink-700, warn=warn-light/warn, danger=danger-light/danger. 12px vertical padding. Dismissible via X button right-aligned. |

### 14.4 Primitive atoms also missing
- **Breadcrumb** — DM Mono 400 / 12px / ink-500 · separator `›` / ink-400 · last crumb ink-900.
- **Tab bar** (horizontal) — DM Sans 500 / 13px / ink-600 · active: forest 600 + 2px forest bottom border (overlapping parent border).
- **Sparkline** — 80×22 inline SVG · 1.5px stroke · up or down color by net move · no axes.
- **Price chart** (mid) — 800×220 area chart · up-green gradient fill (0.15 alpha) · 1.8px stroke · 3 y-axis grid lines (ink-100) · axis labels DM Mono 400 / 10px / ink-400.
- **Pagination** — DM Mono 500 / 13px · `‹ prev 1 2 3 next ›` · active page forest-light bg.
- **Avatar dropdown** — 32px forest circle with initials → dropdown menu (see 14.3).
- **Sort/Filter toolbar** — ink-50 strip above tables · filter chips + sort select · 48px height.
- **Signal-hero** / **Ticker-hero** — composition atoms: `grid-cols-[1fr_140px]` (or 180px) with hero content + score ring side-by-side, stack on `< 768px`.

### 14.5 Compliance + data-truthiness patterns
- **"Research only — your decision"** footer mandatory on every Lens card referencing a ticker (already in Lens thesis block spec — now extended to every card, not just thesis).
- **Data freshness line** on every real-time surface: *"Updated 2 min ago · Data from [source]"* in DM Mono 400 / 11px / ink-500. Required on portfolio stats, price-dependent displays, heatmap.
- **Hypothetical / backtested badge** on audit log metrics — already captured as atom 8o.
- **Compensated / Not compensated** disclosure on every testimonial (already in marketing social-proof).
- **Rate-limit chip** on Ask Lens input (Pro only) — shows query count; Elite shows "Unlimited · Priority"; Free shows upgrade CTA.

### 14.6 Accessibility baseline
- Focus ring: `0 0 0 3px rgba(15,79,58,0.08)` — used in `.app-nav-search input:focus` and must extend to every focusable element.
- Color contrast: heatmap down-3 (`#6B5443`) + ink-0 text passes AA (4.6:1). Never use down-1 or flat backgrounds with ink-0 text.
- Skip-to-content link at the top of every page (`sr-only focus:not-sr-only`).
- Keyboard shortcuts documented and consistent: `/` focus search · `⌘K` / `Ctrl+K` open Ask Lens slide-over · `ESC` dismiss overlays · `g t` go Today / `g p` go Portfolio / `g m` go Markets / `g a` go Audit log.
- `prefers-reduced-motion: reduce` → disable all framer-motion on decorative transitions (keep causality-motion on menu/drawer open).

### 14.7 Tier gating patterns (explicit rules)
| Gate | Pattern |
|---|---|
| Inline content | **Lock chip** (atom 8r) or italic placeholder — "Upgrade to Pro to see Lens's thesis" |
| Row-level (table) | Locked rows get grey thesis + lock chip; full upgrade gate row (atom 8s) at bottom |
| Card-level | Lens locked card (atom 8a variant) — content cut off with gradient fade + CTA below |
| Feature-level | Paywall modal (atom 14.3 state) — centered, plan comparison inside |
| Nav-level | Tier-restricted rail items hidden (not grey-outed) for Free — reduces visual noise |

### 14.8 Deprecation manifest — what to delete when rebuilding

**Components (legacy Athena / v1 chrome):**
- `components/theme-toggle.tsx` — v2 is single-theme; delete
- `components/ui/athena-surface.tsx` — v1 navy gradient; replaced by Lens card (8a)
- `components/dashboard/athena-board.tsx` — fold into new Today screen
- `components/dashboard/athena-pulse.tsx` — dropped; no v2 equivalent
- `components/dashboard/hero-signal-card.tsx` — replaced by featured signal card (8d)
- `components/dashboard/setup-lens-tiles.tsx` — fold into filter chip row (8q)
- `components/dashboard/trending-lists.tsx` — has emoji (🚀📉🔥⚡), violates v2 rule; rebuild as Markets sub-components or delete
- `components/portfolio/portfolio-athena-profile.tsx` — rename Athena→Lens, restyle
- `components/stock/athena-thesis-card.tsx` — replaced by Lens card (8a)
- `components/stock/athena-snowflake.tsx` — replaced by fundamental scorecard (8h)
- `components/news/news-reader-drawer.tsx` — Athena references; rename + restyle

**Routes (legacy URLs — add redirects in Phase 6):**
| Old | New | Strategy |
|---|---|---|
| `/dashboard` | `/today` | Rename route file, redirect old path |
| `/picks` | `/today` (alias) | Delete route; redirect `/picks` → `/today` |
| `/athena` | `/ask` | Rename route file, redirect old path |
| `/performance` | `/audit` | Rename route file, redirect old path |
| `/heatmap` | `/markets?tab=heatmap` | Delete route; redirect |
| `/insiders` | keep + `/markets?tab=insiders` | Both valid; insider standalone lives in More |
| `/congress` | keep + `/markets?tab=congress` | Both valid |
| `/summary` | fold into `/today` or delete | TBD — ask user what this is for |
| `/news` | fold into Markets tab or per-ticker | TBD |
| `/stock/[ticker]` | `/ticker/[sym]` | Rename route file, redirect |

**Assets (legacy brand):**
- `public/logo-icon.png` — v1 bright green; replaced by `public/icon.svg` (v2 forest)
- `public/og-image-1200x630.jpg` — v1 bright green; replaced by dynamic `app/opengraph-image.tsx`
- `public/brand/fintrest-logos/*` — v1 brand kit; archive but don't reference
- `public/fintrest-logos.zip` — v1 brand kit; delete

**File renames queued (keep imports working until Phase 7):**
- `components/layout/ask-athena-fab.tsx` → `ask-lens-fab.tsx` (currently re-exports as alias)
- All `Athena` user-visible strings → `Lens`
- System prompt in Ask Lens backend → update persona name

---

## 15. Reference previews

- `docs/fintrest_screens_v2_preview.html` — marketing screens (Home / Pricing / About / Disclaimer). Open in a browser for the v2 ground truth.
- `docs/fintrest_app_screens_v2_preview.html` — app screens (Today / Signal / Portfolio / Ticker / Boards / Markets / Audit / Ask Lens). Has a top-right Free / Pro / Elite tier toggle so you can see how paywall content differs.
