import { describe, expect, it } from "vitest";
import { scanTicker, SCANNER_INDICATOR_CANDLES_REQUIRED } from "./scan";

const entry = {
  ticker: "AAPL",
  category: "Custom" as const,
  market: "US" as const,
  active: true,
};

function makeDailyCandles(count: number, latestDate = "2026-07-23") {
  return Array.from({ length: count }, (_, index) => {
    const day = index + 1;
    const date =
      index === count - 1
        ? latestDate
        : `2023-${String(Math.floor((day - 1) / 28) + 1).padStart(2, "0")}-${String(((day - 1) % 28) + 1).padStart(2, "0")}`;
    const close = index === count - 1 ? 218.5 : 200 + (index % 10);
    return {
      market: "US" as const,
      ticker: "AAPL",
      date,
      open: close - 1,
      high: close + 2,
      low: close - 2,
      close,
    };
  });
}

describe("scanTicker verified candle alignment", () => {
  it("aligns current price, market date, and indicator sessions on latest completed candle", () => {
    const result = scanTicker({
      entry,
      dailyCandles: makeDailyCandles(SCANNER_INDICATOR_CANDLES_REQUIRED, "2026-07-23"),
      weeklyCandles: [],
      price: null,
    });

    expect(result.status).toBe("ok");
    expect(result.priceAsOf).toBe("2026-07-23");
    expect(result.currentPrice).toBe(218.5);
    expect(result.recentCandles.at(-1)?.date).toBe("2026-07-23");
    expect(result.indicators.soDebug?.sessionDate).toBe("2026-07-23");
    expect(result.indicators.atrDebug?.sessionDate).toBe("2026-07-23");
  });

  it("uses deduped latest candle when duplicate trading dates exist", () => {
    const candles = makeDailyCandles(SCANNER_INDICATOR_CANDLES_REQUIRED, "2026-07-23");
    candles.push({
      market: "US",
      ticker: "AAPL",
      date: "2026-07-23",
      open: 214,
      high: 221,
      low: 213,
      close: 219.75,
    });

    const result = scanTicker({
      entry,
      dailyCandles: candles,
      weeklyCandles: [],
      price: null,
    });

    expect(result.currentPrice).toBe(219.75);
    expect(result.priceAsOf).toBe("2026-07-23");
    expect(result.indicators.soDebug?.sessionDate).toBe("2026-07-23");
  });
});
