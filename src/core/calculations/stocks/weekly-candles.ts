import type { StockDailyCandle, StockWeeklyCandle } from "@/core/domain/types";

/** Aggregate daily candles into US week-ending Friday bars. */
export function aggregateWeeklyCandles(
  daily: StockDailyCandle[]
): StockWeeklyCandle[] {
  if (daily.length === 0) {
    return [];
  }

  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const buckets = new Map<
    string,
    {
      open: number;
      high: number;
      low: number;
      close: number;
      lastDate: string;
    }
  >();

  for (const bar of sorted) {
    const weekKey = getWeekEndingFriday(bar.date);
    const existing = buckets.get(weekKey);
    if (!existing) {
      buckets.set(weekKey, {
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        lastDate: bar.date,
      });
      continue;
    }
    existing.high = Math.max(existing.high, bar.high);
    existing.low = Math.min(existing.low, bar.low);
    existing.close = bar.close;
    existing.lastDate = bar.date;
  }

  const { market, ticker } = sorted[0];
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekEnding, bar]) => ({
      market,
      ticker,
      date: weekEnding,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    }));
}

function getWeekEndingFriday(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00Z`);
  const day = date.getUTCDay();
  const daysUntilFriday = (5 - day + 7) % 7;
  date.setUTCDate(date.getUTCDate() + daysUntilFriday);
  return date.toISOString().slice(0, 10);
}

export function getLatestCandleDate(
  candles: Array<{ date: string }>
): string | null {
  if (candles.length === 0) {
    return null;
  }
  return candles[candles.length - 1].date;
}
