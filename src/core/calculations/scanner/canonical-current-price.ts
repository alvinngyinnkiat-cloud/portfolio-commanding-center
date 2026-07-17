import type { OhlcBar } from "./indicators";
import { filterCompletedDailyCandles } from "./indicators";

export interface CanonicalScannerCurrentPrice {
  currentPrice: number;
  marketDate: string;
}

export function resolveLatestCompletedDailyBar(
  dailyCandles: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
  }>
): OhlcBar | null {
  const completed = filterCompletedDailyCandles(
    dailyCandles.map((bar) => ({
      date: bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    }))
  );

  if (completed.length === 0) return null;

  const sorted = [...completed].sort((a, b) => a.date.localeCompare(b.date));
  return sorted[sorted.length - 1] ?? null;
}

/** Canonical scanner current price = close of latest completed daily candle. */
export function resolveCanonicalScannerCurrentPrice(
  dailyCandles: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
  }>
): CanonicalScannerCurrentPrice | null {
  const latest = resolveLatestCompletedDailyBar(dailyCandles);
  if (
    latest == null ||
    !Number.isFinite(latest.close) ||
    latest.close <= 0 ||
    !latest.date
  ) {
    return null;
  }

  return {
    currentPrice: latest.close,
    marketDate: latest.date,
  };
}

export function assertCurrentPriceWithinLatestCandle(input: {
  currentPrice: number | null;
  latestCandle: { high: number; low: number } | null;
  ticker?: string;
}): void {
  if (process.env.NODE_ENV === "production") return;
  if (input.currentPrice == null || input.latestCandle == null) return;

  const { high, low } = input.latestCandle;
  const min = Math.min(high, low);
  const max = Math.max(high, low);

  if (input.currentPrice < min || input.currentPrice > max) {
    console.warn("[scanner-current-price] Current Price outside latest candle range.", {
      ticker: input.ticker,
      currentPrice: input.currentPrice,
      latestCandle: input.latestCandle,
    });
  }
}
