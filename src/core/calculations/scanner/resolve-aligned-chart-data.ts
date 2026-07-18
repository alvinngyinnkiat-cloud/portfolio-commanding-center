import type { StockDailyCandle } from "@/core/domain/types";
import type { ScannerCandleBar } from "@/core/domain/types/scanner";
import type { AlignedChartData } from "@/core/domain/types/aligned-chart-data";
import { buildRecentChartCandles } from "./chart-candles";
import { filterCompletedDailyCandles, type OhlcBar } from "./indicators";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { DAILY_CLOSE_SOURCE_LABEL } from "./resolve-current-price";

export interface ResolveAlignedChartDataInput {
  ticker: string;
  dailyCandles: StockDailyCandle[];
  scannerChartCandles?: ScannerCandleBar[];
  currentAveragePrice?: number | null;
  previousAveragePrice?: number | null;
  atr14?: number | null;
  refreshedAt?: string | null;
}

/** Normalize any market-session string to YYYY-MM-DD (US session date). */
export function normalizeMarketSessionDate(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function toOhlcBars(
  dailyCandles: StockDailyCandle[],
  scannerChartCandles: ScannerCandleBar[]
): OhlcBar[] {
  if (dailyCandles.length > 0) {
    return dailyCandles.map((bar) => ({
      date: normalizeMarketSessionDate(bar.date) ?? bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    }));
  }

  return scannerChartCandles.map((bar) => ({
    date: normalizeMarketSessionDate(bar.date) ?? bar.date,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  }));
}

function buildEmptyResult(ticker: string): AlignedChartData {
  return {
    ticker: normalizeTicker(ticker),
    marketSession: null,
    currentPrice: null,
    candles: [],
    latestCandle: null,
    currentAveragePrice: null,
    previousAveragePrice: null,
    atr14: null,
    source: null,
    refreshedAt: null,
    status: "unavailable",
    showCurrentPriceLine: false,
  };
}

/**
 * Shared read-only chart dataset for Scanner and Income charts.
 * Current Price = close of the latest completed daily candle in the chart set.
 */
export function resolveAlignedChartData(
  input: ResolveAlignedChartDataInput
): AlignedChartData {
  const ticker = normalizeTicker(input.ticker);
  const rawBars = toOhlcBars(input.dailyCandles, input.scannerChartCandles ?? []);
  const completed = filterCompletedDailyCandles(
    [...rawBars].sort((a, b) => a.date.localeCompare(b.date))
  );

  if (completed.length === 0) {
    return buildEmptyResult(ticker);
  }

  const latestBar = completed[completed.length - 1]!;
  const candles = buildRecentChartCandles(completed, 5);
  const latestCandle = candles[candles.length - 1] ?? null;
  const currentPrice = latestBar.close;

  return {
    ticker,
    marketSession: latestBar.date,
    currentPrice,
    candles,
    latestCandle,
    currentAveragePrice: input.currentAveragePrice ?? null,
    previousAveragePrice: input.previousAveragePrice ?? null,
    atr14: input.atr14 ?? null,
    source: DAILY_CLOSE_SOURCE_LABEL,
    refreshedAt: input.refreshedAt ?? null,
    status: "aligned",
    showCurrentPriceLine: latestCandle != null,
  };
}
