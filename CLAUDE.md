# Fintrest.ai — CLAUDE.md
> Root context file for Claude Code. Read this before writing any code.

## Product Summary

**Fintrest.ai** is an explainable US stock signal and portfolio intelligence platform powered by Claude AI (Athena). It surfaces daily buy/watch/avoid signals with plain-English explanations, entry/target/stop levels, and a 7-factor confidence score.

**Core philosophy:** Every signal must be explainable. No black boxes. Signals are educational content, not financial advice.

**AI assistant:** Athena — powered by `claude-sonnet-4-20250514`

## Tech Stack

| Layer | Stack |
|-------|-------|
| **Web** | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand, React Query |
| **Backend** | C# .NET / FastAPI, PostgreSQL (Supabase), Redis |
| **Mobile** | Flutter / Dart |
| **AI** | Claude Sonnet 4 via Anthropic API (7 internal agents) |
| **Data** | Polygon.io, FMP, Finnhub, Yahoo Finance (fallback) |
| **Infra** | Vercel (web), Supabase (DB/auth), AWS SES (email), Stripe (billing) |

## Design Tokens — v2.0 Forest & Rust

> Full spec: `@docs/DESIGN_LANGUAGE_V2.md` · Clickable preview: `docs/fintrest_screens_v2_preview.html`
> v2 supersedes v1. All new UI work uses v2 tokens.

```
Brand:        forest      #0F4F3A   forest-dark  #0A3528   forest-light #E8F1EC
Accent:       rust        #B8502F   rust-dark    #8A3B1F   rust-light   #FBF0EA
Semantic up:  #0A7F4F     (positive performance — separate from brand)
Semantic dn:  #6B5443     (negative performance — warm gray-brown, NOT red)
Warn:         #B25E09     Danger: #912018

Ink stack:    ink-0 #FFFFFF · ink-50 #FAFBFC · ink-100 #F2F4F7 · ink-200 #E4E7EC
              ink-300 #D0D5DD · ink-400 #98A2B3 · ink-500 #667085 · ink-600 #475467
              ink-700 #344054 · ink-800 #1D2939 · ink-900 #101828 · ink-950 #060C1A

Font:         Sora (display, 400/500/600/700) · DM Sans (body, 400/500/600)
              DM Mono (data — prices, tickers, scores)
Border radius: 4 / 6 (default) / 8 / 12 px
Shadow:       e1 = 0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.08)
              e2 = 0 4px 8px rgba(16,24,40,.08), 0 12px 24px rgba(16,24,40,.10)
Motion:       120ms ease-out default, no parallax, no skeleton shimmer
```

## Non-Negotiable Rules

1. **Three greens, three jobs** — forest = brand (nav, CTA, logo, Lens gutter), forest-dark = hover/pressed, up `#0A7F4F` = performance data. Never swap.
2. **Down is warm gray-brown, never red.** Red (`danger`) is reserved for destructive actions.
3. **No emoji in the UI.** Lucide icons only, 1.5px stroke.
4. **Lens thesis always has the forest gutter** (2px forest left border + 16px padding + body-lg DM Sans). The typographic signature. Rust gutter when Lens is quoting a source.
5. **Signal levels always together** — entry + target + stop shown as a unit, never separated.
6. **Compliance footer** on every signal — non-negotiable, not optional.
7. **R:R ratio** — if ratio < 1.5 the signal shouldn't be published.
8. **Mobile-first** — all layouts designed for 390px width (iPhone 15 Pro).
9. **Never hardcode prices** — always pull from data providers.
10. **Cache aggressively** — signals in Redis, expire at next scan (6 AM ET).
11. **Every color use has exactly one valid interpretation.** If a swap still reads correctly, the color is decorative and must be removed.

## Legal & Compliance Model

Fintrest is an **educational stock signal publisher** — not a broker-dealer or RIA.
No FINRA/SEC registration required. Same model as Motley Fool, TipRanks, Zacks.

**We sell access to content, not investment advice.**

**Hard rules for all code, UI, and AI output:**
- Signals are educational content — never personalized investment advice
- Never say "you should buy/sell X" or recommend specific dollar amounts
- Never guarantee returns or claim signals are always accurate
- Show win rate as historical fact, not a promise
- Subscription is for access to signal data and tools, not advisory services
- Athena must end every securities-related response with the compliance footer

**Required on every signal page:**
- "Educational content only — not financial advice"
- "Past signal performance does not guarantee future results"

**Required legal pages at launch:** Terms of Service, Privacy Policy, Disclaimer & Risk Disclosure

**Line we never cross:** auto-trading user accounts or personalized allocation advice ("put $X in Y") — that requires RIA registration.

## UI/UX Design Reference

**v2 Forest & Rust is the current design language.** See `@docs/DESIGN_LANGUAGE_V2.md` for the full spec and `docs/fintrest_screens_v2_preview.html` for the clickable preview (Home / Pricing / About / Disclaimer).

Legacy reference `docs/fintrest_screens_v2_final.html` (warm parchment phone shells, v1) is kept for mobile screen inventory only — any visual token in it is superseded by v2.

**App IA (5 primary, in order):** Today · Boards · Markets · Ask Lens · Audit log. Secondary items (Watchlist, Alerts, Insiders, Congress, Notifications, Upload) live in a "More" popover or as sub-routes.

**Three layout archetypes:**
- **Marketing** — single column, 1200px max, 96px section padding (`/`, `/pricing`, `/about`, legal pages).
- **App-data** — top nav 56px + left rail 240px + 1120px content, scanning-oriented (`/today`, `/boards`, `/markets`, `/audit`).
- **Focus-reading** — same shell but 800px content, 64px top padding, body-lg as base (`/signal/[id]`, `/ticker/[sym]`, `/ask`, `/settings/*`).

## Reference Docs

Detailed specs are split into focused files — use `@` imports when needed:

- `@docs/DESIGN_LANGUAGE_V2.md` — tokens, atoms, layout archetypes, IA, Tailwind config
- `@docs/COMPLIANCE_COPY_REWRITE.md` — site-wide copy rewrite for SEC/FTC compliance
- `@docs/PRODUCT.md` — screen inventory, subscription plans, roadmap, competitive positioning
- `@docs/COMPETITORS.md` — full competitor landscape (78 citations), feature matrix, market gaps, differentiators
- `@docs/SCHEMA.md` — database tables and relationships
- `@docs/API.md` — all REST endpoints
- `@docs/SIGNALS.md` — 7-factor scoring engine and thresholds
- `@docs/ATHENA.md` — AI agent prompts and compliance rules (Athena → Lens rename in progress)

## Common Commands

```bash
# Web (Next.js)
cd web && npm run dev          # Dev server
cd web && npm run build        # Production build
cd web && npm run lint         # ESLint

# Backend (C# .NET 10)
cd backend/Fintrest.Api && dotnet run          # Run API
cd backend/Fintrest.Api && dotnet build        # Build
cd backend/Fintrest.Api && dotnet ef migrations add <Name>   # New migration
cd backend/Fintrest.Api && dotnet ef database update          # Apply migrations

# Mobile (Flutter)
cd mobile && flutter run       # Run on connected device
cd mobile && flutter build apk # Android build
cd mobile && flutter build ios # iOS build
```

## Sub-project CLAUDE.md files

- `web/CLAUDE.md` — Next.js, Tailwind, component patterns
- `backend/CLAUDE.md` — C# API, Supabase, data providers
- `mobile/CLAUDE.md` — Flutter/Dart conventions
