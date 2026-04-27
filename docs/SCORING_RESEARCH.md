# Scoring Model — Industry Research & Comparison

> Research compiled 2026-04-26. Used as input for Fintrest's scoring model
> evolution. See SIGNALS.md for the live model.

## Best industry approach

The most industry-wide approach to find the "top 10 stocks" is a **multi-factor
equity ranking model with a risk-model overlay**, not a single AI/LLM model.

- **Axioma** — equity factor risk models using fundamental style, industry, and
  statistical factors, with long daily histories for portfolio construction
  (SimCorp Axioma).
- **MSCI Barra** — diversified multi-factor index construction using Barra
  factor exposures for Momentum, Value, Quality, and Low Size while controlling
  ex-ante risk versus a parent index.
- **BlackRock / iShares factor products** — target historically rewarded
  factors: Value, Quality, Momentum, Low Size, Minimum Volatility.

## Practical Top-10 Model (canonical multi-factor)

| Factor              | Weight | What it captures |
|---------------------|-------:|------------------|
| Momentum            | 25%    | Strong 3M / 6M / 12M relative strength |
| Earnings Revisions  | 20%    | Analysts raising EPS / revenue estimates |
| Quality             | 20%    | High ROE/ROIC, strong margins, FCF, manageable debt |
| Growth              | 15%    | Revenue / EPS growth, especially durable growth |
| Valuation           | 10%    | P/E, EV/EBITDA, PEG, FCF yield vs peers |
| Liquidity / Risk    | 10%    | Volume, volatility, drawdown filter |

Academic foundation: **Fama-French** factors (market, size, value, profitability,
investment) + **Carhart momentum**. Practitioners overlay live earnings
revisions, price momentum, liquidity filters, and risk constraints.

## Workflow

1. Define universe (S&P 500 / Nasdaq 100 for liquid US names).
2. Remove bad candidates (low volume, weak balance sheets, accounting issues, gaps).
3. Score every stock 0–100 on each factor.
4. Convert each factor to a z-score (cross-sectional comparability).
5. Apply weights:
   `Score = 0.25·M + 0.20·E + 0.20·Q + 0.15·G + 0.10·V + 0.10·R`
6. Rank by final score.
7. Pick top 10 with **sector caps** (no 8 semis).
8. Rebalance weekly (trading) or monthly (investing).

## Time-horizon variants

| Use case            | Best model                                  |
|---------------------|----------------------------------------------|
| Tomorrow / this week| Momentum + volume + catalyst                 |
| 1–3 months          | Momentum + earnings revision                 |
| 6–12 months         | Quality + growth + valuation                 |
| Pro portfolio       | Multi-factor + Barra/Axioma risk overlay     |

## How Fintrest's current model compares

| Concept                | Industry % | Fintrest current |
|------------------------|-----------:|------------------|
| Momentum               | 25%        | 14% |
| Earnings revisions     | 20%        | not separate (inside Catalyst at 6%) |
| Quality                | 20%        | not separate (inside Fundamental at 20%) |
| Growth                 | 15%        | not separate (inside Fundamental at 20%) |
| Valuation              | 10%        | not separate (inside Fundamental at 20%) |
| Liquidity / Risk       | 10%        | Risk 10% + Volume 6% |
| Smart Money (TipRanks) | n/a        | **25%** |
| Trend                  | n/a        | 11% |
| Sentiment              | n/a        | 8% |

### Notes

- **Smart Money is NOT in the academic model.** TipRanks Smart Score includes
  it (Hedge Fund + Insider as 2 of 8 = 25%); academic models treat it as alpha
  overlay (<10%).
- **Fintrest's "Fundamental" rolls Quality + Growth + Valuation into one
  factor.** Decomposing it is the path to closer industry alignment — already
  partially done via §14.1 Q/P/G subscores.
- **"Earnings Revisions" is a separate factor in industry models.** Fintrest
  currently buries it inside "Catalyst" (which also covers events / earnings
  proximity).

## Possible evolution path

To converge on the academic multi-factor model while preserving Smart Money:

| Factor              | Proposed Weight |
|---------------------|----------------:|
| Smart Money         | 20%             |
| Quality             | 15%             |
| Momentum            | 15%             |
| Growth              | 12%             |
| Earnings Revisions  | 10%             |
| Valuation           | 8%              |
| Risk                | 8%              |
| Trend               | 6%              |
| Sentiment           | 3%              |
| Volume / Liquidity  | 3%              |

This is a 10-factor model (decomposed Fundamental + separate Earnings
Revisions). Closer to Barra/Axioma while keeping Smart Money's 20% (TipRanks
floor, academic alpha-parity ceiling).

## Disclaimer

Research and analysis only — not personalized financial advice. Consult a
qualified financial advisor before making investment decisions.
