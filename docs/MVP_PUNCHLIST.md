# Fintrest MVP Punch-list

**Audit date:** 2026-04-22
**Purpose:** Everything between the codebase as it stands today and a ship-able
paid product. Stop adding new scoring factors (Smart Money, §14.x) until this
list is clean.

---

## Headline

Foundation is solid. Shipping quality is not. Six real blockers, a production
polish layer, and mobile. The scoring engine has been over-invested in
relative to the flows that actually turn a signup into a paying user.

---

## Blockers (must ship before public launch)

### 1. Onboarding flow — **MISSING**
Users land on `/today` with zero context. No welcome, no preference capture,
no portfolio import prompt, no "what am I looking at" guided tour.

**What to build:** 3-step post-signup funnel — verify email → pick interests
(sector/cap/risk appetite) → optional portfolio CSV upload. Deferrable to
"skip for now" on each step.

**Effort:** ~2 days.

### 2. Audit log doesn't populate — **MISSING the cron**
`performance_tracking` table exists and the UI page exists, but nothing
computes signal outcomes. The whole explainability + trust story rests on
"here's every signal we've ever published, here's what happened next." Today
the table is empty.

**What to build:** Weekly job that walks closed signals (entry/stop/target
triggered or horizon expired), writes outcome row, invalidates Redis.

**Effort:** ~1 day. High ROI — this is the credibility lever.

### 3. Email delivery has no cron — **HALF**
Morning briefing + weekly newsletter templates exist. Dispatch is manual via
admin endpoints. Alerts table exists but there's no evaluator that fires them.

**What to build:**
- `IHostedService` for morning briefing @ 6:30 AM ET
- `IHostedService` for weekly newsletter @ Sun 6 PM ET
- `AlertEvaluatorJob` that runs every ~15 min, checks conditions, sends via
  existing ACS email path

**Effort:** ~1 day.

### 4. Billing flow gaps — **HALF**
Stripe checkout + webhooks + portal are wired. But:
- No upgrade/downgrade flow inside the app (only new sub or cancel)
- No free trial logic
- Pricing page needs verification that CTA actually routes to live checkout

**What to build:** `/settings/billing` with "change plan" that calls the
existing checkout endpoint with proration. Optional 7-day trial flag at
checkout-session creation.

**Effort:** ~1 day.

### 5. Compliance footers — **UNKNOWN, must verify**
"Educational content only" + "Past performance" footers are rule #6 in
CLAUDE.md and required per the legal model. I haven't verified every signal
surface renders them. One missing surface is an SEC/FTC exposure.

**What to do:** Grep every signal-render component + email template, confirm
footer. Add a smoke test.

**Effort:** ~4 hours.

### 6. Chat rate limiting per plan — **MISSING**
Ask Lens has no per-plan throttle. Free users can spam Claude calls. Cost
exposure grows linearly with free signups. User's budget constraint makes
this load-bearing.

**What to build:** Redis counter per `(user_id, day)`, plan-aware cap (Free
10/day, Pro 100/day, Elite unlimited). 429 with clear upgrade message.

**Effort:** ~0.5 day.

**Blocker total: ~6 days.**

---

## Production polish (should ship with MVP)

| Item | Why it matters | Effort |
|---|---|---|
| Sentry wired (backend + web) | Can't diagnose production errors without it | 2h |
| API rate limiting on public endpoints | Prevents cost blowouts from scraping | 4h |
| `sitemap.xml` + `robots.txt` | SEO — indexing starts day 1 | 2h |
| OpenGraph image per page type | Link previews in Twitter / LinkedIn | 3h |
| Empty states + error boundaries on all /app routes | Currently many routes white-screen on API failure | 4h |
| Legal page copy review with a lawyer | SEC/FTC exposure on "educational publisher" framing | external |
| Unsubscribe links in all emails | CAN-SPAM compliance | 2h |
| Email verification enforced before app access | Prevents throwaway-account abuse | 3h |

**Polish total: ~2 days of engineering + legal time.**

---

## Distribution (post-MVP but needs scaffolding NOW so content accrues)

This is the real moat per the earlier viability assessment. None of it exists.

| Item | Notes |
|---|---|
| Blog CMS / static content | Directory `(marketing)/blog/[slug]` exists; needs MDX or CMS. MDX is zero-cost. |
| Content-at-scale | Auto-generate a "Why we scored MSFT 87 today" post per published signal. One-day build, perpetual content flywheel. |
| SEO keyword targeting | Claim the "why did X get upgraded today" and "is X a buy today" long-tail queries |
| Email list signup on marketing pages | Lead magnet — "Today's signals in your inbox" opt-in |
| Press kit + social buttons | Low effort, high one-time value |

Estimate: **~3 days to build the scaffolding.** Content creation is ongoing,
but the auto-generated "today's signal explained" post per day gives a
content flywheel with zero marginal cost.

---

## Mobile — honest assessment

| | Status |
|---|---|
| Flutter scaffold | Compiles (unverified) |
| Auth via Supabase | Wired |
| Screens defined | Login, Signup, Dashboard, Picks, Athena, Portfolio, Alerts, Stock Detail, Markets, Congress, Insiders, Notifications |
| API client | Talks to backend |
| Theme | **v1 "warm parchment"** — not v2 Forest/Rust. Misaligned with web. |
| Push notifications | Firebase env wired, zero actual integration |
| Deep linking | None |
| Offline / local cache | None |
| Build/release config | Not audited — iOS signing, Play Store setup unknown |

**Realistic mobile-to-MVP effort: 3–4 weeks.** That's re-theming to v2,
building onboarding, implementing push, testing on both platforms, setting up
release pipelines, beta-testing.

---

## Two paths

### Path A: Web-only MVP, launch in ~2 weeks
- Week 1: Close the 6 blockers + production polish.
- Week 2: Distribution scaffolding + content flywheel.
- Mobile ships as a Phase 2 MVP, 4 weeks later.
- **Pros:** Shortest path to revenue. Real users on real web app generate
  feedback that mobile can incorporate rather than guess.
- **Cons:** Loses the "available on iOS/Android" marketing hook at launch.

### Path B: Web + mobile together, launch in ~5–6 weeks
- Week 1–2: Web MVP blockers (same as Path A).
- Week 3–5: Mobile re-theme, onboarding, push, platform polish, beta.
- Week 6: Store submission (iOS review is the long pole — 1–3 day wildcard).
- **Pros:** Launch with the "finance app on your phone" story.
- **Cons:** 3x the time before any revenue. Mobile in current state is not a
  few-days polish; it's a proper build.

---

## Recommendation

**Path A.** Ship web in 2 weeks, start collecting revenue and audit-log
track record. Mobile gets built in Phase 2 against real user feedback rather
than assumed requirements.

The mobile "launch hook" matters less for a research product than for a
consumer social app — retail investors increasingly research on desktop/web
and execute on broker apps. Fintrest isn't replacing the broker; it's
feeding the decision. Web-first is the right surface.

If mobile must ship at launch: Path B, and accept the 5–6 week timeline.
Don't try to half-ship mobile in Path A's timeline; the v1/v2 theme
misalignment alone is a week of work.

---

## What we stop doing (until post-MVP)

- Smart Money Phase 1–4 (EDGAR + 13F + FMP congressional + FINRA short + UW options)
- Macro regime classifier (even though it's free — not an MVP blocker)
- §14.x scoring roadmap (§14.3 earnings dynamics, §14.4 gates, §14.5 macro deepening)
- IC tracking backfill
- Backtest harness

All parked. All specified. Picked up after the MVP ships and audit-log
credibility starts accumulating.
