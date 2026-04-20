# Fintrest.ai — Compliance & Copy Rewrite (v1.0)

> **Source:** DSYS Inc. drafting aid, April 2026.
> **Regulatory frame:** SEC Marketing Rule (Rule 206(4)-1) · FTC 16 CFR Part 255 · State UDAP statutes.
> **Scope:** Marketing pages + app chat intro + 2 legal pages.
> **Status:** Implementation spec — hand to developer, one PR.
>
> **Important:** This file is a drafting aid, not legal counsel. DSYS Inc. counsel must review `/disclaimer` and `/risk-disclosure` before publication.

---

## 1. The problem & the reframe

The live homepage reads like a stock-picking service ("Pick Winning Stocks Before The Market Does," "AI advisor," "actionable signals," "act with confidence"). A footer disclaimer saying "not financial advice" doesn't save you when the top of the page contradicts it.

Under SEC Rule 206(4)-1, the words and framing used by a non-RIA firm matter as much as what the firm actually does. Advisor-coded language — "picks," "advisor," "winning stocks," prominent hypothetical-performance numbers without inline disclosure — sits in the highest-risk enforcement band.

**The fix is positioning, not more disclaimers.** Fintrest is a **research quality-assurance layer**, not a stock picker. Every ticker the engine touches is stress-tested against a 7-factor model; the platform publishes what passed, exactly why, and the full audit trail — including losers. The user decides what to do. Lens (the AI assistant, renamed from Athena) explains the research and never recommends a trade.

This framing is legally safer, positionally stronger against Finviz/TradingView/generic ChatGPT, and more accurate to what Fintrest does.

---

## 2. Global terminology map (site-wide find & replace)

Apply this first — it propagates through most specific rewrites below. Cover every page, email template, push-notification string, Lens prompt, and the iOS/Android app.

| Replace | With |
|---|---|
| Athena | **Lens** |
| pick / picks / stock picks | signal / research item / setup |
| winning stocks | high-scoring setups · stocks that passed the bar |
| top picks | today's research · today's signal drop |
| Athena's Picks | Lens Research · Today's Research |
| AI advisor | Lens research layer · research assistant |
| advisor | research layer · analyst · research assistant |
| trade zones | reference levels |
| actionable signals | stress-tested research · QA'd setups |
| act with confidence | review the research |
| we tell you what to do | we show you what passed the test |
| pick winning stocks | surface high-scoring setups |
| before the market does | before the open |
| win rate | hit rate (backtested) |
| winning trades | signals that reached target |
| trade ideas delivered | research drop |
| recommended stocks | signals the engine surfaced |
| buy recommendation | BUY TODAY signal (research) |
| AI recommends | the model flagged · Lens surfaced |
| invest in X | review the research on X |

**The Lens test.** If a phrase works in *"The research says __, and you decide,"* it's safe. If it works in *"Our advisor tells you to __,"* rewrite it.

---

## 3. Homepage — Top nav + hero

### Top navigation bar

| Element | Current | Recommended |
|---|---|---|
| Nav link 1 | Features | Research engine |
| Nav link 2 | How It Works | How it works |
| Nav link 3 | Performance | **Audit log** |
| Nav link 4 | Pricing | Pricing |
| Button (left) | Log in | Log in |
| Button (right) | Get Started Free | Start free |

### Hero

| Element | Current | Recommended |
|---|---|---|
| Badge above H1 | Live signals updated daily | Research layer · Updated every morning before the open |
| **H1** | Pick Winning Stocks Before The Market Does | **Every stock idea, stress-tested before the open.** |
| H1 alternative | — | The research layer for self-directed traders. |
| Subhead | AI-powered swing trade discovery with explainable signals. Transparent scoring, daily research delivered before the open. No black boxes. | Fintrest runs 500+ US stocks through a 7-factor research engine every morning. You see which setups passed the test, exactly why they passed, and the full audit trail — including the losers. Research, not recommendations. |
| Primary CTA | Start Free Today | Start free |
| Secondary CTA | How it works | See how the engine works |
| Trust line | No credit card required · Setup in 30 seconds | No credit card required · 30-second setup · Cancel anytime |

