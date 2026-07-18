import { describe, expect, it } from "vitest";
import { resolveScannerTickerCurrentPrice } from "./resolve-scanner-ticker-price";

describe("resolveScannerTickerCurrentPrice", () => {
  it("returns latest completed daily close", () => {
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
          source: "yahoo",
          fetchedAt: "x",
        },
      ],
    });

    expect(resolved?.currentPrice).toBe(135.27);
    expect(resolved?.priceSourceKey).toBe("daily_close");
    expect(resolved?.priceSource).toBe("Daily close");
    expect(resolved?.priceStatus).toBe("fresh");
  });

  it("returns null when no daily candles exist", () => {
    const resolved = resolveScannerTickerCurrentPrice({ dailyCandles: [] });
    expect(resolved).toBeNull();
  });
});
