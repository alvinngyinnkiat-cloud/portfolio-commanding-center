import { describe, expect, it } from "vitest";
import {
  buildRecentChartCandles,
  derivePrimarySuggestedStrategy,
} from "./chart-candles";
import { evaluateEmaStrategy } from "./ema-strategy";

function makeDailyBars(count: number, startClose = 100) {
  return Array.from({ length: count }, (_, index) => ({
    date: `2024-01-${String(index + 1).padStart(2, "0")}`,
    open: startClose + index,
    high: startClose + index + 2,
    low: startClose + index - 1,
    close: startClose + index,
  }));
}

describe("derivePrimarySuggestedStrategy", () => {
  it("returns SELL PUT when average price is above EMA20", () => {
    expect(derivePrimarySuggestedStrategy(65.54, 64.4)).toBe("SELL PUT");
  });

  it("returns SELL CALL when average price is below EMA20", () => {
    expect(derivePrimarySuggestedStrategy(64.4, 65.54)).toBe("SELL CALL");
  });

  it("returns NEUTRAL when average price equals EMA20", () => {
    expect(derivePrimarySuggestedStrategy(65, 65)).toBe("NEUTRAL");
  });
});

describe("buildRecentChartCandles", () => {
  it("includes avgPrice and ema20 for the last five sessions", () => {
    const bars = makeDailyBars(25);
    const recent = buildRecentChartCandles(bars);

    expect(recent).toHaveLength(5);
    expect(recent[4].avgPrice).toBeCloseTo(recent[4].high / 2 + recent[4].low / 2, 5);
    expect(recent[4].ema20).not.toBeNull();
  });
});

describe("evaluateEmaStrategy primary row", () => {
  it("places Primary Suggested Strategy above Average Price vs EMA20", () => {
    const result = evaluateEmaStrategy({
      soStatus: "Rolling Up",
      avgPrice: 102,
      avgPricePrev: 100,
      ema20: 100,
      sma200: 95,
      emaDiffPct: 1.8,
      primarySupport: 80,
      primaryResistance: 120,
      atr14: 5,
    });

    expect(result.checklist[0].label).toBe("Primary Suggested Strategy");
    expect(result.checklist[0].primaryStrategy).toBe("SELL PUT");
    expect(result.checklist[0].comparisonDetail).toBe("102.00 vs 100.00");
    expect(result.checklist[1].label).toBe("Average Price vs EMA20");
    expect(result.checklist.some((item) => item.label.includes("Zone Status"))).toBe(
      false
    );
  });
});