> 🔴 **CRITICAL — HERO H1.** The current H1 contains three compliance problems in six words: (1) "Pick" implies recommendation; (2) "Winning Stocks" is an implied performance guarantee; (3) "Before The Market Does" is a market-timing claim. This rewrite is the single highest-priority change on the site.

---

## 4. Homepage — Lens intro + 4-step flow

Rename Athena → Lens. Step 4 ("Trade") is a compliance risk — rename to "Review."

### Section intro

| Element | Current | Recommended |
|---|---|---|
| Module heading | Athena AI | **Lens** |
| Tagline | The editorial brain at the center | The research layer at the center |

### Step 1 — Scan

| Line | Current | Recommended |
|---|---|---|
| 1 | 500+ stocks scanned daily | 500+ US stocks scanned every morning |
| 2 | Prices · fundamentals · news | Prices · fundamentals · news · options flow |
| 3 | Regime-aware · intraday drift | Regime-aware · intraday drift correction |

### Step 2 — Score

| Line | Current | Recommended |
|---|---|---|
| 1 | 7-factor quant scoring | 7-factor quant scoring · 0–100 per factor |
| 2 | Cross-sectional percentile rank | Cross-sectional percentile rank within sector |
| 3 | Bull / Bear weight sets | Regime-gated weights · bull · bear · chop |

### Step 3 — Narrate

| Line | Current | Recommended |
|---|---|---|
| 1 | Athena thesis · plain English | Lens thesis · plain English |
| 2 | Setup type · Buy the Dip · Breakout | Setup type · dip · breakout · trend continuation |
| 3 | Congress · Insider · Ownership | Catalysts · congress trades · insider · ownership |

### Step 4 — RENAME (biggest change)

| Line | Current | Recommended |
|---|---|---|
| Step title | **4. Trade** | **4. Review** |
| 1 | Entry · Stop · Target · R:R | Reference levels: entry · stop · target · R:R |
| 2 | Real-time alerts | Real-time research alerts |
| 3 | Portfolio factor profile | Portfolio factor profile · you decide what to do |

### Section strapline

| Current | Recommended |
|---|---|
| Know what to do — not just what's happening. | See what passed the test — and exactly why. |

---

## 5. Homepage — Features grid (6 cards)

### Section heading

| Element | Current | Recommended |
|---|---|---|
| Eyebrow | Features | Research engine |
| Heading | Everything you need to trade smarter | A research layer for self-directed traders |
| Subhead | Data-driven signals with full transparency. Every score is explainable, every pick is auditable. | Data-driven research with a full audit trail. Every score is explainable, every signal is traceable, every outcome is logged — losers included. |

### Card 1 — Explainable signals
- **Current title:** AI-Explained Signals → **new:** Explainable signals
- **New body:** Every signal carries a plain-English Lens explanation of why it ranked and which factors drove the score. No black boxes. You can audit every decision the engine made.

### Card 2 — 7-factor scoring (keep title)
- **New body:** Momentum, relative volume, news catalysts, earnings, sentiment, trend strength, and risk — each scored 0–100 and weighted by market regime. The full breakdown is published for every signal.

### Card 3 — Before-the-open research drop
- **Current title:** Before-Market Alerts → **new:** Before-the-open research drop
- **New body:** The morning's research lands in your inbox or on your phone before the bell. Email, SMS, or push — you choose the channel and the quiet hours.

### Card 4 — Reference levels (RENAME — high risk)
- **Current title:** Trade Zones → **new:** Reference levels
- **New body:** Every signal includes reference entry, stop, and target levels derived from the setup's technical structure and volatility. These are research outputs to help you stress-test a trade idea — **not instructions to trade.**

### Card 5 — Public audit log (strengthen)
- **Current title:** Performance Tracking → **new:** Public audit log
- **New body:** Every signal's outcome is logged and published — hit rate, average move, max drawdown, losers included. No highlight reel. No hidden history. The audit trail is public.

### Card 6 — Sector heatmap (keep title)
- **New body:** Sector-level relative strength at a glance — which sectors are leading, which are bleeding, and how the regime is rotating.

---

## 6. Homepage — How it works (4 steps)

### Section heading

| Element | Current | Recommended |
|---|---|---|
| Heading | From raw data to actionable signals | From raw data to stress-tested research |
| Subhead | A transparent, four-step process that turns market data into ranked trade ideas — delivered to you every morning. | A transparent four-step process that runs every morning before the open. Market data goes in; a ranked, stress-tested research set comes out. |

