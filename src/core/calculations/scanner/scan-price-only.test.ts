import { describe, expect, it } from "vitest";
import { scanTicker, SCANNER_INDICATOR_CANDLES_REQUIRED } from "./scan";

const entry = {
  ticker: "SPCX",
  category: "Custom" as const,
  market: "US" as const,
  active: true,
};

function makeCandles(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    market: "US" as const,
    ticker: "SPCX",
    date: `2020-01-${String((index % 28) + 1).padStart(2, "0")}`,
    open: 130,
    high: 136,
    low: 129,
    close: 135.27,
  }));
}

describe("scanTicker price-only path", () => {
  it("returns valid current price when indicator history is insufficient", () => {
    const result = scanTicker({
      entry,
      dailyCandles: makeCandles(14),
      weeklyCandles: [],
      price: null,
    });

    expect(result.status).toBe("price_only");
    expect(result.indicatorStatus).toBe("insufficient_history");
    expect(result.currentPrice).toBe(135.27);
    expect(result.priceAsOf).toBeTruthy();
    expect(result.candlesAvailable).toBe(14);
    expect(result.candlesRequired).toBe(SCANNER_INDICATOR_CANDLES_REQUIRED);
    expect(result.indicators.atr14).toBeNull();
    expect(result.mainSystem.reasons[0]).toContain("INSUFFICIENT HISTORY");
  });
});
