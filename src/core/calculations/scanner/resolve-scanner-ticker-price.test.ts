import { describe, expect, it } from "vitest";
import { resolveScannerTickerCurrentPrice } from "./resolve-scanner-ticker-price";

describe("resolveScannerTickerCurrentPrice", () => {
  it("prefers latest completed daily close over quote", () => {
    const resolved = resolveScannerTickerCurrentPrice({
      dailyCandles: [
        {
          market: "US",
          ticker: "SPCX",
          date: "2020-01-10",
          open: 130,
          high: 136,
          low: 129,
          close: 135.27,
        },
      ],
      price: {
        market: "US",
        ticker: "SPCX",
        latestPrice: 140,
        priceAsOf: "2020-01-10",
        source: "fmp",
      },
    });

    expect(resolved?.currentPrice).toBe(135.27);
    expect(resolved?.priceSourceKey).toBe("daily_close");
    expect(resolved?.priceStatus).toBe("fresh");
  });

  it("falls back to quote when no daily candles exist", () => {
    const resolved = resolveScannerTickerCurrentPrice({
      dailyCandles: [],
      price: {
        market: "US",
        ticker: "SPCX",
        latestPrice: 135.27,
        priceAsOf: "2026-07-15",
        source: "fmp",
      },
    });

    expect(resolved?.currentPrice).toBe(135.27);
    expect(resolved?.priceSourceKey).toBe("fmp_fallback");
    expect(resolved?.priceStatus).toBe("fallback");
  });
});