### Step 01 — We scan the market (keep title)
Every morning the engine ingests price data, fundamentals, news sentiment, and alternative data across 500+ US tickers.

### Step 02 — The 7-factor bar
- **Current title:** Signals Are Scored → **new:** The 7-factor bar
- The 7-factor rule engine scores each candidate 0–100 across momentum, volume, catalysts, earnings, sentiment, trend, and risk. No AI guesswork — a structured, weighted, regime-gated test. Only setups above the bar pass to the research set.

### Step 03 — Lens explains why
- **Current title:** AI Explains Why → **new:** Lens explains why
- Lens translates the structured score into plain English. You see which factors drove the score, what the setup is, and where the risks sit. No jargon, no black box, no recommendation — just the research.

### Step 04 — You review the research (RENAME)
- **Current title:** You Get Alerted → **new:** You review the research
- The morning's research set lands in your inbox, phone, or dashboard before the open. You decide whether to act on it. Fintrest publishes research — your trades are yours.

---

## 7. Homepage — Performance section (full rewrite)

> 🔴 **SEC Marketing Rule — hypothetical performance.** Presenting "73% Avg Win Rate" and "12.4% Avg Return / Trade" in huge type with a one-sentence footnote disclaimer is exactly what the 2021 Marketing Rule tightened. Even though Fintrest is not an RIA, FTC UDAP law reaches the same conduct under "deceptive performance claims." Fix before launch.

### Section heading

| Element | Current | Recommended |
|---|---|---|
| Eyebrow | Performance | Audit log |
| Heading | Signals you can verify | Every signal, audited publicly |
| Subhead | We track every signal's outcome. Full transparency — no cherry-picking, no hidden losses. | Every signal the engine publishes is logged and its outcome is tracked — winners and losers. The numbers below are backtested; live performance since launch is shown separately and never blended with backtest results. |

### Required inline badge row (same size as the numbers, immediately above metrics)

```
HYPOTHETICAL · BACKTESTED · JAN 2024 – MAR 2026 · NOT LIVE TRADING RESULTS
```

### Metric relabels

| Metric | Current | Recommended |
|---|---|---|
| 1 | 73% · Avg Win Rate | 73% · Backtested hit rate (signals that reached target before stop) |
| 2 | 12.4% · Avg Return / Trade | 12.4% · Backtested avg move per signal (target–entry, excluding slippage & fees) |
| 3 | 2,400+ · Signals Tracked | 2,400+ · Signals in backtest window |
| 4 | <3% · Avg Drawdown | <3% · Backtested avg drawdown (peak-to-trough per signal) |

### Replacement disclosure block (directly below metrics, NOT in footer)

> The numbers above are hypothetical backtested results generated by running the current scoring engine over historical data for January 2024 through March 2026. They do not represent actual trading, actual user accounts, or actual outcomes any user experienced. No user was trading these signals during the backtest window.
>
> Backtests do not account for real-world frictions, including slippage, spread, commissions, taxes, missed fills, borrow costs, or capacity constraints. Real-world results from following the same signals would be materially different.
>
> Past performance — including backtested performance — does not guarantee future results. Trading stocks involves substantial risk of loss, including the loss of your entire investment.

### Post-launch split-display requirement

Once live signals exist, show two side-by-side blocks — **never blended**:

**LIVE SIGNALS (REAL)**
- Since: [launch date]
- Live hit rate: XX%
- Avg live move per signal: X.X%
- Sample size: N signals
- No slippage adjustment applied.

**BACKTESTED (HYPOTHETICAL)**
- Window: Jan 2024 – Mar 2026
- Backtested hit rate: 73%
- Backtested avg move: 12.4%
- Sample size: 2,400+ signals
- Hypothetical — no user was trading these.

---

## 8. Homepage — Testimonials (add required disclosures)

Under SEC Rule 206(4)-1(b) (if any endorser is compensated) and FTC 16 CFR § 255 (all commercial endorsements), every testimonial needs a disclosure **immediately adjacent to the testimonial itself** — not a footnote.

### Section heading

| Element | Current | Recommended |
|---|---|---|
| Eyebrow | Trusted by Traders | What Fintrest users say |
| Heading | What our users are saying | What users say about the research |

