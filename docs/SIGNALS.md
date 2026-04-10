# Fintrest.ai — Signal Scoring Engine

Signals are generated nightly (6:00 AM ET) and scored across 7 dimensions.

## Scoring Dimensions

| Dimension | Weight | Data Source |
|-----------|--------|-------------|
| Momentum | 25% | MACD, RSI, price vs MAs |
| Relative Volume | 15% | Today vs 20-day avg volume |
| News Catalyst | 15% | Finnhub news sentiment + recency |
| Earnings / Fundamentals | 15% | FMP — EPS beat, P/E, revenue growth |
| Sentiment | 10% | Social sentiment + analyst consensus |
| Trend Strength | 10% | Above 20/50/200 MA alignment |
| Risk Filter | 10% | Earnings proximity, volatility, sector risk |

## Composite Score

```
composite = (momentum * 0.25) + (rel_volume * 0.15) + (news * 0.15) +
            (fundamentals * 0.15) + (sentiment * 0.10) +
            (trend * 0.10) + (risk * 0.10)
```

## Signal Thresholds

- `>= 75` — **BUY TODAY**
- `60-74` — **WATCH**
- `40-59` — NEUTRAL (not shown to users)
- `< 40` — **AVOID**

## Filters

- **R:R filter:** Only signals with Risk:Reward >= 1.5 are published
- **Risk warnings auto-generated when:**
  - Earnings within 21 days
  - RSI > 75 (overbought)
  - Short interest > 15%
  - Beta > 2.5
