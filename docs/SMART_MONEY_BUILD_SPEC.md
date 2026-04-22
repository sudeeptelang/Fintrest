# Fintrest Smart Money — 8-Week Build Spec

**Version:** 1.0 · **Owner:** DSYS Inc. · **Status:** Draft for implementation
**Stack (spec as written):** FastAPI + PostgreSQL + Redis (Railway) · Next.js + TypeScript frontend · Claude Sonnet 4.6 for Lens narration

This document is the build specification for shipping Smart Money as the 8th
factor in Fintrest's scoring engine, plus a parallel macro regime classifier.
It is organized week-by-week with API endpoints, Postgres schemas, scoring
logic, Lens prompt templates, FastAPI endpoints, and UI integration notes for
each phase.

The plan assumes one developer working full-time with Claude Code. Multiply by
1.5× if splitting focus with other Fintrest work.

> **Stack-translation note (read this before coding):**
> The spec was written against FastAPI + Python + Railway. Fintrest's actual
> backend is **C# .NET 9 + EF Core + ASP.NET Core** running against
> **Supabase Postgres**, with Redis for caching. When implementing:
> - Python modules → C# services under `backend/Fintrest.Api/Services/...`
> - FastAPI routes → ASP.NET Core controllers
> - SQL schemas lift as-is into EF Core migrations (next free number)
> - `claude-sonnet-4-6` → `claude-sonnet-4-20250514` per CLAUDE.md
> - IHostedService + Timer replaces Railway cron (see existing
>   `FirehoseIngestJob`, `FundamentalSubscoreJob` for the pattern)
> - Treat the Python code as pseudocode — the scoring formulas, thresholds,
>   and schemas are the canonical part; the language is not.

> **Budget reality (2026-04-22) — supersedes cost tables below:**
> Existing data spend is FMP Ultimate $139 + Polygon $200 = **$339/mo**.
> Quiver Quantitative ($50–100) and Unusual Whales ($200–400) are **not
> affordable** right now. Revised sub-signal plan:
>
> | Sub-signal | Revised source | Cost |
> |---|---|---|
> | Insider activity | SEC EDGAR Form 4 direct | **$0** |
> | Institutional flow | SEC EDGAR 13F direct parse (not Whale Wisdom) | **$0** |
> | Congressional | **FMP `/stable/senate-latest` + `/stable/house-latest`** (already paid for; skip Quiver). Per-member forward-accuracy weighting computed in-house from accumulated disclosure history once ≥6 months of data is on file. | **$0** |
> | Short dynamics | **FINRA bi-monthly only** (skip Fintel). Days-to-cover + borrow-rate color deferred. | **$0** |
> | Options positioning | **Deferred** — Unusual Whales waits for Pro revenue. Row renders greyed with "deferred until Pro revenue justifies the feed" message. | **deferred** |
> | Macro regime | FRED API (no auth beyond free key) | **$0** |
>
> **Smart Money ships as 4-of-5 sub-signals at $0 incremental cost.** The
> Options positioning row stays visible in the UI as a deferred state — same
> honest empty-state discipline as Peer Comparison. Re-enable with the
> Unusual Whales feed when revenue changes the math.

> **Claude API cost (~$3–5/Pro user/mo at 50 theses) — must come down.**
> Operating principle (confirmed 2026-04-22): **"only provide where required."**
> No speculative Lens generation. Every Claude call is tied to a concrete
> user request.
>
> Implementation:
>
> 1. **On-demand generation only.** Zero-out the nightly universe-wide
>    narration job. Lens text is generated the first time a user opens a
>    ticker (or it appears in a Top Today card) and then cached in Redis for
>    14 hours. Cache key: `lens:{sub_signal}:{ticker}:{as_of_date}`. Unread
>    tickers pay zero Claude dollars.
> 2. **Pre-warm only the Top Today list (~15 tickers)** so the morning
>    research drop hits a warm cache. That's ~15 × 6 calls = 90 calls/day of
>    guaranteed spend.
> 3. **Haiku 4.5 for sub-signal blurbs** (insider / institutional /
>    congressional / short). Sonnet only for the 8-factor thesis that has to
>    weave factors into prose. ~5× cost drop on ~80% of calls.
> 4. **Batch sub-signal narrations** — one Haiku call returning all 4–5
>    sentences costs ~1.2× a single call, not 5×.
> 5. **Compress prompts** — current templates are ~280 tokens and can be cut
>    to ~100 without quality loss.
>
> Combined with on-demand: projected $0.30–$0.80 per Pro user / month, or
> roughly 1/10 the ChatGPT estimate. Margin at $29/mo becomes comfortable
> rather than thin.

---

## Table of contents

1. Overview
2. Architecture
3. Phase 1 — Insider activity (weeks 1–2)
4. Phase 2 — Institutional flow + Congressional (weeks 3–4)
5. Phase 3 — Short dynamics (week 5)
6. Phase 4 — Options positioning (week 6)
7. Phase 5 — Composite + UI integration (week 7)
8. Phase 6 — Macro regime + release (week 8)
9. Appendix A — Backtest harness
10. Appendix B — Monitoring & alerts
11. Appendix C — Rollout plan & feature flags

---

## Overview

Smart Money is a composite factor built from five independent sub-signals, each
scored 0–100 and weighted into a single number that becomes the 8th spoke of
the factor ring.

| Sub-signal | Weight | Data source | Update cadence | Monthly cost |
|---|---|---|---|---|
| Insider activity | 35% | SEC EDGAR Form 4 | Daily (1–2d lag) | $0 |
| Institutional flow | 25% | SEC EDGAR 13F | Quarterly (45d lag) | $0 (or $50 for Whale Wisdom) |
| Congressional | 15% | Quiver Quantitative | Daily (up to 45d lag) | $50–100 |
| Options positioning | 15% | Unusual Whales | Near real-time | $200–400 |
| Short dynamics | 10% | FINRA + Fintel | Bi-monthly (1–2w lag) | $0–30 |

