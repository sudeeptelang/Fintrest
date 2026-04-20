# Fintrest.ai — Design Language v2.0 (Forest & Rust)

> **Source:** DSYS Inc. · April 2026 · supersedes v1.0
> **Status:** Locked — the visual system for all new work.
> **Companion file:** `docs/fintrest_screens_v2_preview.html` (static, four-screen clickable preview).

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

### 8. Nav shell
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

## 12. Implementation plan

**Phase 1 — Tokens** ✱ *current*
Tailwind config + globals.css fonts + CSS variable layer. The app looks "broken" until Phase 2; that's expected.

**Phase 2 — Marketing surfaces**
Homepage, pricing, about, disclaimer, risk-disclosure. Ground truth: `docs/fintrest_screens_v2_preview.html`.

**Phase 3 — App shell**
Top nav (56px) + left rail (240px, 5 items + More), IA consolidation, mobile bottom tab bar.

**Phase 4 — Atoms**
Each of the 8 atoms re-spec'd across signal cards, pin cards, board cards, Lens thesis, filter chips, score rings, reference levels, nav.

**Phase 5 — Cleanup**
Remove dead v1 tokens, emoji audit, deprecation sweep, remove `navy` gradient Athena card references.

---

## 13. Reference preview

Open `docs/fintrest_screens_v2_preview.html` in a browser to see the v2 design applied to Home / Pricing / About / Disclaimer. All four archetypes, real type, real color, with a top-right control bar to switch between them. Use this as the visual ground truth when building.
