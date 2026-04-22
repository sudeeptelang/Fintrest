# MVP-1 Launch Runbook

**Target:** May 10, 2026 web ship · May 13–17 iOS public availability
**Scope:** docs/FINTREST_UX_SPEC.md + docs/MVP_FINAL_PLAN.md

This runbook covers the last-mile ops work for launch: pre-flight QA
checklist, iOS Capacitor + App Store Connect steps (requires macOS),
Sentry / analytics wiring, and post-launch monitoring.

---

## Pre-flight QA checklist (Day 10 — responsive + browser + flow)

Run each flow end-to-end on desktop (≥1280px) + mobile breakpoint (390px).
Chrome, Safari, Firefox. Safari is the iOS test rehearsal; prioritise it.

### Auth + onboarding
- [ ] New signup → email confirm → redirect to /onboarding
- [ ] Onboarding 4 steps complete → lands on /research
- [ ] Onboarding skip → lands on /markets, backend `onboarding_skipped=true`
- [ ] Logout → /auth/login
- [ ] Forgot password → reset email delivered → new password works
- [ ] OAuth (Apple + Google) if configured

### Navigation (4-pillar IA)
- [ ] Sidebar: Markets · Research · My stuff · Audit log
- [ ] Sub-items reveal when parent is active
- [ ] Every link resolves (no 404s)
- [ ] /markets is the default landing for authed users
- [ ] /inbox shows filter chips + synthesized feed
- [ ] /methodology renders + links from compliance footer

### Research + ticker
- [ ] /research shows today's drop
- [ ] Ticker detail page renders with 8-factor radar + Lens thesis
- [ ] Trade plan levels + R/R display
- [ ] Lens thesis uses serif font (Georgia stack)
- [ ] "In research set" badge shows (not "BUY TODAY")

### Audit log
- [ ] /audit shows list with filter chips
- [ ] Tap any signal → /audit/[signalId] detail page renders
- [ ] Factor profile at issue shows 7 factors
- [ ] Outcome pill colored correctly (target_hit green, stop_hit red)

### Portfolio + alerts + billing
- [ ] /my/portfolio lists holdings (Free + Pro tier tested)
- [ ] /inbox/create fires to /alerts/create
- [ ] Alert creation writes row; evaluator fires within 15 min during market hours
- [ ] /settings billing: Pro user sees "Manage subscription" → Stripe portal
- [ ] Free user sees "Upgrade" CTA with $29/$99 pricing
- [ ] Stripe checkout flow completes → plan upgrades in DB

### Compliance footers
- [ ] Every app route shows the global ComplianceFooter
- [ ] Every email template includes the Footer() block
- [ ] /disclaimer, /risk-disclosure, /terms, /privacy all load

### Responsive 390px
- [ ] Hero + thesis + trade plan stack correctly on mobile
- [ ] Markets regime strip collapses to 1-col on mobile
- [ ] Top movers card goes 3-col → 1-col vertical stack
- [ ] Audit log table horizontally scrolls (overflow-x-auto)
- [ ] Sidebar becomes drawer on mobile with menu toggle
- [ ] Onboarding steps fit in 390px viewport

---

## Day 11: Capacitor iOS wrap (requires macOS + Xcode)

```bash
cd web

# Install Capacitor
npm install --save @capacitor/core
npm install --save-dev @capacitor/cli @capacitor/ios

# Initialize (capacitor.config.ts already committed)
npx cap add ios

# Next.js static export — set output: "export" in next.config OR use
# the existing remote-URL mode where capacitor.config.server.url
# points at production fintrest.ai
npm run build

# Sync build output into ios/ project
npx cap sync ios

# Open Xcode
npx cap open ios
```

### Xcode steps
1. Set team + signing identity (Apple Developer Program required)
2. Bundle ID: `ai.fintrest.app` (matches `capacitor.config.ts`)
3. Set deployment target: iOS 15+
4. Add app icons: 1024×1024 primary + per-device sizes in Assets.xcassets
5. Add launch screen using the forest #0F6E56 background
6. Archive → upload to App Store Connect