### Required disclosure (append to every testimonial card)

> Testimonial from a Fintrest.ai user. **[Compensated — this user received {discount / free access / payment} in exchange for this testimonial]** OR **[Not compensated — this user was not paid for this testimonial]**.
>
> Individual results vary. This testimonial reflects one user's experience and is not representative of all users. Past results do not guarantee future results.

### Testimonial copy tweaks

- **Marcus T.** — swap "signal explanations actually make me a better trader" for: *"The Lens explanations walk me through what the model saw and why — the research is the value, not just the list."*
- **Sarah K.** — swap "every pick tells me WHY" for: *"every signal tells me why…The research drop before the open is the part I never miss."*
- **James L.** — append: *"It's the quality-assurance layer I used to build myself in a spreadsheet."*

### Operational to-do
1. Before publishing, confirm compensation status of each testimonial (paid / free sub / unpaid) and fill in the correct disclosure variant.
2. Keep a file with (a) signed release from each user, (b) evidence the testimonial reflects actual use, (c) the date collected. SEC and FTC both ask for this.
3. If a testimonial becomes stale (user no longer uses product, material product changes), remove it.

---

## 9. Homepage — Pricing

### Section heading

| Element | Current | Recommended |
|---|---|---|
| Subhead | Start free. Upgrade when you're ready for more signals, earlier alerts, and deeper analysis. | Start free. Upgrade when you want the full research board, unlimited Lens, and the full audit log. |

### Free plan

| Bullet | Current | Recommended |
|---|---|---|
| Tagline | See what the engine sees. Get a taste of the product. | See what the engine sees. A daily taste of the research. |
| 2 | Athena thesis on the top 3 | Lens thesis on the top 3 |
| 3 | 5 stock detail views / day | 5 research pages / day |
| 5 | Morning briefing email | Morning research digest |
| 6 | Public performance page | Public audit log access |

### Pro plan (contains the single most dangerous word)

| Bullet | Current | Recommended |
|---|---|---|
| Tagline | The full product. Everything the self-directed retail trader needs. | The full research layer. Everything a self-directed trader needs to stress-test ideas every morning. |
| 1 | Full signal board (50+) with lens chips | Full signal board (50+) with Lens filter chips |
| 2 | Unlimited Athena thesis | Unlimited Lens thesis |
| 3 | Ask Athena (unlimited chat) | Ask Lens — unlimited research chat |
| 4 | Unlimited stock detail pages | Unlimited research pages |
| **6 (CRITICAL)** | Portfolio import + **AI advisor** (3 portfolios) | Portfolio import + **Lens research layer** (3 portfolios) |
| 7 | Real-time alerts (push + email) | Real-time research alerts (push + email) |
| 9 | Portfolio factor profile + verdict mix | Portfolio factor profile + signal-mix breakdown |

> 🔴 **The word "advisor"** is a statutorily-defined term under the Investment Advisers Act of 1940. Using it in product copy — even casually in a bullet — signals the firm is holding itself out as an RIA. This bullet must change before launch.

### Elite plan

| Bullet | Current | Recommended |
|---|---|---|
| Tagline | Institutional-grade. Athena tuned to your portfolio. | Institutional-grade research. Lens tuned to your portfolio. |
| 3 | Athena Personalized — thesis tuned to your holdings | Lens Personalized — thesis tuned to your holdings and risk profile |
| 4 | Weekly JPM-style portfolio PDF report | Weekly portfolio research PDF (JPM-style layout) |
| 5 | Backtest runner (historical what-if on any lens) | Backtest runner — historical what-if on any Lens filter |
| 6 | Priority Athena (no rate limits) | Priority Lens — no rate limits |
| 7 | Early access to new features | Early access to new research modules |

---

## 10. Homepage — Bottom CTA · Footer · Compliance strip

### Bottom CTA band

| Element | Current | Recommended |
|---|---|---|
| Heading | Ready to trade with an edge? | Ready to see what passed the test? |
| Subhead | Join thousands of traders who start their day with Fintrest.ai signals. Free to start, no credit card required. | Join self-directed traders who start their day with Fintrest research. Free to begin. No credit card required. |
| Primary CTA | Get Started Free | Start free |
| Secondary CTA | View Today's Picks | See today's research |

