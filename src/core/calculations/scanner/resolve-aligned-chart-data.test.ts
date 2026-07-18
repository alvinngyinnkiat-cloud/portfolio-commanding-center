import { describe, expect, it } from "vitest";
import {
  normalizeMarketSessionDate,
  resolveAlignedChartData,
} from "./resolve-aligned-chart-data";

describe("resolveAlignedChartData", () => {
  it("aligns current price to matching session candle close", () => {
    const daily = [
      { market: "US" as const, ticker: "VRT", date: "2026-07-14", open: 280, high: 285, low: 278, close: 282, source: "yahoo" as const, fetchedAt: "x" },
      { market: "US" as const, ticker: "VRT", date: "2026-07-15", open: 283, high: 290, low: 281, close: 289.56, source: "yahoo" as const, fetchedAt: "x" },
    ];

    const resolved = resolveAlignedChartData({
      ticker: "VRT",
      priceSession: "2026-07-15",
      centralCurrentPrice: 291,
      dailyCandles: daily,
    });

    expect(resolved.status).toBe("aligned");
    expect(resolved.marketSession).toBe("2026-07-15");
    expect(resolved.currentPrice).toBe(289.56);
    expect(resolved.latestCandle?.date).toBe("2026-07-15");
    expect(resolved.showCurrentPriceLine).toBe(true);
    const latest = resolved.latestCandle!;
    expect(resolved.currentPrice).toBeGreaterThanOrEqual(latest.low);
    expect(resolved.currentPrice).toBeLessThanOrEqual(latest.high);
  });

  it("returns chart_data_pending when price session is newer than candles", () => {
    const resolved = resolveAlignedChartData({
      ticker: "QQQ",
      priceSession: "2026-07-16",
      centralCurrentPrice: 505,
      dailyCandles: [
        { market: "US", ticker: "QQQ", date: "2026-07-15", open: 500, high: 504, low: 498, close: 503.12, source: "yahoo", fetchedAt: "x" },
      ],
    });

    expect(resolved.status).toBe("chart_data_pending");
    expect(resolved.showCurrentPriceLine).toBe(false);
    expect(resolved.currentPrice).toBeNull();
    expect(resolved.displayCurrentPrice).toBe(505);
    expect(resolved.latestCandle?.close).toBe(503.12);
  });

  it("uses supplemental fetched candle to align newer session", () => {
    const resolved = resolveAlignedChartData({
      ticker: "NVDA",
      priceSession: "2026-07-16",
      centralCurrentPrice: 140,
      dailyCandles: [
        { market: "US", ticker: "NVDA", date: "2026-07-15", open: 135, high: 138, low: 134, close: 137, source: "yahoo", fetchedAt: "x" },
      ],
      supplementalDailyBar: {
        date: "2026-07-16",
        open: 138,
        high: 142,
        low: 137,
        close: 141.25,
      },
    });

    expect(resolved.status).toBe("aligned");
    expect(resolved.currentPrice).toBe(141.25);
    expect(resolved.latestCandle?.date).toBe("2026-07-16");
  });

  it("normalizes market session dates to YYYY-MM-DD", () => {
    expect(normalizeMarketSessionDate("2026-07-15T00:00:00")).toBe("2026-07-15");
    expect(normalizeMarketSessionDate("2026-07-15")).toBe("2026-07-15");
  });
});
