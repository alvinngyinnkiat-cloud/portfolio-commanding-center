import { describe, expect, it } from "vitest";
import {
  STOCHASTIC_K_PERIOD,
  STOCHASTIC_K_SMOOTHING,
  computeStochastic1033,
  filterCompletedDailyCandles,
  type OhlcBar,
} from "./indicators";
import { deriveSoStatus } from "./ema-strategy";
import { fetchYahooHistory } from "@/core/services/yahoo-history-provider";

function makeBars(closes: number[]): OhlcBar[] {
  return closes.map((close, index) => {
    const day = index + 1;
    return {
      date: `2025-01-${String(day).padStart(2, "0")}`,
      open: close - 0.5,
      high: close + 2,
      low: close - 2,
      close,
    };
  });
}

describe("computeStochastic1033", () => {
  it("uses 10-period lookback and 3-period %K smoothing", () => {
    const closes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    const candles = makeBars(closes);

    const rawK: number[] = [];
    for (let i = STOCHASTIC_K_PERIOD - 1; i < candles.length; i += 1) {
      const window = candles.slice(i - STOCHASTIC_K_PERIOD + 1, i + 1);
      const highest = Math.max(...window.map((row) => row.high));
      const lowest = Math.min(...window.map((row) => row.low));
      const close = candles[i].close;
      rawK.push(((close - lowest) / (highest - lowest)) * 100);
    }

    const expectedCurrent =
      (rawK.at(-1)! + rawK.at(-2)! + rawK.at(-3)!) / STOCHASTIC_K_SMOOTHING;
    const expectedPrev =
      (rawK.at(-2)! + rawK.at(-3)! + rawK.at(-4)!) / STOCHASTIC_K_SMOOTHING;

    const { so, soPrev } = computeStochastic1033(candles);
    expect(so).toBeCloseTo(expectedCurrent, 8);
    expect(soPrev).toBeCloseTo(expectedPrev, 8);
  });

  it("returns null when history is shorter than 10/3 minimum", () => {
    expect(computeStochastic1033(makeBars([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toEqual({
      so: null,
      soPrev: null,
    });
  });
});

describe("filterCompletedDailyCandles", () => {
  it("removes the in-progress US session bar", () => {
    const usToday = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .reduce<Record<string, string>>((acc, part) => {
        if (part.type !== "literal") acc[part.type] = part.value;
        return acc;
      }, {});
    const today = `${usToday.year}-${usToday.month}-${usToday.day}`;

    const candles: OhlcBar[] = [
      { date: "2025-01-01", open: 1, high: 2, low: 0.5, close: 1.5 },
      { date: today, open: 2, high: 3, low: 1.5, close: 2.5 },
    ];

    const filtered = filterCompletedDailyCandles(candles);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.date).toBe("2025-01-01");
  });
});

describe("SO status rules", () => {
  it("derives Rolling Up / Rolling Down / Strong from 10/3 SO values", () => {
    expect(deriveSoStatus(30, 20)).toBe("Rolling Up");
    expect(deriveSoStatus(70, 80)).toBe("Rolling Down");
    expect(deriveSoStatus(50, 45)).toBe("Strong");
  });
});

describe("V ticker TradingView alignment", () => {
  it(
    "matches TradingView Stochastic 10/3 on completed V daily candles",
    async () => {
      const result = await fetchYahooHistory({
        market: "US",
        ticker: "V",
        displayTicker: "V",
      });

      expect(result.candles.length).toBeGreaterThan(200);

      const completed = filterCompletedDailyCandles(result.candles);
      const { so, soPrev } = computeStochastic1033(completed);
      const status = deriveSoStatus(so, soPrev);
      const lastDate = completed.at(-1)?.date;

      expect(so).not.toBeNull();
      expect(soPrev).not.toBeNull();
      expect(lastDate).toBeTruthy();

      console.log("[scanner-so-v-comparison]", {
        ticker: "V",
        lastCompletedSession: lastDate,
        scannerSo: so != null ? Number(so.toFixed(2)) : null,
        scannerSoPrev: soPrev != null ? Number(soPrev.toFixed(2)) : null,
        soStatus: status,
        tradingViewSettings: "Stochastic 10 / 3 · Daily · Close",
        tradingViewReference:
          "Compare %K on TradingView with Length=10, K Smoothing=3, D Smoothing=3",
      });
    },
    30_000
  );
});