### Footer tagline

| Current | Recommended |
|---|---|
| AI-powered swing trade discovery. Explainable signals, transparent scoring, daily research delivered before the open. | The research layer for self-directed traders. Explainable signals, transparent scoring, a public audit log. Research, not recommendations. |

### Footer — column rename

| Link | Current | Recommended |
|---|---|---|
| Product 1 | Athena's Picks | Today's Research |
| Product 3 | Performance | Audit Log |
| Legal (new) | — | Not Financial Advice |
| Legal (new) | — | Regulatory Status |

### Footer disclaimer — full replacement block

> Fintrest.ai is a stock research and data-analytics platform operated by DSYS Inc. We are not a Registered Investment Adviser, a broker-dealer, a financial planner, or a licensed portfolio manager. We do not manage money, hold customer funds, or execute trades.
>
> Nothing on this website, in any email, in any alert, or in any chat with Lens constitutes investment advice, a personal recommendation, a solicitation to buy or sell any security, or an offer to enter into an investment advisory relationship. All signals, scores, theses, reference levels, and commentary are educational research outputs derived from public market data. They do not take your personal financial situation, objectives, or risk tolerance into account.
>
> Past performance — including backtested and hypothetical performance — does not guarantee future results. Trading stocks involves substantial risk of loss, including the total loss of your investment. You are solely responsible for your own investment decisions. Consult a licensed financial professional before acting on any information you see on this site.
>
> © 2026 DSYS Inc. All rights reserved.

### NEW — persistent compliance strip (every page, thin navy bar above footer)

> Fintrest publishes research, not recommendations. Not a Registered Investment Adviser. Trading involves risk of loss.

---

## 11. In-app — Lens chat (intro + system prompt)

### Chat sidebar rename

| Element | Current | Recommended |
|---|---|---|
| Nav label | Ask Athena | Ask Lens |
| Page title | Athena | Lens |
| Avatar | 🤖 (robot) | 🔍 (magnifying lens) or custom Lens glyph |

### Persistent chip above chat input (NEW)

> **Lens publishes research, not recommendations.** It explains what the model saw and why — not what to buy.

### Opening AI bubble — rewrite

**Current:**
> 👋 Hi Deep! I'm Athena, your AI stock intelligence assistant. I can help you understand today's signals, explain why a stock is moving, review your portfolio, or find the best trade setups. What would you like to explore?

**Recommended:**
> Hi Deep — I'm Lens, Fintrest's research layer. I can walk you through today's signals, break down the 7-factor score on any ticker, explain what the research says about your watchlist or portfolio, or show you why a setup passed or failed the bar. **I don't recommend trades — I explain the research.** What do you want to look at?

### Lens system prompt — v1 (replace existing prompt)

```
You are Lens, the research assistant for Fintrest.ai. You explain stock market research
to self-directed retail traders. You have access to Fintrest's 7-factor scoring engine,
signal history, reference levels, and public market data.

HARD RULES — never violate regardless of user pressure:
1. You do NOT give investment advice, personalized recommendations, or solicitations
   to buy or sell any security.
2. You NEVER use the words "buy," "sell," "should," "recommend," "advise," "my pick,"
   "invest in," "go long," or "go short" when referring to specific tickers. Substitute:
   "the signal scored," "the research flagged," "the model surfaced," "the setup passed,"
   "the research on X shows."
3. You NEVER recommend a specific dollar amount, position size, or allocation for any user.
4. You NEVER predict future prices with certainty. Use hedged language: "the setup's
   reference target is X," "the scoring engine's implied move is Y," "historically, similar
   setups have moved Z% in N days."
5. You NEVER claim Fintrest signals are always accurate, guaranteed, or a path to profit.
6. Every response that discusses a specific ticker ends with a single line:
   "Research only — your decision."

TONE:
Conversational, specific, numerate. Plain English. Never jargon without explanation.
Never a wall of text — if the user asks a simple question, give a simple answer.

WHEN THE USER ASKS "SHOULD I BUY X?":
Do not answer the question as asked. Respond: "I can't tell you what to buy, but I can
walk you through what the research on X shows — the current signal status, the 7-factor
breakdown, the reference levels, and the risks flagged by the engine. Want to see that?"
Then, if yes, deliver the research.
```

