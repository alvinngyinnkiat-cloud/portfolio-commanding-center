import { describe, expect, it } from "vitest";
import { resolveAlignedChartData } from "./resolve-aligned-chart-data";

describe("resolveAlignedChartData", () => {
  it("uses latest completed candle close as current price", () => {
    const daily = [
      { market: "US" as const, ticker: "VRT", date: "2026-07-14", open: 280, high: 285, low: 278, close: 282, source: "yahoo" as const, fetchedAt: "x" },
      { market: "US" as const, ticker: "VRT", date: "2026-07-15", open: 283, high: 290, low: 281, close: 289.56, source: "yahoo" as const, fetchedAt: "x" },
    ];

    const resolved = resolveAlignedChartData({
      ticker: "VRT",
      dailyCandles: daily,
    });

    expect(resolved.status).toBe("aligned");
    expect(resolved.marketSession).toBe("2026-07-15");
    expect(resolved.currentPrice).toBe(289.56);
    expect(resolved.latestCandle?.close).toBe(289.56);
    expect(resolved.showCurrentPriceLine).toBe(true);
    expect(resolved.source).toBe("Daily close");
    const latest = resolved.latestCandle!;
    expect(resolved.currentPrice).toBeGreaterThanOrEqual(latest.low);
    expect(resolved.currentPrice).toBeLessThanOrEqual(latest.high);
  });

  it("returns last five completed candles ending at latest session", () => {
    const daily = Array.from({ length: 7 }, (_, index) => ({
      market: "US" as const,
      ticker: "QQQ",
      date: `2026-07-${String(9 + index).padStart(2, "0")}`,
      open: 500 + index,
      high: 505 + index,
      low: 498 + index,
      close: 503 + index,
      source: "yahoo" as const,
      fetchedAt: "x",
    }));

    const resolved = resolveAlignedChartData({
      ticker: "QQQ",
      dailyCandles: daily,
    });

    expect(resolved.candles).toHaveLength(5);
    expect(resolved.candles[4]?.date).toBe("2026-07-15");
    expect(resolved.currentPrice).toBe(resolved.candles[4]?.close);
  });

  it("returns unavailable when no candles exist", () => {
    const resolved = resolveAlignedChartData({
      ticker: "SPCX",
      dailyCandles: [],
    });

    expect(resolved.status).toBe("unavailable");
    expect(resolved.currentPrice).toBeNull();
    expect(resolved.showCurrentPriceLine).toBe(false);
  });
});