Plus a parallel track: macro regime classifier from FRED + Cboe data, which
reweights the 8 factors based on market regime.

**Guiding principles for the build:**

- Ship sub-components visibly before wiring them into the composite. Each
  sub-signal must be valuable on its own so users see progress.
- Every score has an associated Lens narration generated nightly and cached
  in Redis.
- Every surface labels its data source and staleness. No hidden lag.
- Feature flag everything. Nothing ships to 100% of users on day one.
- Exclude non-discretionary activity religiously. 10b5-1 sales, option
  exercises, and gifts never count as insider "buying" or "selling."

---

## Architecture

```
[Railway cron] → [Ingestion job] → [Raw Postgres tables] → [Scoring job]
                                                                 ↓
                                                    [Scores Postgres tables]
                                                                 ↓
                                         [Composite + Lens narration pipeline]
                                                                 ↓
                                                  [Redis cache (14h TTL)] → [FastAPI] → [Next.js UI]
```

**Why 14-hour TTL on Redis:** nightly pipeline runs at 11pm ET, morning
research drop is 7am ET, cache expires before next cycle. Stale cache cannot
accidentally serve past the next scoring window.

**Key tables pattern:** each sub-signal gets two tables — `{signal}_raw` for
ingested events and `{signal}_scores` for derived daily scores. Scores tables
have `(ticker, as_of_date)` primary keys so we can backtest by replaying the
scoring function against historical raw data.

**Cron schedule (America/New_York):**

| Time | Job |
|---|---|
| 20:00 | Ingest: Form 4, Quiver Congressional, Fintel short |
| 20:30 | Ingest: Unusual Whales options flow aggregates |
| 21:00 | Ingest: FRED macro series |
| 22:00 | Score: all sub-signals |
| 22:30 | Compute composites + generate Lens narrations |
| 23:00 | Prewarm Redis cache for full research universe |
| 06:30 | Morning research drop — publish signals |

---

## Phase 1 — Insider activity (weeks 1–2)

**Deliverable:** Insider sub-component live on staging as a standalone card on
the ticker page. Backfilled with 90 days of history across the full 500+
ticker research universe. Not yet wired into the 8-factor composite — that
happens in Phase 5.

### Data source: SEC EDGAR Form 4

Free, authoritative, no API key. User-Agent header is required and must
include a contact email per SEC fair-access policy.

```python
HEADERS = {
    "User-Agent": "Fintrest.ai Research deep@dsysinc.com",
    "Accept-Encoding": "gzip, deflate",
    "Host": "www.sec.gov",
}
```

**Rate limit:** 10 requests/second. Exceed and you get 403'd for 10 minutes.

**Endpoints:**

| Purpose | URL |
|---|---|
| Ticker → CIK map | `https://www.sec.gov/files/company_tickers.json` |
| Daily filing index | `https://www.sec.gov/Archives/edgar/daily-index/{YYYY}/QTR{N}/form.{YYYYMMDD}.idx` |
| Company submissions | `https://data.sec.gov/submissions/CIK{10-digit-padded}.json` |
| Individual filing | `https://www.sec.gov/Archives/edgar/data/{CIK}/{accession-no-dashes}/{accession-with-dashes}-index.htm` |
| Form 4 XML primary doc | `https://www.sec.gov/Archives/edgar/data/{CIK}/{accession}/{primary_doc}` |

**Ingestion approach:**

1. Fetch ticker→CIK map at boot, cache 24 hours.
2. Each business day at 8pm ET, fetch that day's `form.YYYYMMDD.idx`, filter to
   `Form Type = 4`.
3. For each filing, fetch the primary XML doc and parse. The Form 4 XML schema
   is stable — use `xml.etree.ElementTree` with the namespace
   `http://www.sec.gov/edgar/onwerreport` for reporting person fields.
4. Upsert each non-derivative transaction row.

### Postgres schema

```sql
CREATE TABLE insider_transactions (
    id BIGSERIAL PRIMARY KEY,
    accession_number TEXT NOT NULL,
    company_cik TEXT NOT NULL,
    ticker TEXT NOT NULL,
    insider_cik TEXT NOT NULL,
    insider_name TEXT NOT NULL,
    insider_title TEXT,
    is_officer BOOLEAN DEFAULT FALSE,
    is_director BOOLEAN DEFAULT FALSE,
    is_10pct_owner BOOLEAN DEFAULT FALSE,
    transaction_date DATE NOT NULL,
    filing_date DATE NOT NULL,
    transaction_code CHAR(1) NOT NULL,
    shares NUMERIC(18,4) NOT NULL,
    price_per_share NUMERIC(18,4),
    total_value NUMERIC(18,2),
    shares_owned_after NUMERIC(18,4),
    is_10b5_1 BOOLEAN DEFAULT FALSE,
    is_open_market BOOLEAN DEFAULT TRUE,
    raw_xml_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (accession_number, insider_cik, transaction_date, shares, transaction_code)
);

CREATE INDEX idx_insider_ticker_date ON insider_transactions (ticker, transaction_date DESC);
CREATE INDEX idx_insider_filing_date ON insider_transactions (filing_date DESC);
CREATE INDEX idx_insider_code ON insider_transactions (transaction_code) WHERE transaction_code IN ('P','S');

CREATE TABLE insider_scores (
    ticker TEXT NOT NULL,
    as_of_date DATE NOT NULL,
    score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    net_dollar_flow_30d NUMERIC(18,2),
    cluster_count_30d INTEGER,
    officer_buy_count INTEGER,
    director_buy_count INTEGER,
    largest_purchase_value NUMERIC(18,2),
    largest_purchaser_name TEXT,
    largest_purchaser_title TEXT,
    largest_purchaser_history_note TEXT,
    methodology_version TEXT NOT NULL,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (ticker, as_of_date)
);

CREATE INDEX idx_insider_scores_asof ON insider_scores (as_of_date DESC);
```

### Transaction code filter (critical)

**Include only:**

- `P` — Open-market or private purchase (the real signal)

**Exclude always:**