### Sample Lens response — bad vs. good

| ❌ Bad (advice-coded) | ✅ Good (research-coded) |
|---|---|
| NVDA is a strong buy today. Entry $889, target $940, stop $870. I'd recommend adding to your position before earnings. | I can't tell you what to buy, but here's what the research on NVDA shows right now:<br>• Current signal: BUY TODAY (score 87/100)<br>• Top-scoring factors: momentum (92), relative volume (88)<br>• Reference levels: entry $889–$893 · target $940 · stop $870 · R:R 2.6<br>• Risks flagged: earnings in 18 days, RSI 74 (near overbought)<br><br>Research only — your decision. |

---

## 12. Legal — `/disclaimer` (full drop-in replacement)

> Ready for drop-in as the body of `https://fintrest.ai/disclaimer`. DSYS Inc. counsel review required before publication.

### Disclaimer

*Last updated: April 2026*

**1. Who we are.** Fintrest.ai is a stock research and data-analytics platform operated by DSYS Inc. ("Fintrest," "we," "us," "our"). We are a technology company, not a financial institution. We are **not** a Registered Investment Adviser under the Investment Advisers Act of 1940, **not** a broker-dealer registered with the SEC or FINRA, **not** a Commodity Trading Advisor, and **not** a licensed financial planner. We do not custody customer funds, do not execute trades, and do not manage portfolios.

**2. What Fintrest publishes.** Fintrest publishes educational research outputs, including: quantitative signals scored 0–100 across a 7-factor model; plain-English theses written by the Lens research layer; reference entry, stop, and target levels derived from technical structure; sector-level heatmaps; historical performance statistics and audit logs; market commentary; and catalysts-based feeds (earnings, insider trades, congressional filings, ownership changes).

All content is produced from public market data. It is informational and educational. It does not take into account the personal financial situation, investment objectives, risk tolerance, tax position, or constraints of any individual user.

**3. Nothing on this platform is investment advice.** Nothing on Fintrest.ai — signals, scores, Lens theses, reference levels, morning digests, alerts, the audit log, blog posts, chat responses, emails, SMS, push notifications — constitutes:
(a) investment advice of any kind;
(b) a personal recommendation to buy, sell, hold, or refrain from buying any security;
(c) a solicitation, offer, or inducement to enter into an investment advisory, brokerage, or other financial-services relationship;
(d) an offer to sell or solicitation to buy any security in any jurisdiction;
(e) tax, legal, accounting, or financial-planning advice.

The designations "BUY TODAY," "WATCH," "AVOID," or similar labels are research classifications generated by an automated scoring model. They are not recommendations to any user to take any action. Users must not interpret any signal, score, thesis, or reference level as a personal instruction.

**4. You are solely responsible for your decisions.** You are solely responsible for any investment, trading, or financial decisions you make. Before acting on any information obtained from Fintrest.ai, you should: (a) consider your own financial situation, objectives, and risk tolerance; (b) conduct your own research; and (c) consult a licensed investment professional, tax advisor, and/or attorney.

**5. Performance disclosures.** Any historical performance figures shown on Fintrest.ai — hit rates, average returns per signal, win rates, drawdowns, Sharpe ratios — are one of two kinds, labeled accordingly:

(a) **Backtested / hypothetical performance:** results generated by running the current scoring engine over historical data. These do not represent actual trading, actual user outcomes, or any real money at risk. They do not include slippage, bid-ask spread, commissions, taxes, borrow costs, missed fills, or capacity constraints. Real-world trading would produce materially different results.

(b) **Live post-launch performance:** actual outcomes of signals published by Fintrest since a stated launch date. These do not represent any user's actual account performance, as no user trades every signal at the exact entry and exit prices shown.

Past performance — backtested or live — does not guarantee future results.

**6. Risk of loss.** Trading stocks involves substantial risk of loss, including the total loss of your investment. Using leverage, margin, options, or derivatives increases the risk materially. Fintrest cannot and does not represent that any signal, strategy, or set of signals is suitable for any particular user.

**7. No personalization, no fiduciary duty.** Fintrest does not owe you a fiduciary duty. Lens does not know your full financial picture, account size, tax situation, outside positions, liquidity needs, or constraints. Personalization features such as Lens Personalized (Elite) improve relevance but do not make the output personalized investment advice.

