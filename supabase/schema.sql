-- Portfolio Command Center — Supabase schema (anon key, single-user)
-- Run in Supabase SQL Editor. See SUPABASE_SETUP.md for step-by-step instructions.
--
-- JSON CONTRACT (domain types in src/core/domain/types/)
-- Each row's `data` column stores the full TypeScript object — no field stripping.
-- Derived metrics (available trading cash, P/L legs, holdings) are recomputed at
-- runtime from these tables plus settings.* jsonb columns.
--
--   contributions.data     → ContributionTransaction
--     { id, date, type: deposit|withdrawal, category: stock|crypto|cash,
--       amountSgd, notes?, usdAllocationPercent?, fxRate? }
--     Stock/crypto/cash deposits & withdrawals live HERE (not in stock_transactions
--     or crypto_transactions). category=cash is personal cash only.
--
--   goals.data             → Goal
--     { id, name, targetAmountSgd, targetDate?, active }
--
--   daily_snapshots        → DailySnapshot (typed columns; preferred)
--     snapshot_date (SGT calendar date), type manual|automatic, portfolio fields
--
--   portfolio_snapshots.data → DailySnapshot (legacy JSON — migrated to daily_snapshots)
--   stock_transactions.data → StockTransaction (buy|sell|dividend|fee only)
--     { id, date, market, ticker, assetName, instrumentType?, transactionType,
--       quantity, price, grossAmount, fees, netAmount, currency, notes?, createdAt }
--     All stock is personal/own portfolio — no personal/client field by design.
--
--   stock_fx_conversions.data → StockFxConversion (SGD ↔ USD pool transfers)
--     { id, date, direction: sgd_to_usd|usd_to_sgd, sgdAmount, usdAmount,
--       notes?, createdAt }
--     FX rate is derived at runtime: sgdAmount / usdAmount. Does not affect contribution.
--
--   crypto_transactions.data → CryptoHolding (manual valuation rows, NOT a cash ledger)
--     { id, assetName, investedSgd, feesSgd?, currentValueSgd, notes? }
--     Crypto deposits/withdrawals are in contributions (category=crypto).
--
--   crypto_trades.data → CryptoTrade (buy/sell ledger)
--     { id, date: "YYYY-MM-DD", assetName, type: buy|sell, amountSgd, feesSgd?, notes?, createdAt? }
--     Stored as JSON in `data` column (id + data + updated_at). date must be YYYY-MM-DD for user trades.
--
--   options_trades.data    → OptionsTrade
--     { id, status, tradeType: personal|shared, userSharePercent, clientSharePercent,
--       strategy, strikes, premiums, maxRiskUsd, currentValueUsd?, realizedPlUsd?, ... }
--     Personal vs shared + client split % are per-trade fields. Client starting capital
--     and default split defaults are in settings.options_settings (OptionsSettings).
--
--   settings (singleton)   — required for FX, options client capital, stock prices:
--     dashboard_settings   → { usdSgdFxRate, manualValues }
--     options_settings     → { clientName, clientStartingCapitalUsd,
--       defaultSharedUserPercent, defaultSharedClientPercent, updatedAt }

-- ---------------------------------------------------------------------------
-- settings (singleton row — dashboard, options, market cache, scanner state)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id text PRIMARY KEY DEFAULT 'default',
  dashboard_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  options_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  crypto_allocation_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  scanner_schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  stock_price_schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  stock_instruments jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock_prices jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock_daily_candles jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock_weekly_candles jsonb NOT NULL DEFAULT '[]'::jsonb,
  scanner_results jsonb NOT NULL DEFAULT '{"latest":null,"previous":null}'::jsonb,
  migrated_from_local boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- contributions (Settings → Contributions ledger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contributions (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- goals (Settings → Goals)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- daily_snapshots (Settings → Snapshots + Vercel Cron 11:59 PM SGT capture)
-- One row per Singapore calendar date (snapshot_date UNIQUE).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  type text NOT NULL CHECK (type IN ('manual', 'automatic')),
  my_portfolio_sgd numeric NOT NULL,
  total_portfolio_sgd numeric NOT NULL,
  client_equity_sgd numeric NOT NULL DEFAULT 0,
  us_stocks_sgd numeric NOT NULL DEFAULT 0,
  sg_stocks_sgd numeric NOT NULL DEFAULT 0,
  crypto_sgd numeric NOT NULL DEFAULT 0,
  personal_cash_sgd numeric NOT NULL DEFAULT 0,
  total_contribution_sgd numeric NOT NULL DEFAULT 0,
  fx_rate_used numeric,
  extended_data jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_snapshots_date_idx ON daily_snapshots (snapshot_date DESC);

-- ---------------------------------------------------------------------------
-- portfolio_snapshots (legacy JSON — migrated to daily_snapshots)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  date text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- stock_transactions (Stock Tracker ledger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_transactions (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- stock_fx_conversions (Stock Tracker cash flow — SGD ↔ USD conversions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_fx_conversions (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- crypto_transactions (Crypto Tracker holdings — manual valuation rows)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crypto_transactions (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- crypto_trades (Crypto Tracker buy/sell ledger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crypto_trades (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- options_trades (Options Tracker ledger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS options_trades (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- watchlist_items (Scanner default + custom watchlist)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS watchlist_items (
  id text PRIMARY KEY,
  ticker text NOT NULL,
  data jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS watchlist_items_sort_idx ON watchlist_items (sort_order);

-- ---------------------------------------------------------------------------
-- Row Level Security — permissive single-user (anon key only, no auth)
-- ---------------------------------------------------------------------------
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_fx_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE options_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pcc_settings_all" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pcc_contributions_all" ON contributions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pcc_goals_all" ON goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pcc_daily_snapshots_all" ON daily_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pcc_snapshots_all" ON portfolio_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pcc_stock_tx_all" ON stock_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pcc_stock_fx_all" ON stock_fx_conversions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pcc_crypto_tx_all" ON crypto_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pcc_crypto_trades_all" ON crypto_trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pcc_options_trades_all" ON options_trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pcc_watchlist_all" ON watchlist_items FOR ALL USING (true) WITH CHECK (true);
