import { describe, expect, it } from "vitest";
import {
  ATR_PERIOD,
  computeAtr14Rma,
  computeStochastic1033,
  computeTrueRanges,
  filterCompletedDailyCandles,
  STOCHASTIC_K_PERIOD,
  STOCHASTIC_K_SMOOTHING,
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
  it("uses 10-period lookback and 3-period %K smoothing in debug", () => {
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

    const expectedRaw = rawK.at(-1)!;
    const expectedSmoothed =
      (rawK.at(-1)! + rawK.at(-2)! + rawK.at(-3)!) / STOCHASTIC_K_SMOOTHING;

    const result = computeStochastic1033(candles);
    expect(result.so).toBeCloseTo(expectedRaw, 8);
    expect(result.debug.rawK).toBeCloseTo(expectedRaw, 8);
    expect(result.debug.smoothedK3).toBeCloseTo(expectedSmoothed, 8);
    expect(result.debug.scannerSoUsed).toBeCloseTo(expectedRaw, 8);
  });

  it("returns null when history is shorter than 10 bars", () => {
    expect(computeStochastic1033(makeBars([1, 2, 3, 4, 5])).so).toBeNull();
  });
});

describe("filterCompletedDailyCandles", () => {
  it("keeps the latest bar unless it is today's in-progress US session", () => {
    const candles: OhlcBar[] = [
      { date: "2026-06-11", open: 1, high: 2, low: 0.5, close: 1.5 },
      { date: "2026-06-12", open: 2, high: 3, low: 1.5, close: 2.5 },
      { date: "2026-06-15", open: 2, high: 3, low: 1.5, close: 2.5 },
    ];

    const filtered = filterCompletedDailyCandles(candles);
    expect(filtered.at(-1)?.date).toBe("2026-06-15");
  });
});

describe("SO status rules", () => {
  it("derives Rolling Up / Rolling Down / Strong", () => {
    expect(deriveSoStatus(30, 20)).toBe("Rolling Up");
    expect(deriveSoStatus(70, 80)).toBe("Rolling Down");
    expect(deriveSoStatus(50, 45)).toBe("Strong");
  });
});

describe("V ticker TradingView alignment", () => {
  it(
    "matches TradingView Stochastic 10/3 Raw %K on latest V daily session",
    async () => {
      const result = await fetchYahooHistory({
        market: "US",
        ticker: "V",
        displayTicker: "V",
      });

      expect(result.candles.length).toBeGreaterThan(200);

      const completed = filterCompletedDailyCandles(result.candles);
      const stochastic = computeStochastic1033(completed);
      const status = deriveSoStatus(stochastic.so, stochastic.soPrev);

      expect(stochastic.so).not.toBeNull();
      expect(stochastic.debug.rawK).toBe(stochastic.so);
      expect(stochastic.debug.scannerSoUsed).toBe(stochastic.so);

      console.log("[scanner-so-v-comparison]", {
        ticker: "V",
        sessionDate: stochastic.debug.sessionDate,
        tradingViewReferenceSo: 82.81,
        scannerSo: stochastic.so != null ? Number(stochastic.so.toFixed(2)) : null,
        scannerSmoothedK3:
          stochastic.debug.smoothedK3 != null
            ? Number(stochastic.debug.smoothedK3.toFixed(2))
            : null,
        scannerSoPrev:
          stochastic.soPrev != null ? Number(stochastic.soPrev.toFixed(2)) : null,
        soStatus: status,
        lowestLow10: stochastic.debug.lowestLow10,
        highestHigh10: stochastic.debug.highestHigh10,
      });

      expect(stochastic.so!).toBeGreaterThan(75);
      expect(stochastic.so!).toBeCloseTo(82.81, 0);
    },
    30_000
  );

  it(
    "matches TradingView ATR 14 RMA on latest V daily session",
    async () => {
      const result = await fetchYahooHistory({
        market: "US",
        ticker: "V",
        displayTicker: "V",
      });

      const completed = filterCompletedDailyCandles(result.candles);
      const atrResult = computeAtr14Rma(completed);
      const trueRanges = computeTrueRanges(completed);

      expect(atrResult.atr).not.toBeNull();
      expect(atrResult.debug.method).toBe("RMA / Wilder");
      expect(atrResult.debug.last14TrueRanges.length).toBe(ATR_PERIOD);
      expect(atrResult.debug.scannerAtrUsed).toBe(atrResult.atr);

      console.log("[scanner-atr-v-comparison]", {
        ticker: "V",
        sessionDate: atrResult.debug.sessionDate,
        tradingViewReferenceAtr: 6.8,
        scannerAtr:
          atrResult.atr != null ? Number(atrResult.atr.toFixed(2)) : null,
        last14TrueRanges: atrResult.debug.last14TrueRanges.map((tr) =>
          Number(tr.toFixed(4))
        ),
      });

      expect(atrResult.atr!).toBeGreaterThan(6);
      expect(atrResult.atr!).toBeLessThan(7.5);
      expect(atrResult.atr!).toBeCloseTo(6.8, 0);
    },
    30_000
  );
});