- `S` — Open-market sale (could be planned or personal)
- `A` — Grant, award — this is compensation, not conviction
- `M` — Exercise of derivative — often tax-driven
- `F` — Payment of exercise price or tax withholding
- `D` — Disposition to issuer
- `G` — Bona fide gift
- Any row where `is_10b5_1 = TRUE` — pre-scheduled, not discretionary

Shipping this filter incorrectly is the single most common bug in insider-data
products. Getting it right is the differentiator.

### Scoring logic

```python
# backend/app/signals/insider.py
from datetime import date, timedelta
from decimal import Decimal
from app.db import db
from app.prices import get_market_cap

METHODOLOGY_VERSION = "insider_v1.0"


def score_insider_activity(ticker: str, as_of: date) -> dict:
    """
    Composite score 0-100 based on:
      - net dollar flow relative to market cap (50%)
      - cluster count of distinct insiders (30%)
      - seniority weighting (officers > directors) (20%)
    """
    start = as_of - timedelta(days=30)
    txns = db.execute(
        """
        SELECT * FROM insider_transactions
        WHERE ticker = :ticker
          AND transaction_date >= :start
          AND transaction_date <= :as_of
          AND transaction_code = 'P'
          AND is_open_market = TRUE
          AND is_10b5_1 = FALSE
        ORDER BY total_value DESC NULLS LAST
        """,
        {"ticker": ticker, "start": start, "as_of": as_of},
    ).fetchall()

    if not txns:
        return _empty_score(ticker, as_of)

    net_flow = sum((t.total_value or Decimal(0)) for t in txns)
    cluster = len({t.insider_cik for t in txns})
    officers = sum(1 for t in txns if t.is_officer)
    directors = sum(1 for t in txns if t.is_director)
    largest = txns[0]

    market_cap = get_market_cap(ticker, as_of)
    flow_bps = (float(net_flow) / float(market_cap)) * 10000 if market_cap else 0

    # Each component is 0-100
    flow_score = min(100.0, flow_bps * 2.0)             # 50 bps -> 100
    cluster_score = min(100.0, cluster * 25.0)          # 4 insiders -> 100
    seniority_score = min(100.0, officers * 40.0 + directors * 15.0)

    score = (flow_score * 0.5) + (cluster_score * 0.3) + (seniority_score * 0.2)

    return {
        "ticker": ticker,
        "as_of_date": as_of,
        "score": round(score, 2),
        "net_dollar_flow_30d": net_flow,
        "cluster_count_30d": cluster,
        "officer_buy_count": officers,
        "director_buy_count": directors,
        "largest_purchase_value": largest.total_value,
        "largest_purchaser_name": largest.insider_name,
        "largest_purchaser_title": largest.insider_title,
        "largest_purchaser_history_note": _history_note(largest),
        "methodology_version": METHODOLOGY_VERSION,
    }


def _history_note(txn) -> str:
    """Compute 'largest since X' or 'first purchase in N months' note."""
    prior = db.execute(
        """
        SELECT MAX(total_value) AS max_prior, MAX(transaction_date) AS last_purchase
        FROM insider_transactions
        WHERE insider_cik = :cik
          AND transaction_code = 'P'
          AND transaction_date < :date
          AND is_10b5_1 = FALSE
        """,
        {"cik": txn.insider_cik, "date": txn.transaction_date},
    ).fetchone()
    if prior.max_prior is None:
        return "first disclosed open-market purchase"
    if txn.total_value > prior.max_prior:
        return f"largest purchase since records begin ({prior.last_purchase})"
    return ""


def _empty_score(ticker, as_of):
    return {
        "ticker": ticker,
        "as_of_date": as_of,
        "score": 0,
        "net_dollar_flow_30d": 0,
        "cluster_count_30d": 0,
        "officer_buy_count": 0,
        "director_buy_count": 0,
        "largest_purchase_value": None,
        "largest_purchaser_name": None,
        "largest_purchaser_title": None,
        "largest_purchaser_history_note": None,
        "methodology_version": METHODOLOGY_VERSION,
    }
```

### Lens prompt template

```python
# backend/app/lens/insider_prompt.py
from anthropic import Anthropic

client = Anthropic()

INSIDER_SYSTEM = """You are Lens, Fintrest's research narrator. Write one paragraph (2-3 sentences) on insider activity.

Rules you follow exactly:
- Lead with the most impactful fact (largest single buy OR the cluster, whichever is stronger).
- Name specific insiders by title and role. Never write "an insider" or "insiders" generically.
- Never use "buy," "sell," or "recommend." You describe activity; you do not direct behavior.
- If cluster count is 3 or more, emphasize the cluster.
- If the score is under 50, write neutrally — do not manufacture significance.
- End with the dominant driver in one short phrase, like: "The cluster of officer buying is the primary driver here."
- Mention 10b5-1 exclusions only if the activity is notable despite them."""

INSIDER_USER_TEMPLATE = """Generate the insider activity paragraph for {ticker}.

Score: {score}/100
Net dollar flow (30d): ${net_flow:,.0f}
Cluster count: {cluster} distinct insiders purchased open-market shares
Officer buys: {officers}
Director buys: {directors}
Largest purchase: {largest_name} ({largest_title}) — ${largest_value:,.0f} on {largest_date}
Historical context: {history_note}"""


def generate_insider_narration(score_data: dict, largest_date) -> str:
    content = INSIDER_USER_TEMPLATE.format(
        ticker=score_data["ticker"],
        score=score_data["score"],
        net_flow=float(score_data["net_dollar_flow_30d"]),
        cluster=score_data["cluster_count_30d"],
        officers=score_data["officer_buy_count"],
        directors=score_data["director_buy_count"],
        largest_name=score_data["largest_purchaser_name"] or "—",
        largest_title=score_data["largest_purchaser_title"] or "—",
        largest_value=float(score_data["largest_purchase_value"] or 0),
        largest_date=largest_date or "—",
        history_note=score_data["largest_purchaser_history_note"] or "no prior purchase on record",
    )

    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        system=INSIDER_SYSTEM,
        messages=[{"role": "user", "content": content}],
    )
    return resp.content[0].text.strip()
```

