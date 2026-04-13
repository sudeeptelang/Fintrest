# Fintrest.ai — Signal Scoring Engine v2

Signals are generated daily (6:00 AM ET) by scanning all S&P 500 stocks (468 tickers)
through a 7-factor scoring engine powered by 10 quantitative algorithms.

## Architecture

```
S&P 500 universe (468 stocks)
    ↓
Data loading (Polygon bars + FMP fundamentals + Finnhub news)
    ↓
Market regime computation (SPY trend → bull/bear/ranging)
    ↓
Per-stock scoring (7 factors × multiple sub-algorithms each)
    ↓
Trade zone calculation (ATR-based entry/target/stop)
    ↓
Signal filtering (R:R ≥ 1.5 for BUY_TODAY, top 20 WATCH)
    ↓
Explanation generation (Athena AI narrative)
    ↓
Publication (20-30 actionable signals per scan)
```

## 7 Scoring Factors

| Factor | Weight | Sub-Algorithms | Data Source |
|--------|--------|----------------|-------------|
| **Momentum** | 22% | Multi-timeframe ROC (5d/20d/60d), RSI divergence, momentum acceleration, MA alignment, 52-week range position | MarketData bars |
| **Volume** | 12% | Relative volume (continuous), volume trend (accumulation/distribution), volume-price confirmation | MarketData bars |
| **News Catalyst** | 15% | Recency-weighted sentiment, catalyst type hierarchy, PEAD (post-earnings drift), earnings proximity, news frequency | Finnhub + FMP |
| **Fundamentals** | 18% | P/E valuation, PEG growth-adjusted, ROE profitability, operating margin, revenue growth, debt/equity health | FMP ratios-ttm + Stock model |
| **Sentiment** | 10% | Analyst consensus (1-5), price target upside %, analyst coverage depth, insider cluster buying detection | Finnhub ratings + FMP target |
| **Trend** | 13% | ADX strength with direction penalty, MA slope analysis, Bollinger Band squeeze (breakout prediction) | MarketData bars |
| **Risk** | 10% | ATR volatility, beta with market-regime adjustment, 30-day max drawdown, liquidity, mean reversion Z-score, SPY regime | MarketData + Stock.Beta |

## Composite Score

```
composite = momentum × 0.22 + volume × 0.12 + catalyst × 0.15 +
            fundamentals × 0.18 + sentiment × 0.10 +
            trend × 0.13 + risk × 0.10
```

## 10 Quantitative Algorithms

### 1. Jegadeesh-Titman Multi-Timeframe Momentum
Measures price momentum across 5-day, 20-day, and 60-day windows. Based on the
Jegadeesh & Titman (1993) momentum factor — stocks that performed well in the past
tend to continue performing well in the short-to-medium term.

### 2. RSI Divergence Detection
Compares price trend direction with RSI trend. When price makes a new high but RSI
doesn't confirm (bearish divergence) or vice versa (bullish divergence), this signals
a potential reversal. Classic technical analysis pattern.

### 3. Momentum Acceleration
Measures whether momentum is speeding up or slowing down by comparing short-term
ROC to normalized medium-term ROC. Accelerating momentum is a stronger signal than
steady momentum.

### 4. Volume-Price Confirmation
Analyzes whether volume confirms or contradicts price movement:
- Up on high volume = strong (institutional participation)
- Up on low volume = weak rally (likely to fail)
- Down on high volume = distribution (institutional selling)

### 5. Post-Earnings Announcement Drift (PEAD)
One of the most well-documented anomalies in finance (Ball & Brown, 1968). Stocks
that beat earnings estimates tend to drift upward for 60+ days; stocks that miss tend
to drift downward. We use EPS surprise data from FMP to score this.

### 6. Bollinger Band Squeeze
Detects periods of low volatility compression (narrow Bollinger Bands) which often
precede significant breakouts. Computed from 20-day standard deviation relative to
price. Tight squeeze (BB width < 3%) scores highest.

### 7. Mean Reversion Z-Score
Measures how far the current price is from its 50-day mean, expressed in standard
deviations. Extreme Z-scores (> 2.0 sigma) indicate higher risk of mean reversion.
Used in the Risk factor to penalize overextended stocks.

### 8. Market Regime Awareness
Computes SPY's trend direction (via MA50/MA200 alignment) once per scan. In bear
markets: high-beta stocks are penalized, defensive stocks rewarded. In bull markets:
the opposite. This prevents the engine from recommending high-beta momentum plays
during broad market weakness.

### 9. Insider Cluster Buying
Detects when multiple corporate insiders buy shares within the same 90-day window.
Cluster buying (3+ insiders) is the strongest insider signal in academic research.
Single insider buys are weighted less; insider selling is a negative signal.
Data source: Finnhub `/stock/insider-transactions`.

### 10. Accumulation/Distribution Volume Pattern
Compares 5-day average volume to 30-day average volume to detect accumulation
(rising volume trend with rising price) vs distribution (rising volume with falling
price). This identifies institutional buying/selling patterns.

## Signal Thresholds (v2)

| Score | Signal Type | Description |
|-------|------------|-------------|
| ≥ 78 | **BUY_TODAY** | High-conviction actionable signal with entry/target/stop |
| 58-77 | **WATCH** | Interesting setup, monitor for entry |
| 38-57 | **HIGH_RISK** | Not published — below quality threshold |
| < 38 | **AVOID** | Not published |

## Signal Filtering Rules

- **BUY_TODAY**: Must have valid trade zone AND R:R ≥ 1.5 to publish
- **WATCH**: Must have valid trade zone, capped at top 20 by score
- **HIGH_RISK / AVOID**: Never published to users
- Result: 468 stocks scored → typically 20-30 signals published

## Trade Zone Calculation

Based on ATR (Average True Range, 14 periods):

```
Entry zone:    current price ± 0.25 × ATR
Stop-loss:     entry mid - 1.5 × ATR
Target zone:   entry mid + (risk × R:R multiplier) ± 0.5 × ATR
```

R:R multiplier adjusts by conviction:
- Score 95+: 3.0:1 R:R
- Score 90+: 2.5:1
- Score 85+: 2.2:1
- Default: 2.0:1

## Horizon Classification

Based on signal characteristics, not hardcoded:

| Horizon | Days | Trigger |
|---------|------|---------|
| **Short Term** | 1-5d | High momentum (≥80) + high volume (≥70) = day/swing trade |
| **Short Term** | 5d | Strong catalyst + news event |
| **Mid Term** | 7-14d | Moderate momentum + strong trend = swing trade |
| **Long Term** | 21d | Fundamentals-driven signal |
| **Long Term** | 45d | Low momentum + strong fundamentals = value play |

## Data Infrastructure

| Provider | Endpoint | Data Used For |
|---|---|---|
| **Polygon** ($29/mo) | `/v2/aggs/ticker/{}/range/1/day` | OHLCV bars, MA, RSI, ADX, ATR, ROC |
| **FMP** ($29/mo) | `/stable/ratios-ttm`, `/stable/key-metrics-ttm`, `/stable/profile` | P/E, PEG, ROE, ROA, Beta, analyst target |
| **FMP** | `/stable/income-statement` | Quarterly revenue, EPS, margins |
| **FMP** | `/stable/price-target-consensus` | Analyst target price |
| **Finnhub** (free) | `/company-news` | News sentiment, catalyst detection |
| **Finnhub** | `/stock/recommendation` | Analyst consensus (Strong Buy → Strong Sell) |
| **Finnhub** | `/stock/insider-transactions` | Insider buy/sell activity |
| **Supabase** | `stocks` table | Beta, ROE, ROA, operating margin, next earnings |
