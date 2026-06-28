import type { ScannerCandleBar } from "@/core/domain/types/scanner";
import { ema, type OhlcBar } from "./indicators";

/** Last N sessions with per-bar average price and EMA20 for chart display. */
export function buildRecentChartCandles(
  dailyBars: OhlcBar[],
  count = 5
): ScannerCandleBar[] {
  const recent = dailyBars.slice(-count);
  if (recent.length === 0) {
    return [];
  }

  const closes = dailyBars.map((bar) => bar.close);
  const startIndex = dailyBars.length - recent.length;

  return recent.map((bar, offset) => {
    const endIndex = startIndex + offset;
    const closesUpTo = closes.slice(0, endIndex + 1);
    const ema20Value = closesUpTo.length >= 20 ? ema(closesUpTo, 20) : null;

    return {
      date: bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      avgPrice: (bar.high + bar.low) / 2,
      ema20: ema20Value,
    };
  });
}

export type PrimarySuggestedStrategy = "SELL PUT" | "SELL CALL" | "NEUTRAL";

export function derivePrimarySuggestedStrategy(
  avgPrice: number | null,
  ema20: number | null
): PrimarySuggestedStrategy | null {
  if (avgPrice == null || ema20 == null) {
    return null;
  }
  if (avgPrice > ema20) {
    return "SELL PUT";
  }
  if (avgPrice < ema20) {
    return "SELL CALL";
  }
  return "NEUTRAL";
}