### App Store Connect listing (Day 12)
- App name: **Fintrest**
- Subtitle: **Stock research you can follow**
- Primary category: Finance · Secondary: News
- Privacy labels (critical): declare every data type in the app
  - Data linked to user: email, name, subscription state, holdings
    (if portfolio imported)
  - Data not linked to user: app analytics (if Sentry enabled)
  - Tracking: none (no third-party ad SDKs)
- Age rating: 12+ (frequent financial information)
- Review notes for Apple:
  - "Fintrest.ai publishes educational stock research. Users sign in
    and can read Free-tier content in-app; paid subscriptions are
    managed on the web (reader-app pattern, guideline 3.1.3(a))."
  - Demo account: create one with `onboarding_completed_at=now` so
    reviewer skips the funnel
- Export compliance: no proprietary encryption → ITSAppUsesNonExemptEncryption=false

---

## Day 13: launch polish

### Sentry (error tracking)
```bash
cd web
npm install --save @sentry/nextjs
npx @sentry/wizard -i nextjs
```
Sentry DSN lives in `SENTRY_DSN` env var; tunnel through a Next.js
route to bypass ad-blockers. Server-side + client-side both wired by
the wizard.

### Email unsubscribe
Current email templates have `/unsubscribe` link in the footer
(EmailTemplates.cs line 249) but no backend endpoint. Add:
- `GET /api/v1/auth/unsubscribe?token={jwt}` → one-click flip of all
  three `Receive*` booleans to false, returns a plain HTML confirmation.
- Token is a 30-day JWT with claims `{ sub: userId, purpose: "unsubscribe" }`
- CAN-SPAM: must honor within 10 business days; one-click flip is
  immediate.

### Sitemap + robots
Both shipped Day 13 via `app/sitemap.ts` + `app/robots.ts`. Next.js
auto-generates `/sitemap.xml` and `/robots.txt`. Set
`NEXT_PUBLIC_SITE_URL` env var to the production hostname.

### Newsletter top-movers embed
EmailTemplates.MorningBriefing already renders a top-signals table.
For Day 13 polish, append a "Top movers today" section using the same
three-column layout (gainers / losers / unusual volume) as the web
Markets page. Data source: `AlertDispatcher` already has access to
the screener via `db.Stocks`; add a helper that returns the same 3×5
shape the web TopMovers uses.

---

## Day 14: ship day

### Web ship (morning)
1. Final build + deploy to Vercel (`npm run build` locally to verify)
2. Run DB migrations 022 (drop_chat_sessions) + 023 (user_onboarding)
   against production Supabase
3. Update Stripe Dashboard — new Elite SKU at $99/mo + $999/yr if
   not already created; update `appsettings.json` Stripe Price IDs
4. Verify regime endpoint returns null gracefully (expected — macro
   classifier is MVP-2)
5. Smoke-test the full flow from a fresh anon browser

### iOS submit (afternoon)
1. Archive the iOS app in Xcode
2. Upload to App Store Connect
3. Submit for review with reviewer notes + demo account
4. Apple review: 1–3 days typical, up to 1 week for new apps
5. TestFlight internal build available immediately for team testing

### Post-launch monitoring (Days 15+)
- Sentry error rate < 0.5% of sessions
- Signup conversion on `/pricing` → checkout
- Signal outcome cron: verify nightly run populates `performance_tracking`
  (check `job_state` table for last_success_date)
- Morning briefing job: verify first delivery at 6:30 AM ET
- Alert evaluator: verify 15-min cadence during market hours

---

## Rollback plan

If the launch ships with a blocking bug:

1. Vercel: redeploy previous commit (`vercel rollback` or via dashboard)
2. Stripe: any checkout sessions created are idempotent; no cleanup
3. DB migrations 022 + 023 have rollback SQL files — apply if needed
4. iOS: Apple expedited review is available for critical issues;
   submit a new build with the fix

---

**Referenced:**
[FINTREST_UX_SPEC.md](FINTREST_UX_SPEC.md) ·
[MVP_FINAL_PLAN.md](MVP_FINAL_PLAN.md)
