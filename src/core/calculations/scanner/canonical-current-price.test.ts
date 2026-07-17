import { describe, expect, it } from "vitest";
import { resolveCanonicalScannerCurrentPrice } from "./canonical-current-price";

describe("resolveCanonicalScannerCurrentPrice", () => {
  it("uses close of the latest completed daily candle", () => {
    const bars = Array.from({ length: 205 }, (_, index) => ({
      date: `2020-01-${String((index % 28) + 1).padStart(2, "0")}`,
      open: 100,
      high: 102,
      low: 98,
      close: 100 + index * 0.1,
    }));

    const resolved = resolveCanonicalScannerCurrentPrice(bars);
    const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
    const lastBar = sorted[sorted.length - 1]!;
    expect(resolved?.currentPrice).toBeCloseTo(lastBar.close, 5);
    expect(resolved?.marketDate).toBe(lastBar.date);
  });
});
