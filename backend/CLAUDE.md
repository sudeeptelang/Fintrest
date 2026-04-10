# Fintrest.ai — Backend (C# .NET API)

## Stack
- **C# .NET** Web API (`Fintrest.Api`)
- **PostgreSQL** via Supabase (primary DB)
- **Redis** for caching (signals, sessions)
- **Supabase Auth** (JWT tokens)
- **AWS SES** for email alerts + morning briefings
- **Stripe** for subscription billing
- **Twilio** for SMS (Elite plan only)

## Project Structure
```
backend/Fintrest.Api/
  Controllers/      # API endpoints
  Models/           # Entity models
  DTOs/             # Request/response objects
  Services/         # Business logic
  Data/             # EF Core DbContext, configurations
  Migrations/       # EF Core migrations
  core/             # Shared utilities
```

## Data Providers
- **Polygon.io** — real-time prices, OHLCV, options flow
- **Financial Modeling Prep (FMP)** — fundamentals, earnings, financials
- **Finnhub** — news sentiment, analyst ratings, social sentiment
- **Yahoo Finance** (fallback) — historical data

## Rules
- Never hardcode stock prices — always pull from data providers
- Cache signals in Redis, expire at next scan (6 AM ET)
- All Athena AI calls go through `claude-sonnet-4-20250514`
- Rate limit Athena calls per subscription plan
- Signal generation runs nightly at 6:00 AM ET
- Only publish signals with R:R >= 1.5
- Always include compliance disclaimers in AI-generated content

## Environment Variables
```
ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
POLYGON_API_KEY, FMP_API_KEY, FINNHUB_API_KEY
AWS_SES_ACCESS_KEY, AWS_SES_SECRET_KEY, AWS_SES_REGION
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
REDIS_URL
FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
```