**Expected output example:**

> Microsoft's CFO and two independent directors bought a combined $4.2M of
> open-market shares over the last 30 days, with the CFO's $2.4M purchase
> marking the largest since records begin. The three-insider cluster reflects
> the kind of concentrated officer conviction that historically precedes
> sustained accumulation phases. The cluster of officer buying is the primary
> driver here.

### FastAPI endpoint

```python
# backend/app/api/signals.py
from fastapi import APIRouter, HTTPException
from app.db import fetch_latest_insider_score
from app.cache import redis

router = APIRouter()


@router.get("/signals/{ticker}/insider")
async def get_insider_signal(ticker: str):
    score = fetch_latest_insider_score(ticker.upper())
    if not score:
        raise HTTPException(404, "No insider signal computed")

    cache_key = f"lens:insider:{ticker.upper()}:{score.as_of_date.isoformat()}"
    narration = redis.get(cache_key)

    return {
        "ticker": ticker.upper(),
        "score": float(score.score),
        "components": {
            "net_dollar_flow_30d": float(score.net_dollar_flow_30d or 0),
            "cluster_count": score.cluster_count_30d,
            "officer_buys": score.officer_buy_count,
            "director_buys": score.director_buy_count,
        },
        "highlight": {
            "name": score.largest_purchaser_name,
            "title": score.largest_purchaser_title,
            "value": float(score.largest_purchase_value or 0),
            "history_note": score.largest_purchaser_history_note,
        },
        "lens": narration,
        "source": "SEC EDGAR Form 4",
        "staleness_note": "1–2 day disclosure lag",
        "methodology_version": score.methodology_version,
        "as_of": score.as_of_date.isoformat(),
    }
```

### UI integration

New component: `components/signals/InsiderActivityCard.tsx` — matches the
Smart Money breakdown row in the mockup. Weight badge ("35% weight"), score,
horizontal strength bar, evidence line from
`highlight.name/title/value/history_note`, source + staleness at the bottom.
Feature-flagged behind `NEXT_PUBLIC_SMART_MONEY_ENABLED`.

On the ticker page, insert the card below the 7-factor breakdown. It appears
as a standalone card until Phase 5 promotes it into the 8-factor composite.

### Acceptance criteria

- [ ] EDGAR Form 4 ingestion job runs nightly, completes in under 15 min for full universe
- [ ] `insider_transactions` table backfilled with 90 days of history for all 500+ tickers
- [ ] `insider_scores` recomputed nightly for all tickers with activity in prior 30 days
- [ ] Lens narration generated for every ticker with non-zero insider score
- [ ] `/signals/{ticker}/insider` endpoint p95 latency < 200ms on Redis hit
- [ ] UI card renders on staging for ≥10 test tickers, matches mockup
- [ ] Manual QA: 10 random Lens narrations contain no "buy/sell/recommend" language, no generic phrasing, numbers cross-checked against OpenInsider
- [ ] 10b5-1 exclusion verified by spot-checking a known scheduled-sale filing

---

## Phase 2 — Institutional flow + Congressional (weeks 3–4)

**Deliverable:** Two more sub-components live on staging. Smart Money card on
the ticker page shows three rows.

### Institutional flow — SEC EDGAR 13F

**Approach:** parse 13F-HR filings directly from EDGAR. Cheaper than Whale
Wisdom ($0 vs. $50/mo) but more implementation work. Recommend starting with
direct parsing; escape hatch to Whale Wisdom if parsing proves fragile.

**Endpoints:** same EDGAR infrastructure as Form 4. 13F filings are submitted
by institutions, not companies, so the flow is:

1. Maintain a list of "tracked institutions" (CIKs for funds whose positions
   you care about).
2. For each tracked institution, fetch new 13F-HR filings each quarter.
3. Parse the XML `infoTable` entries — each row is a position.
4. Derive per-ticker institutional flow by comparing current quarter vs. prior
   quarter for each tracked fund.

**Tracked institution list (starting point — adjust quarterly):**

Berkshire Hathaway, Tiger Global, Lone Pine, Viking Global, Coatue, Third
Point, Pershing Square, Baupost, Bridgewater, Citadel Advisors, Renaissance
Technologies, Two Sigma, ARK Invest, Vanguard, BlackRock, Fidelity, T. Rowe
Price, State Street, Capital Group, Wellington, Greenlight, Appaloosa,
Point72, Millennium.

Publish this list transparently — methodology > mystique. Alternatively, use
aggregate counts (X of tracked funds added, Y trimmed) without naming them.

### Postgres schema (institutional)

```sql
CREATE TABLE thirteenf_holdings (
    id BIGSERIAL PRIMARY KEY,
    accession_number TEXT NOT NULL,
    filer_cik TEXT NOT NULL,
    filer_name TEXT NOT NULL,
    period_of_report DATE NOT NULL,
    filing_date DATE NOT NULL,
    ticker TEXT NOT NULL,
    cusip TEXT,
    shares NUMERIC(18,4) NOT NULL,
    market_value NUMERIC(18,2) NOT NULL,
    is_tracked_institution BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (accession_number, filer_cik, ticker, cusip)
);

CREATE INDEX idx_13f_ticker_period ON thirteenf_holdings (ticker, period_of_report DESC);
CREATE INDEX idx_13f_filer ON thirteenf_holdings (filer_cik, period_of_report DESC);

CREATE TABLE institutional_scores (
    ticker TEXT NOT NULL,
    as_of_date DATE NOT NULL,
    score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    ownership_pct_change_qoq NUMERIC(8,4),
    tracked_funds_added INTEGER,
    tracked_funds_trimmed INTEGER,
    largest_initiator_name TEXT,
    largest_initiator_value NUMERIC(18,2),
    methodology_version TEXT NOT NULL,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (ticker, as_of_date)
);
```

### Scoring logic (institutional)

