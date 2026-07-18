import type { ScannerCandleBar } from "@/core/domain/types/scanner";

export type AlignedChartStatus = "aligned" | "unavailable";

export interface AlignedChartData {
  ticker: string;
  marketSession: string | null;
  /** Latest completed daily candle close — same as latestCandle.close when aligned. */
  currentPrice: number | null;
  candles: ScannerCandleBar[];
  latestCandle: ScannerCandleBar | null;
  currentAveragePrice: number | null;
  previousAveragePrice: number | null;
  atr14: number | null;
  source: string | null;
  refreshedAt: string | null;
  status: AlignedChartStatus;
  showCurrentPriceLine: boolean;
}
