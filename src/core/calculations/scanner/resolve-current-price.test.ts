import { describe, expect, it } from "vitest";
import { resolveCurrentPrice } from "./resolve-current-price";

describe("resolveCurrentPrice", () => {
  it("uses latest completed daily close only", () => {
    const resolved = resolveCurrentPrice({
      dailyCandles: [
        {
          market: "US",
          ticker: "VRT",
          date: "2026-07-15",
          open: 280,
          high: 290,
          low: 279,
          close: 285,
          source: "yahoo",
          fetchedAt: "x",
        },
      ],
    });

    expect(resolved?.currentPrice).toBe(285);
    expect(resolved?.sourceKey).toBe("daily_close");
    expect(resolved?.source).toBe("Daily close");
    expect(resolved?.status).toBe("fresh");
  });

  it("uses manual fallback only when no completed candle exists", () => {
    const manual = resolveCurrentPrice({
      dailyCandles: [],
      manualPriceUsd: 100,
    });
    expect(manual?.sourceKey).toBe("manual_fallback");

    const none = resolveCurrentPrice({ dailyCandles: [] });
    expect(none).toBeNull();
  });
});
