import type { ScannerCandleBar } from "@/core/domain/types/scanner";

export type AlignedChartStatus = "aligned" | "chart_data_pending";

export interface AlignedChartData {
  ticker: string;
  marketSession: string | null;
  /** Chart-aligned completed-session close — use for line, triggers, and aligned display. */
  currentPrice: number | null;
  /** Central persisted price — shown in info card when chart is pending. */
  displayCurrentPrice: number | null;
  candles: ScannerCandleBar[];
  latestCandle: ScannerCandleBar | null;
  currentAveragePrice: number | null;
  previousAveragePrice: number | null;
  atr14: number | null;
  source: string | null;
  refreshedAt: string | null;
  status: AlignedChartStatus;
  statusMessage: string | null;
  showCurrentPriceLine: boolean;
}

export const CHART_DATA_PENDING_MESSAGE =
  "CHART DATA PENDING — PRICE SESSION NEWER THAN CANDLES";
