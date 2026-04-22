# MVP-1 Final — Ship Plan

**Target:** May 10, 2026 · **Today:** 2026-04-22 · **Days:** ~18
**Scope:** locked per [FINTREST_UX_SPEC.md](FINTREST_UX_SPEC.md) · **No further scope changes.**

This doc translates the canonical spec into a minimal-change ship plan
against the existing codebase. Web + mobile included. Everything in the
spec that is not below is **deferred to MVP-2** (post-May-10) — not
cancelled, just sequenced.

---

## Reality check — 15 phases in 18 days is not possible

The spec lists 15 build phases. Each is 1–2 weeks in the doc's own sizing.
That's 15–30 weeks. We have ~2.5 weeks. The honest approach: ship a
minimum viable version of each **critical** surface, defer the rest to a
clean MVP-2 milestone.

**Good news:** most of the backend + UI scaffolding already exists from
v2. The work is restructure + rename + polish, not greenfield.

---

## What ships by May 10 (MVP-1 scope)

| Spec phase | Surface | Status now | MVP-1 scope |
|---|---|---|---|
| 0 · Foundation | Design tokens, component lib, routing, auth | Mostly done (v2 Forest + primitives) | Migrate `#0F4F3A` → `#0F6E56`, serif for Lens, 4-tab IA |
| 0 · Onboarding | 4-step post-signup | Half-built (migration 023 committed; UI missing) | Minimal functional version (3 steps OK for May 10; step 4 can ship later) |
| 1 · Markets | Overview with regime, indices, breadth, sectors, screeners, earnings | Exists as thin page | Rebuild per spec §05 — becomes **default authed landing** (was `/today`) |
| 2 · Today's drop | Research default sub-tab | Exists as `/dashboard` | Move to `/research`, keep existing layout |
| 3 · Ticker page | Hero, thesis, trade plan, 8-factor | Shipped (Commits A/B/C) | Re-theme to new accent color, keep structure |
| 4 · Deep dives | 13 explainer pages (8 factors + 5 sub-dives) | Not built | **Defer to MVP-2.** One template + wire 2–3 as proof (Momentum, News, Smart money) |
| 5 · Portfolio | 5 sub-tabs | Holdings exists; Analysis/Benchmark/Risk/History partial | **MVP-1: Holdings + Analysis tabs.** Benchmark/Risk/History → MVP-2 |
| 6 · Audit log | List + signal detail + retrospective | Outcome cron shipped; UI thin | **MVP-1: list + basic detail.** Retrospective + failure-mode → MVP-2 |
| 7 · Alerts + Inbox | Unified inbox with filter chips | Alerts exist; split pages | Consolidate to single `/inbox` route; evaluator shipped |
| 8 · Ask Lens | Chat with strict system prompt | **REMOVED earlier for cost reasons** | **Defer to MVP-2.** Spec explicitly flags legal review as pre-ship requirement; 18 days isn't enough |
| 9 · Smart Money hub | Overview + 5 sub-tabs | UI scaffolding only, no data | **MVP-1: Insiders tab only** using FMP (already paid). Others grayed |
| 10 · Screener | Custom filters + presets | Not built | **Defer to MVP-2** |
| 11 · Watchlist + Boards | Flat watchlist + themed boards | Exists standalone; need to nest under `/my` | Route rename + nav only |
| 12 · Settings | 5 panels | 3 panels exist (Personalization, Notifications, Billing partial) | Complete Personalization + Notifications + Billing upgrade/downgrade. Account + Data → MVP-2 |
| 13 · Public landing | Rebuild per spec §20 | Current page has the issues spec flags | Remove fake testimonials, replace "BUY TODAY", extend backtest window, add screenshots |
| 14 · Methodology | Trust page | Doesn't exist | **MVP-1 stub with core content** (data sources + 8 factors + "what we're not") — full version MVP-2 |
| 15 · Paid acquisition | Ads, affiliate | N/A | **MVP-2** |

### Explicitly deferred to MVP-2 (post-May-10)

- All 13 factor deep-dive pages (keep existing single-ticker page)
- Ask Lens chat (regulatory gate + red-team required)
- Smart Money hub Options / 13F / Congress / Shorts tabs (data budget)
- Screener
- Portfolio Benchmark / Risk / History tabs
- Audit-log retrospective + failure-mode tagging
- Settings Account + Data panels
- Mobile native app (web-responsive only for MVP-1)