```python
# backend/app/signals/institutional.py
METHODOLOGY_VERSION = "institutional_v1.0"


def score_institutional_flow(ticker: str, as_of: date) -> dict:
    # Compare current 13F period vs. prior period
    current_period = most_recent_13f_period(as_of)
    prior_period = previous_13f_period(current_period)

    current = fetch_13f_positions(ticker, current_period)
    prior = fetch_13f_positions(ticker, prior_period)

    # Ownership change (% of float)
    current_shares = sum(p.shares for p in current)
    prior_shares = sum(p.shares for p in prior) or 1
    pct_change = ((current_shares - prior_shares) / prior_shares) * 100

    # Tracked fund activity
    tracked_current = {p.filer_cik: p for p in current if p.is_tracked_institution}
    tracked_prior = {p.filer_cik: p for p in prior if p.is_tracked_institution}

    added = [
        c for cik, c in tracked_current.items()
        if cik not in tracked_prior or c.shares > tracked_prior[cik].shares * 1.2
    ]
    trimmed = [
        p for cik, p in tracked_prior.items()
        if cik not in tracked_current or tracked_current[cik].shares < p.shares * 0.8
    ]

    # Components
    pct_change_score = min(100.0, max(0.0, 50 + pct_change * 10))   # +5% QoQ -> 100
    tracked_add_score = min(100.0, len(added) * 20.0)               # 5 adds -> 100
    net_tracked_score = min(100.0, max(0.0, 50 + (len(added) - len(trimmed)) * 12.5))

    score = (pct_change_score * 0.4) + (tracked_add_score * 0.35) + (net_tracked_score * 0.25)

    largest = max(added, key=lambda p: p.market_value, default=None)

    return {
        "ticker": ticker,
        "as_of_date": as_of,
        "score": round(score, 2),
        "ownership_pct_change_qoq": round(pct_change, 4),
        "tracked_funds_added": len(added),
        "tracked_funds_trimmed": len(trimmed),
        "largest_initiator_name": largest.filer_name if largest else None,
        "largest_initiator_value": largest.market_value if largest else None,
        "methodology_version": METHODOLOGY_VERSION,
    }
```

### Lens prompt (institutional)

```python
INSTITUTIONAL_SYSTEM = """You are Lens, Fintrest's research narrator. Write one paragraph on institutional positioning.

Rules:
- Lead with the QoQ ownership change percentage if meaningful (> 2% in either direction).
- Name the largest initiator specifically if present.
- If tracked_funds_added >= 3, mention the count.
- Never use "buy," "sell," or "recommend."
- If score < 40, note that institutional flow is flat or mildly negative.
- Always caveat staleness: mention that 13F data lags up to 45 days."""

INSTITUTIONAL_USER_TEMPLATE = """Generate the institutional flow paragraph for {ticker}.

Score: {score}/100
Ownership change QoQ: {pct_change}%
Tracked funds added or grew position: {added}
Tracked funds trimmed or closed: {trimmed}
Largest new position: {largest_name} — ${largest_value:,.0f}
Reporting period: {period}"""
```

### Congressional — Quiver Quantitative

**Cost:** API access around $50–100/mo depending on tier. Sign up at
quiverquant.com/api.

**Endpoints:**

| Purpose | URL | Cadence |
|---|---|---|
| Historical Congress trading by ticker | `GET /beta/historical/congresstrading/{ticker}` | Daily |
| Recent Congress trading (all tickers) | `GET /beta/live/congresstrading` | Daily |
| Member metadata | `GET /beta/live/representatives` | Weekly |

**Auth:** `Authorization: Token {QUIVER_API_KEY}` header.
**Rate limit:** 300 requests/minute on standard tier.

### Postgres schema (congressional)

```sql
CREATE TABLE congress_trades (
    id BIGSERIAL PRIMARY KEY,
    ticker TEXT NOT NULL,
    representative TEXT NOT NULL,
    chamber TEXT NOT NULL CHECK (chamber IN ('House', 'Senate')),
    transaction_date DATE NOT NULL,
    disclosure_date DATE NOT NULL,
    transaction_type TEXT NOT NULL,
    amount_min NUMERIC(18,2),
    amount_max NUMERIC(18,2),
    party TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (ticker, representative, transaction_date, transaction_type, amount_min)
);

CREATE INDEX idx_congress_ticker_date ON congress_trades (ticker, transaction_date DESC);

CREATE TABLE congress_member_accuracy (
    representative TEXT PRIMARY KEY,
    forward_90d_accuracy NUMERIC(5,2),
    sample_size INTEGER,
    last_recomputed DATE,
    weight NUMERIC(4,3) DEFAULT 1.0
);

CREATE TABLE congressional_scores (
    ticker TEXT NOT NULL,
    as_of_date DATE NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    material_buys_90d INTEGER,
    material_sells_90d INTEGER,
    weighted_buy_signal NUMERIC(10,4),
    weighted_sell_signal NUMERIC(10,4),
    notable_trader_note TEXT,
    methodology_version TEXT NOT NULL,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (ticker, as_of_date)
);
```

### Scoring logic (congressional)

