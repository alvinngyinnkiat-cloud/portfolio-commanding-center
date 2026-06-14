/** localStorage keys — map 1:1 to future Supabase tables */
export const STORAGE_KEYS = {
  dashboardSettings: "portfolio:dashboard_settings",
  contributions: "portfolio:contributions",
  goals: "portfolio:goals",
  snapshots: "portfolio:snapshots",
  stockTransactions: "portfolio:stock_transactions",
  stockInstruments: "portfolio:stock_instruments",
  stockPrices: "portfolio:stock_prices",
  stockPriceSchedule: "portfolio:stock_price_schedule",
  stockDailyCandles: "portfolio:stock_daily_candles",
  stockWeeklyCandles: "portfolio:stock_weekly_candles",
  scannerResults: "portfolio:scanner_results",
  scannerSchedule: "portfolio:scanner_schedule",
  scannerWatchlist: "portfolio:scanner_watchlist",
  cryptoHoldings: "portfolio:crypto_holdings",
  cryptoAllocationSettings: "portfolio:crypto_allocation_settings",
  optionsTrades: "portfolio:options_trades",
  optionsSettings: "portfolio:options_settings",
  /** Legacy v1 blob — migrated on first load */
  legacy: "portfolio-dashboard-settings",
} as const;
