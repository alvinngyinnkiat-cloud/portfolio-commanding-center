export type CurrentPriceStatus = "fresh" | "fallback" | "stale" | "unavailable";

export type CurrentPriceSourceKey =
  | "primary_quote"
  | "fmp_fallback"
  | "daily_close"
  | "stored_candle"
  | "manual_fallback"
  | "saved_trade";

/** Runtime result returned by CurrentPriceService for one ticker. */
export interface CurrentPriceResult {
  ticker: string;
  currentPrice: number | null;
  marketSession: string | null;
  refreshedAt: string | null;
  source: string | null;
  sourceKey: CurrentPriceSourceKey | null;
  status: CurrentPriceStatus;
  error: string | null;
}

/** Centrally persisted current-price record — one latest row per normalized ticker. */
export interface PersistedCurrentPriceRecord {
  ticker: string;
  currentPrice: number;
  marketSession: string;
  refreshedAt: string;
  source: string;
  sourceKey: CurrentPriceSourceKey;
  status: CurrentPriceStatus;
  refreshRunId: string;
}

export type CurrentPriceRefreshPhase = "refreshing" | "saving" | "complete";

export interface CurrentPriceRefreshProgress {
  phase: CurrentPriceRefreshPhase;
  completed: number;
  total: number;
  message: string;
}

export interface CurrentPriceRefreshBatchResult {
  refreshRunId: string;
  results: CurrentPriceResult[];
  successfulTickers: string[];
  failedTickers: Array<{ ticker: string; error: string }>;
  status: "success" | "partial_success" | "failed";
}