```python
# backend/app/signals/congressional.py
METHODOLOGY_VERSION = "congressional_v1.0"
MATERIAL_THRESHOLD_MIN = 15000  # disclosed amount_min >= $15k counts as material


def score_congressional_activity(ticker: str, as_of: date) -> dict:
    start = as_of - timedelta(days=90)
    trades = db.execute(
        """
        SELECT ct.*, cma.weight, cma.forward_90d_accuracy
        FROM congress_trades ct
        LEFT JOIN congress_member_accuracy cma ON cma.representative = ct.representative
        WHERE ct.ticker = :ticker
          AND ct.transaction_date >= :start
          AND ct.transaction_date <= :as_of
          AND COALESCE(ct.amount_min, 0) >= :threshold
        """,
        {"ticker": ticker, "start": start, "as_of": as_of, "threshold": MATERIAL_THRESHOLD_MIN},
    ).fetchall()

    if not trades:
        return {"ticker": ticker, "as_of_date": as_of, "score": 0, ...}

    buys = [t for t in trades if "purchase" in t.transaction_type.lower()]
    sells = [t for t in trades if "sale" in t.transaction_type.lower()]

    weighted_buy = sum((t.weight or 1.0) * (t.amount_min or 0) for t in buys)
    weighted_sell = sum((t.weight or 1.0) * (t.amount_min or 0) for t in sells)

    net = weighted_buy - weighted_sell
    score = min(100.0, max(0.0, 50 + (net / 100000)))   # normalize

    notable = max(buys, key=lambda t: t.amount_min or 0, default=None)
    note = (
        f"{notable.representative} ({notable.party}) disclosed up to ${notable.amount_max:,.0f}"
        if notable else "no material trades"
    )

    return {
        "ticker": ticker,
        "as_of_date": as_of,
        "score": round(score, 2),
        "material_buys_90d": len(buys),
        "material_sells_90d": len(sells),
        "weighted_buy_signal": weighted_buy,
        "weighted_sell_signal": weighted_sell,
        "notable_trader_note": note,
        "methodology_version": METHODOLOGY_VERSION,
    }
```

**Member accuracy recomputation:** weekly cron job that runs `UPDATE
congress_member_accuracy SET weight = f(forward_90d_accuracy)` based on
rolling 2-year historical performance. Members with < 10 trades get
`weight = 1.0` (neutral). Members with 40%+ accuracy get weight up to 2.0;
under 40% gets weight down to 0.5.

### Acceptance criteria (Phase 2)

- [ ] 13F-HR ingestion job runs nightly; tracked-institution list is queryable
- [ ] `institutional_scores` recomputed after every new 13F filing from a tracked institution
- [ ] Quiver API key secured in Railway env vars, rate limit respected
- [ ] `congress_member_accuracy` weights recomputed weekly
- [ ] Lens narrations for both sub-signals include staleness warnings
- [ ] Staging: Smart Money card on ticker page now shows 3 rows, each with horizontal bar + evidence + source/staleness
- [ ] Backfill: 4 quarters of 13F data + 1 year of Congress trades

---

## Phase 3 — Short dynamics (week 5)

**Deliverable:** Short dynamics sub-component live. 4 of 5 Smart Money inputs
complete.

### Data source

**Primary:** FINRA bi-monthly short interest reports (free).

- URL pattern: `https://cdn.finra.org/equity/regsho/daily/CNMSshvol{YYYYMMDD}.txt`
- Daily short volume (not interest). Useful for delta tracking.
- Bi-monthly settlement: FINRA publishes at mid-month and end-of-month with
  7-day lag.

**Supplementary:** Fintel API (~$30/mo) for days-to-cover, borrow rates, and
squeeze scores. Optional but adds useful color.

### Schema

```sql
CREATE TABLE short_interest_snapshots (
    ticker TEXT NOT NULL,
    settlement_date DATE NOT NULL,
    short_interest_shares NUMERIC(18,4),
    short_interest_ratio NUMERIC(10,4),
    days_to_cover NUMERIC(6,2),
    borrow_rate NUMERIC(6,3),
    source TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (ticker, settlement_date, source)
);

CREATE TABLE short_dynamics_scores (
    ticker TEXT NOT NULL,
    as_of_date DATE NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    si_change_wow_pct NUMERIC(8,4),
    price_change_wow_pct NUMERIC(8,4),
    days_to_cover NUMERIC(6,2),
    pattern_label TEXT,
    methodology_version TEXT NOT NULL,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (ticker, as_of_date)
);
```

### Scoring logic

The score encodes a *pattern* rather than a single number. Four patterns, each
mapped to a score band:

| Pattern | SI delta | Price delta | Score band | Interpretation |
|---|---|---|---|---|
| Conviction unwind | Falling | Rising | 70–95 | Shorts covering into strength — smart money |
| Squeeze setup | Rising | Rising | 55–75 | Shorts pressing into strength — risk of squeeze |
| Bearish conviction | Rising | Falling | 10–30 | Shorts building into weakness |
| Benign | Falling | Falling | 35–55 | Shorts covering into weakness — no signal |

Set `pattern_label` explicitly so Lens can quote it.

### Lens prompt

```python
SHORT_DYNAMICS_SYSTEM = """You are Lens, Fintrest's research narrator. Write 1-2 sentences on short interest dynamics.

Rules:
- State the pattern name (conviction unwind, squeeze setup, bearish conviction, or benign) explicitly.
- Include days-to-cover if > 3 (squeeze-relevant territory).
- Never use "buy," "sell," or "recommend."
- If score < 40, acknowledge the negative read."""
```

### Acceptance criteria

- [ ] FINRA daily short volume ingested and reconciled to bi-monthly settlement data
- [ ] Pattern classifier labels 4 distinct patterns correctly on 20 test tickers
- [ ] Score + Lens narration visible on Smart Money card

---

## Phase 4 — Options positioning (week 6)

**Deliverable:** All 5 Smart Money sub-signals live.

### Data source: Unusual Whales

**Cost:** API access starts around $200–400/mo depending on tier. This is the
largest ongoing expense in the Smart Money stack.

**Endpoints:**

| Purpose | URL |
|---|---|
| Flow alerts | `GET /api/stock/{ticker}/flow-alerts` |
| Volume/OI by strike | `GET /api/stock/{ticker}/options-volume` |
| Greeks aggregates | `GET /api/stock/{ticker}/greek-exposure` |
| Unusual activity | `GET /api/stock/{ticker}/unusual-activity` |

**Auth:** `Authorization: Bearer {UW_API_KEY}` header.

### Schema

