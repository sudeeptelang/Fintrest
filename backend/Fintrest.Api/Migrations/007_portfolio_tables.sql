-- Migration 007: Portfolio Management Tables
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS portfolios (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL DEFAULT 'My Portfolio',
    strategy VARCHAR(50),
    cash_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);

CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    stock_id BIGINT NOT NULL REFERENCES stocks(id),
    quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    current_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    current_value DOUBLE PRECISION NOT NULL DEFAULT 0,
    unrealized_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
    unrealized_pnl_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(portfolio_id, stock_id)
);
CREATE INDEX idx_portfolio_holdings_portfolio ON portfolio_holdings(portfolio_id);

CREATE TABLE IF NOT EXISTS portfolio_transactions (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    stock_id BIGINT NOT NULL REFERENCES stocks(id),
    type VARCHAR(10) NOT NULL CHECK (type IN ('BUY', 'SELL', 'DIVIDEND')),
    quantity DOUBLE PRECISION NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    fees DOUBLE PRECISION NOT NULL DEFAULT 0,
    total DOUBLE PRECISION NOT NULL,
    notes TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_portfolio_transactions_portfolio ON portfolio_transactions(portfolio_id, executed_at DESC);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_value DOUBLE PRECISION NOT NULL DEFAULT 0,
    cash_value DOUBLE PRECISION NOT NULL DEFAULT 0,
    invested_value DOUBLE PRECISION NOT NULL DEFAULT 0,
    daily_return_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
    cumulative_return_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
    UNIQUE(portfolio_id, date)
);
CREATE INDEX idx_portfolio_snapshots_portfolio_date ON portfolio_snapshots(portfolio_id, date DESC);

CREATE TABLE IF NOT EXISTS portfolio_ai_recommendations (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    stock_id BIGINT REFERENCES stocks(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('REBALANCE', 'REDUCE', 'ADD', 'TAX_LOSS', 'ALERT')),
    ticker VARCHAR(10),
    action VARCHAR(20) NOT NULL CHECK (action IN ('BUY', 'SELL', 'HOLD', 'REDUCE', 'INCREASE')),
    reasoning TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPLIED', 'DISMISSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_portfolio_ai_recs_portfolio ON portfolio_ai_recommendations(portfolio_id, created_at DESC);

CREATE TABLE IF NOT EXISTS portfolio_risk_metrics (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sharpe_ratio DOUBLE PRECISION,
    sortino_ratio DOUBLE PRECISION,
    max_drawdown DOUBLE PRECISION,
    beta DOUBLE PRECISION,
    var_95 DOUBLE PRECISION,
    volatility DOUBLE PRECISION,
    total_return DOUBLE PRECISION,
    UNIQUE(portfolio_id, date)
);
CREATE INDEX idx_portfolio_risk_metrics_portfolio_date ON portfolio_risk_metrics(portfolio_id, date DESC);

-- Enable RLS (optional — add policies as needed)
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_risk_metrics ENABLE ROW LEVEL SECURITY;