---

## Mobile — honest scope

Full native Flutter mobile app is in the spec but realistically 3–4 weeks
of work minimum (re-theme + v2 alignment + platform polish + store
submission). **Cannot ship native mobile by May 10.**

**MVP-1 mobile approach: responsive web.** The existing web app is built
on Tailwind + next.js; making it work at 390px is polish, not rebuild.
Native Flutter app becomes MVP-2 (June track).

The spec's phone mockups map 1:1 to responsive web at mobile breakpoint.
Users can add to home screen for an app-like feel. Not ideal for the
launch story, but honest given timeline.

---

## Day-by-day rough plan (18 days)

| Days | Focus | Deliverable |
|---|---|---|
| 1–2 (Apr 23–24) | **IA restructure** | Sidebar 4 primary · route renames (`/my/*`, `/research/*`) · remove `/athena` references · auth redirect to `/markets` |
| 3 (Apr 25) | **Design token migration** | `#0F4F3A` → `#0F6E56` across globals.css + primitives · serif stack for Lens prose |
| 4–6 (Apr 26–28) | **Markets page rebuild** | Regime hero · indices · breadth · sectors · screeners · earnings week per spec §05 |
| 7 (Apr 29) | **Onboarding UI** | 4-step post-signup flow using existing migration 023 backend |
| 8 (Apr 30) | **Today's drop** | Move existing /dashboard to /research, polish signal cards |
| 9–10 (May 1–2) | **Ticker page re-theme** | Existing 8-factor page gets new accent + serif Lens |
| 11 (May 3) | **Inbox consolidation** | Merge /alerts + /notifications under /inbox with filter chips |
| 12 (May 4) | **Portfolio polish** | Holdings + Analysis sub-tabs only |
| 13 (May 5) | **Audit log UI** | List + signal detail using existing outcome cron data |
| 14 (May 6) | **Settings + Billing** | Upgrade/downgrade flow · plan change |
| 15 (May 7) | **Landing page fixes** | Remove fake testimonials · replace badges · add screenshots |
| 16 (May 8) | **Methodology stub** | Trust page with minimum content |
| 17 (May 9) | **Responsive mobile QA** | 390px audit every screen · fix breaks |
| 18 (May 10) | **Launch polish + ship** | Sentry · sitemap · email unsubscribe · final QA |

Each day is narrow enough to ship something working end-of-day. If any
day overruns, the work slips into a buffer weekend (May 4, May 11)
rather than pushing all subsequent days.

---

## What I need confirmed to start

Three decisions that block Day 1:

1. **Color migration confirmed?** Spec uses `#0F6E56` (slightly brighter
   than current `#0F4F3A`). Either (a) migrate globally, or (b) keep
   current and update the spec doc. Global migration is ~1 day; keeping
   current means spec/code divergence. Recommend **migrate** for
   consistency.

2. **Elite pricing confirmed at $99/mo?** Current constants show $45.
   Changing mid-build means re-keying Stripe prices, updating DB plan
   constraints, repricing users. Cleaner if confirmed now.

3. **Ask Lens removal confirmed held (deferred to MVP-2)?** Spec Section
   15 documents it fully but flags legal review as blocker. If you want
   it in MVP-1 we need to either (a) start legal review immediately or
   (b) ship stub that replies "Chat coming soon" to avoid advertising
   what doesn't exist.

---

## Principle going forward

**Minimal change.** Reuse every component, route, service, migration we
already have. Rename and restructure only where the spec is explicit.
Nothing greenfield unless the screen doesn't exist at all (Markets
rebuild, Methodology stub, Onboarding UI).

Ship commits small and frequent. Revert quickly if something breaks QA.
Defer aggressively to MVP-2 when a surface is underdefined relative to
the timeline.

---

**Referenced specs:**
[FINTREST_UX_SPEC.md](FINTREST_UX_SPEC.md) (canonical) ·
[MVP_PUNCHLIST.md](MVP_PUNCHLIST.md) (partially superseded — onboarding,
audit-log, alerts items still valid; pivot the rest to spec sections) ·
[DESIGN_TICKER_DEEP_DIVE.md](DESIGN_TICKER_DEEP_DIVE.md) (ticker detail
still tracks spec §08)