```sql
CREATE TABLE options_flow_aggregates (
    ticker TEXT NOT NULL,
    as_of_date DATE NOT NULL,
    call_volume BIGINT,
    put_volume BIGINT,
    call_premium NUMERIC(18,2),
    put_premium NUMERIC(18,2),
    ask_side_pct NUMERIC(5,2),
    unusual_contracts_count INTEGER,
    largest_contract_strike NUMERIC(10,2),
    largest_contract_expiry DATE,
    largest_contract_premium NUMERIC(18,2),
    iv_rank NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (ticker, as_of_date)
);

CREATE TABLE options_positioning_scores (
    ticker TEXT NOT NULL,
    as_of_date DATE NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    pcr NUMERIC(5,3),
    volume_ratio_30d NUMERIC(6,2),
    ask_side_pct NUMERIC(5,2),
    notable_flow_note TEXT,
    methodology_version TEXT NOT NULL,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (ticker, as_of_date)
);
```

### Scoring logic

```python
def score_options_positioning(ticker: str, as_of: date) -> dict:
    agg = fetch_options_flow_aggregates(ticker, as_of)
    avg_30d = fetch_30d_avg_volume(ticker)

    if not agg or not avg_30d:
        return _empty_options_score(ticker, as_of)

    total_vol = (agg.call_volume or 0) + (agg.put_volume or 0)
    volume_ratio = total_vol / avg_30d if avg_30d else 1.0
    pcr = (agg.put_volume or 0) / (agg.call_volume or 1)

    # Score components
    vol_score = min(100.0, (volume_ratio - 1) * 40)        # 3.5x avg -> 100
    pcr_score = max(0.0, min(100.0, 100 - pcr * 100))      # low pcr is bullish
    ask_score = min(100.0, (agg.ask_side_pct or 0) * 1.4)  # 70% ask-side -> 100

    score = (vol_score * 0.4) + (pcr_score * 0.3) + (ask_score * 0.3)
    ...
```

### Acceptance criteria

- [ ] UW API integrated; nightly aggregate pull for full universe under 20 min
- [ ] Scoring produces stable results on 5 high-volume and 5 low-volume test tickers
- [ ] Lens narration correctly identifies directional bias
- [ ] Smart Money card shows all 5 rows in UI

---

## Phase 5 — Composite + UI integration (week 7)

**Deliverable:** Smart Money becomes the 8th factor in the main ring. Factor
ring, radar, and Lens thesis all updated. Feature flagged.

### Composite scoring

```python
# backend/app/signals/smart_money.py
METHODOLOGY_VERSION = "smart_money_v1.0"

SUB_WEIGHTS = {
    "insider": 0.35,
    "institutional": 0.25,
    "congressional": 0.15,
    "options": 0.15,
    "short": 0.10,
}


def compute_smart_money_score(ticker: str, as_of: date) -> dict:
    sub_scores = {
        "insider": fetch_insider_score(ticker, as_of),
        "institutional": fetch_institutional_score(ticker, as_of),
        "congressional": fetch_congressional_score(ticker, as_of),
        "options": fetch_options_score(ticker, as_of),
        "short": fetch_short_score(ticker, as_of),
    }
    composite = sum(
        (sub_scores[k] or 0) * w for k, w in SUB_WEIGHTS.items()
    )
    return {
        "ticker": ticker,
        "as_of_date": as_of,
        "composite": round(composite, 2),
        "sub_scores": sub_scores,
        "sub_weights": SUB_WEIGHTS,
        "methodology_version": METHODOLOGY_VERSION,
    }
```

### Main composite adjustment

Update the 7-factor composite engine to include Smart Money as the 8th factor.
Initial equal-weight across 8 factors: 12.5% each. Do not rebalance other
factors — let Smart Money add incrementally and backtest the new composite
against 2022–2024 data before defaulting it on.

### Lens thesis prompt (updated)

```python
LENS_THESIS_SYSTEM = """You are Lens. Write a 4-6 sentence thesis integrating all 8 factor signals including Smart Money sub-signals.

New rules:
- When Smart Money score > 70 OR any sub-signal > 85, weave specific evidence (CFO name, fund name, contract strike) into the prose.
- Cite data sources implicitly ("disclosed insider buying", "13F showed") rather than explicitly.
- Preserve original rules: no "buy/sell/recommend," research only, specific over generic."""
```

### UI integration

**Frontend changes:**

1. `components/ScoreRing.tsx` — update from 7 to 8 segments. Segment scores
   and labels now read from a `factors` array of length 8.
2. `components/FactorRadar.tsx` — 8 axes with "Smart $" label in position 8.
3. `components/SmartMoneyBreakdown.tsx` — expandable card with 5 sub-component
   rows. Default collapsed on mobile, default expanded on desktop.
4. `components/FactorList.tsx` — 8 rows, Smart Money row has expansion caret.

### Backtest harness

Before defaulting Smart Money on, run backtest:

```python
# Replay 2022-01-01 to present
# For each signal Fintrest would have fired:
#   compute Smart Money score at signal time (using only data available then)
#   track forward 5d and 20d return
#   bucket by Smart Money score tercile

# Accept if top-tercile Smart Money signals outperform bottom-tercile
# by > 2% over 20d, with significance p < 0.05
```

If backtest passes, launch behind `SMART_MONEY_DEFAULT_ON=true`. If it fails,
either recalibrate sub-weights or keep Smart Money visible as a row without
wiring it into the composite.

### Acceptance criteria

- [ ] 8-factor composite recomputed across full universe
- [ ] Backtest run and results documented in `/docs/backtest/smart_money_v1.md`
- [ ] UI ships behind feature flag, rolled to 10% of Pro users first
- [ ] A/B test: compare engagement (research page views, watchlist adds) between 8-factor and 7-factor users

---

## Phase 6 — Macro regime + release (week 8)

**Deliverable:** Macro regime classifier live. Feeds into factor reweighting.
Visible as the "Risk-on regime · VIX 14.2" pill in the mockup.

### Data source: FRED + Cboe

**FRED** (free, no auth): `https://api.stlouisfed.org/fred/series/observations?series_id={id}&api_key={key}`
— free API key from fred.stlouisfed.org.

**Series IDs:**

| Series | FRED ID | Use |
|---|---|---|
| VIX | VIXCLS | Vol regime |
| 10Y Treasury | DGS10 | Rate regime |
| DXY | DTWEXBGS | Dollar strength |
| Fed Funds | FEDFUNDS | Monetary regime |
| HY spread | BAMLH0A0HYM2 | Credit regime |

