export type StockMarket = "US" | "SG";

export type StockCurrency = "USD" | "SGD";

export type StockTransactionType = "buy" | "sell" | "dividend" | "fee";

export type StockInstrumentType = "stock" | "etf";

export type StockPriceSource = "manual" | "yahoo";

export type PriceDisplaySource = "Auto" | "Manual" | "Missing";

/** Immutable ledger row — source of truth for stock positions. */
export interface StockTransaction {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  market: StockMarket;
  ticker: string;
  assetName: string;
  /** Display classification — does not affect holdings math */
  instrumentType?: StockInstrumentType;
  transactionType: StockTransactionType;
  quantity: number;
  price: number;
  grossAmount: number;
  fees: number;
  netAmount: number;
  currency: StockCurrency;
  notes?: string;
  /** ISO 8601 — tie-break for same-day ordering */
  createdAt: string;
}

/** Ticker metadata registry (denormalized from transactions in v1). */
export interface StockInstrument {
  market: StockMarket;
  ticker: string;
  assetName: string;
  currency: StockCurrency;
}

/** Latest known price per (market, ticker). */
export interface StockPrice {
  market: StockMarket;
  ticker: string;
  /** Auto-fetched price from Yahoo Finance */
  latestPrice: number;
  /** User override when auto price is unavailable */
  manualPrice?: number;
  lastPriceUpdate: string;
  manualPriceUpdatedAt?: string;
  /** YYYY-MM-DD (Singapore) */
  priceAsOf: string;
  source: StockPriceSource;
  /** True when the latest fetch failed — previous latestPrice is retained */
  priceUnavailable?: boolean;
  /**
   * Effective valuation price for holdings lookup.
   * Populated on read/write; not edited directly.
   */
  currentPrice?: number;
  /** @deprecated use lastPriceUpdate */
  updatedAt?: string;
}

/** Derived position — never stored as authoritative data. */
export interface CalculatedHolding {
  market: StockMarket;
  ticker: string;
  assetName: string;
  currency: StockCurrency;
  quantity: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number | null;
  marketValue: number;
  unrealisedPL: number;
  realisedPL: number;
  dividendIncome: number;
  /** Native market value converted to SGD; null when US and FX invalid */
  sgdValue: number | null;
}

export interface StockTrackerSummary {
  stockHoldingsValueSgd: number;
  stockContributionSgd: number;
  stockProfitLossSgd: number;
  availableTradingCashSgd: number;
  usAvailableTradingCashUsd: number;
  sgAvailableTradingCashSgd: number;
  totalStockValueSgd: number;
  netStockCashContributedSgd: number;
  usStockContributionSgd: number;
  sgStockContributionSgd: number;
  openPositionCount: number;
}

/** Prepared outputs for future Dashboard integration. */
export interface DashboardStockOutputs {
  stockHoldingsValueSgd: number;
  stockContributionSgd: number;
  stockProfitLossSgd: number;
  availableTradingCashSgd: number;
  totalStockValueSgd: number;
}

/** Daily OHLC bar — owned by Module 2 market data layer. */
export interface StockDailyCandle {
  market: StockMarket;
  ticker: string;
  /** YYYY-MM-DD session date */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  source: StockPriceSource;
  fetchedAt: string;
}

/** Weekly OHLC bar — derived from daily candles, Module 2 owned. */
export interface StockWeeklyCandle {
  market: StockMarket;
  ticker: string;
  /** YYYY-MM-DD week-ending date (Friday) */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Internal ledger state while processing transactions for one ticker. */
export interface PositionLedgerState {
  market: StockMarket;
  ticker: string;
  assetName: string;
  currency: StockCurrency;
  quantity: number;
  totalCost: number;
  realisedPL: number;
  dividendIncome: number;
}
