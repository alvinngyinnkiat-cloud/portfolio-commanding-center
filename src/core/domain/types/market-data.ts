import type {
  ScannerCandleBar,
  ScannerIndicatorStatus,
  ScannerPriceStatus,
  ScannerTickerPriceSourceKey,
  ScannerTickerResult,
} from "./scanner";

/** Canonical persisted market-data record — one object per ticker per refresh. */
export interface MarketDataRecord {
  ticker: string;
  currentPrice: number;
  marketSession: string;
  refreshedAt: string;
  priceSource: string | null;
  priceSourceKey: ScannerTickerPriceSourceKey | null;
  priceStatus: ScannerPriceStatus | null;
  candles: ScannerCandleBar[];
  atr14: number | null;
  currentAveragePrice: number | null;
  previousAveragePrice: number | null;
  indicatorStatus: ScannerIndicatorStatus | null;
  refreshRunId: string;
  /** Full scanner payload from the same refresh (strategy UI only). */
  scannerResult: ScannerTickerResult;
  /** True when this record is not from the latest completed refresh run. */
  isStale: boolean;
}