### Regime classifier

```python
def classify_regime(as_of: date) -> str:
    vix = fetch_fred("VIXCLS", as_of)
    vix_ma = fetch_fred_ma("VIXCLS", as_of, window=20)
    hy_spread = fetch_fred("BAMLH0A0HYM2", as_of)
    dxy_change_30d = fetch_fred_change("DTWEXBGS", as_of, days=30)

    if vix > 25 or hy_spread > 5.5:
        return "risk-off"
    if vix < vix_ma * 0.85 and hy_spread < 3.5 and dxy_change_30d < 2:
        return "risk-on"
    return "transition"
```

### Factor reweighting by regime

| Regime | Factor weight adjustment |
|---|---|
| Risk-on | Boost momentum (+5%), boost smart money (+3%), reduce risk factor (-5%) |
| Risk-off | Boost earnings quality (+5%), boost risk (+5%), reduce momentum (-5%) |
| Transition | No adjustment (equal weights) |

### Schema

```sql
CREATE TABLE macro_snapshots (
    as_of_date DATE PRIMARY KEY,
    vix NUMERIC(6,2),
    vix_20d_ma NUMERIC(6,2),
    treasury_10y NUMERIC(5,3),
    dxy NUMERIC(8,3),
    hy_spread NUMERIC(5,3),
    fed_funds NUMERIC(5,3),
    regime TEXT CHECK (regime IN ('risk-on', 'risk-off', 'transition')),
    computed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Release checklist

- [ ] All Phase 1–5 acceptance criteria met
- [ ] Backtest documented and passed
- [ ] Feature flags configured: `SMART_MONEY_ENABLED`, `MACRO_REGIME_ENABLED`, `SMART_MONEY_DEFAULT_ON`
- [ ] Monitoring: Datadog/Sentry alerts on any scoring job failure
- [ ] Lens generation cost modeled: ~500 tickers × ~6 narrations each × $0.003/call = ~$9/day
- [ ] Privacy/legal review: confirm "Smart Money" naming doesn't imply advisory relationship
- [ ] User doc: explainer page at `/about/smart-money` with methodology transparency
- [ ] Public audit log includes Smart Money score per historical signal
- [ ] Launch post: blog + email to existing users
- [ ] Gradual rollout: 10% → 25% → 50% → 100% over 2 weeks

---

## Appendix A — Backtest harness

Every sub-signal and the composite must be backtested before defaulting on.
Harness lives in `backend/backtest/`:

```python
# backend/backtest/replay.py
def replay_scoring(
    start_date: date,
    end_date: date,
    signal_fn: Callable[[str, date], float],
    universe: list[str],
) -> pd.DataFrame:
    """
    For each ticker in universe, for each business day between start and end:
      compute signal score using only data available at that date
      record forward 5d and 20d returns
    Returns a DataFrame with columns: ticker, date, score, ret_5d, ret_20d
    """
    ...


def evaluate(results: pd.DataFrame) -> dict:
    top_tercile = results[results.score >= results.score.quantile(0.67)]
    bottom_tercile = results[results.score <= results.score.quantile(0.33)]
    return {
        "top_mean_20d": top_tercile.ret_20d.mean(),
        "bottom_mean_20d": bottom_tercile.ret_20d.mean(),
        "spread": top_tercile.ret_20d.mean() - bottom_tercile.ret_20d.mean(),
        "t_stat": ttest_ind(top_tercile.ret_20d, bottom_tercile.ret_20d).statistic,
        "p_value": ttest_ind(top_tercile.ret_20d, bottom_tercile.ret_20d).pvalue,
    }
```

**Pass criteria:** top-tercile 20d return exceeds bottom-tercile by ≥ 2%, with
p < 0.05 over the full backtest window.

---

## Appendix B — Monitoring & alerts

Every ingestion and scoring job emits metrics to Datadog (or Railway logs):

- `fintrest.ingest.{source}.success_count`
- `fintrest.ingest.{source}.failure_count`
- `fintrest.ingest.{source}.latency_ms`
- `fintrest.score.{signal}.compute_count`
- `fintrest.lens.{signal}.tokens_consumed`
- `fintrest.lens.{signal}.cost_usd`

**Alert conditions:**

- Any ingestion job fails twice in a row → PagerDuty
- Daily Lens generation exceeds $30 → email warning
- Any signal scoring job runs > 30 min → email warning
- Cache miss rate on `/signals/*` > 5% → investigate

---

## Appendix C — Rollout plan & feature flags

### Environment variables

```bash
# Feature toggles
SMART_MONEY_ENABLED=false        # master switch for the feature
SMART_MONEY_DEFAULT_ON=false     # include in composite vs. side-car only
MACRO_REGIME_ENABLED=false       # regime classifier + reweighting

# API keys
QUIVER_API_KEY=
UNUSUAL_WHALES_API_KEY=
FINTEL_API_KEY=
FRED_API_KEY=
ANTHROPIC_API_KEY=               # already exists

# Rollout
SMART_MONEY_ROLLOUT_PCT=10       # integer 0-100
```

### Rollout stages

| Stage | Week | % users | Criteria to advance |
|---|---|---|---|
| Internal | 7 | DSYS team only | QA sign-off |
| Alpha | 8 | 10% Pro users | No crash reports in 48h, NPS comment tracking |
| Beta | 9 | 25% Pro users | Engagement lift ≥ neutral |
| GA | 10 | 100% | Backtest + engagement both positive |

### Kill switch

Setting `SMART_MONEY_ENABLED=false` must:

1. Hide Smart Money row from factor list and ring (fall back to 7 segments).
2. Hide Smart Money breakdown card.
3. Revert composite calculation to 7-factor version.
4. Not break any existing user-saved alerts or watchlists.

All without a deploy — environment variable change only.

---

**End of spec.** Questions and revisions go in the `/docs/rfcs/` folder.
