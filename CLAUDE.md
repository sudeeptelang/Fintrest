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

## Design Tokens

```
Primary green:   #00b87c        Green dark:      #008f5f
Green soft:      rgba(0,184,124,.11)
Navy:            #0d1a2e        Background:      #f4f1eb (warm parchment — NOT white)
Surface:         #fbfaf7        Surface-2:       #ffffff
Surface-3:       #ece7dd        Border:          rgba(35,29,22,.09)
Text:            #1a1510        Muted:           #6b6259
Danger:          #d94f3d        Amber:           #d97706
Blue:            #3b6fd4

Font:            Satoshi (fontshare) — headings 900, body 500/700
Mono:            DM Mono (prices, tickers, codes)
Border radius:   Cards 20-24px · Buttons 15-16px
Shadow:          0 12px 32px rgba(16,12,8,.09)
```

## Non-Negotiable Rules

1. **Warm palette** — never use pure white (#fff) as page background; use `#f4f1eb`
2. **Athena always in navy cards** — never show AI output on plain white backgrounds
3. **Signal levels always together** — entry + target + stop shown as a unit, never separated
4. **Compliance footer** on every signal — non-negotiable, not optional
5. **R:R ratio** — if ratio < 1.5 the signal shouldn't be published
6. **Mobile-first** — all layouts designed for 390px width (iPhone 15 Pro)
7. **Never hardcode prices** — always pull from data providers
8. **Cache aggressively** — signals in Redis, expire at next scan (6 AM ET)

## UI/UX Design Reference

All 22 screens are designed in `docs/fintrest_screens_v2_final.html` — this is the single source of truth for visual design.
Open this file in a browser to see every screen in Finxoom's warm editorial style with dark phone shells.

**Screen groups:**
- **Onboarding:** Splash (01), Sign Up (02), Pricing (18)
- **Signals:** Dashboard (03), Signals List (04), Signal Detail (05), Ask Athena (06), Markets (16), Score Breakdown (21), Candlestick Chart (22)
- **Portfolio:** Overview (07), Holding Detail (08), Add Holding (09), Performance (10), Rebalancing AI (11), Import (12)
- **Account:** Watchlist (13), Alerts (14), Create Alert (15), Notifications (17), Profile (19), Weekly Summary (20)

## Reference Docs

Detailed specs are split into focused files — use `@` imports when needed:

- `@docs/PRODUCT.md` — screen inventory, subscription plans, roadmap
- `@docs/SCHEMA.md` — database tables and relationships
- `@docs/API.md` — all REST endpoints
- `@docs/SIGNALS.md` — 7-factor scoring engine and thresholds
- `@docs/ATHENA.md` — AI agent prompts and compliance rules

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
