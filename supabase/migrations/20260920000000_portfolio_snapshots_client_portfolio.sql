-- Optional denormalized client equity for portfolio_snapshots.
-- Canonical snapshot payload remains JSON in `data` (DailySnapshot.clientPortfolio).
ALTER TABLE portfolio_snapshots
  ADD COLUMN IF NOT EXISTS client_portfolio numeric;