**8. Forward-looking statements.** Research commentary, theses, reference levels, and Lens responses may contain forward-looking statements — expectations, projections, targets, or estimates about future events. Forward-looking statements are inherently uncertain and subject to change without notice.

**9. Accuracy of data and models.** Fintrest sources data from third-party providers (including Polygon, FMP, Finnhub, and exchange feeds). We do not warrant the accuracy, completeness, or timeliness of any data, signal, score, thesis, or reference level. Data feeds can be delayed, incorrect, or interrupted. Models can fail. Lens can make mistakes.

**10. Third-party content.** Fintrest may incorporate or link to third-party content (news articles, filings, data, research). Such content is the responsibility of the third-party provider; inclusion does not imply endorsement.

**11. Jurisdiction and eligibility.** Fintrest is offered only to users in jurisdictions where doing so is lawful. It is not offered where its offering, use, or distribution would be prohibited or subject DSYS Inc. to registration requirements it has not satisfied.

**12. Changes to this disclaimer.** We may update this disclaimer at any time. The current version is always posted at `https://fintrest.ai/disclaimer` with its last-updated date. Continued use after an update constitutes acceptance.

**13. Contact.** Questions: `legal@dsysinc.com` · DSYS Inc., [address], United States.

---

## 13. Legal — `/risk-disclosure` (full drop-in replacement)

> Ready for drop-in as the body of `https://fintrest.ai/risk-disclosure`. DSYS Inc. counsel review required.

### Risk disclosure

*Last updated: April 2026*

Trading stocks is risky. Before using Fintrest research to inform any trading decision, please read this carefully.

**1. You can lose money.** Any stock position can lose some or all of its value. Even highest-scoring signals can lose money. Even signals with favorable historical hit rates produce losers — often in streaks. Past performance, including backtested performance, does not guarantee you will profit. Do not trade money you cannot afford to lose.

**2. Signals are not certainties.** Fintrest signals are the output of a 7-factor quantitative model combined with an AI research layer (Lens). The model reflects assumptions about how markets behave; those assumptions can be wrong — particularly in unusual conditions, regime changes, macro shocks, or company-specific events. A BUY TODAY designation is a research classification, not a prediction.

**3. Reference levels are not instructions.** Every signal includes reference entry, stop, and target levels derived from technical structure. They are research outputs — not instructions to enter at the entry, exit at the stop, or exit at the target. If you use these levels, you do so on your own judgment and at your own risk.

**4. Real-world trading costs.** Backtested statistics do not include slippage, bid-ask spread, commissions, taxes, borrow fees, capacity constraints, missed fills, or execution delays. Your real-world results will be lower than backtested numbers — potentially significantly lower, especially for small-cap or thinly-traded stocks.

**5. Concentrated risk.** Acting on a small number of signals concentrates your risk. Following only "BUY TODAY" signals in a narrow window may over-concentrate exposure in a single sector or factor regime. Diversification is your responsibility.

**6. Volatility, gaps, and overnight risk.** Stocks can gap through stop-loss levels overnight or on news. Earnings, regulatory actions, merger announcements, geopolitical events, and market shocks can cause severe, immediate moves that exceed any reference stop. Fintrest flags some risks (earnings within 21 days, elevated short interest, high beta, high RSI) but cannot flag all of them.

**7. Leverage and margin.** Using margin amplifies losses. A 10% decline on a 2x margined position is a 20% account loss; a 30% decline can wipe out a leveraged account. Fintrest research assumes unleveraged cash positions unless stated otherwise.

**8. Options, derivatives, and crypto.** Fintrest covers US equities. Applying the research to options, futures, leveraged ETFs, crypto, or other derivatives introduces additional risks (time decay, strike risk, contango, expiration, counterparty risk) that Fintrest does not account for.

**9. Tax consequences.** Short-term trading generally produces short-term capital gains taxed at ordinary-income rates. Wash-sale rules, constructive-sale doctrine, and state tax treatment add complexity. Fintrest does not provide tax advice.

**10. Psychological and behavioral risk.** Trading on morning signals without discipline produces predictable behavioral losses: chasing breakouts, abandoning stops, doubling down on losers, overreacting to short losing streaks. How a user handles the research set — position sizing, discipline, stop adherence, sample size — determines real-world outcomes as much as the signals themselves.

**11. Survivorship and reporting bias.** Fintrest publishes its full audit log, including losers. Do not rely on anecdotal success stories, testimonials, or social-media posts to assess performance. Look at the complete audit log.

**12. No guarantees.** Fintrest makes no representation, warranty, or guarantee about any signal, score, thesis, reference level, or audit-log statistic. Your use of Fintrest research is at your own risk.

**13. If you are uncertain.** If you do not fully understand the risks — or are uncertain whether trading stocks is suitable for you — do not trade. Consider index-fund investing, consult a licensed financial professional, or use Fintrest purely as an educational tool.

**14. Questions.** `legal@dsysinc.com` · DSYS Inc., [address], United States.

---

## 14. Pre-launch implementation checklist

Bold priority items are **compliance-blocking** — do not ship without them.

| # | Task | Priority |
|---|---|---|
| 01 | HERO H1 rewritten ("Every stock idea, stress-tested before the open") | **COMPLIANCE-BLOCKING** |
| 02 | Pro plan bullet — "AI advisor" replaced with "Lens research layer" | **COMPLIANCE-BLOCKING** |
| 03 | "Trade Zones" card renamed to "Reference levels" with new body | **COMPLIANCE-BLOCKING** |
| 04 | Step 4 "Trade" renamed to "Review" in both Lens 4-step and How-It-Works | **COMPLIANCE-BLOCKING** |
| 05 | "Act with confidence" removed from How-It-Works step 4 | **COMPLIANCE-BLOCKING** |
| 06 | Performance section — inline HYPOTHETICAL / BACKTESTED badge row added | **COMPLIANCE-BLOCKING** |
| 07 | Performance metrics relabeled ("Backtested hit rate" etc.) | **COMPLIANCE-BLOCKING** |
| 08 | Performance disclosure block moved from footer to directly below metrics | **COMPLIANCE-BLOCKING** |
| 09 | Testimonial disclosures added under each card | **COMPLIANCE-BLOCKING** |
| 10 | Footer disclaimer expanded to full replacement block | **COMPLIANCE-BLOCKING** |
| 11 | Persistent compliance strip added to every page (above footer) | **COMPLIANCE-BLOCKING** |
| 12 | Lens chat intro bubble rewritten | **COMPLIANCE-BLOCKING** |
| 13 | Lens system prompt replaced with v1 rules | **COMPLIANCE-BLOCKING** |
| 14 | Research/Not-Advice chip added above chat input | **COMPLIANCE-BLOCKING** |
| 15 | `/disclaimer` replaced with drop-in from § 12 | **COMPLIANCE-BLOCKING** |
| 16 | `/risk-disclosure` replaced with drop-in from § 13 | **COMPLIANCE-BLOCKING** |
| 17 | Global find-and-replace "Athena" → "Lens" across repo, copy, emails, push | Recommended |
| 18 | Global find-and-replace "picks" → "signals" / "research" | Recommended |
| 19 | Nav links renamed ("Performance" → "Audit Log") | Recommended |
| 20 | Footer links updated (add "Not Financial Advice," "Regulatory Status") | Recommended |
| 21 | Meta titles/descriptions updated to remove "pick winning stocks" framing | Recommended |
| 22 | Email templates reworded (morning digest, signal alert, weekly summary) | Recommended |
| 23 | Push notification templates reworded (no "buy now" language) | Recommended |
| 24 | Mobile app screens updated to match (22-screen prototype) | Recommended |
| 25 | Testimonial release forms on file for every published testimonial | **COMPLIANCE-BLOCKING** |
| 26 | DSYS Inc. counsel review of `/disclaimer` and `/risk-disclosure` before launch | **COMPLIANCE-BLOCKING** |

---

> **Final note.** Every compliance-blocking item maps directly to an SEC enforcement priority for retail fintech: hypothetical-performance presentation, advisor-adjacent language without RIA registration, undisclosed testimonials, and misleading headline claims. This rewrite reduces exposure on all four. Counsel review is still required before launch — this doc gets you 90% of the way; the final 10% is legal review of corporate structure, jurisdictional reach, and state-level (CA/NY) UDAP overlays.
