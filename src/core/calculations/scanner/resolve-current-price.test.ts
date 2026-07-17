import { describe, expect, it } from "vitest";
import { resolveCurrentPrice } from "./resolve-current-price";

describe("resolveCurrentPrice", () => {
  it("prefers primary quote over daily close", () => {
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
        },
      ],
      price: {
        market: "US",
        ticker: "VRT",
        latestPrice: 289.56,
        priceAsOf: "2026-07-16",
        source: "yahoo",
      },
    });

    expect(resolved?.currentPrice).toBe(289.56);
    expect(resolved?.sourceKey).toBe("primary_quote");
    expect(resolved?.status).toBe("fresh");
  });

  it("uses FMP when quote source is fmp", () => {
    const resolved = resolveCurrentPrice({
      dailyCandles: [],
      price: {
        market: "US",
        ticker: "SPCX",
        latestPrice: 135.27,
        priceAsOf: "2026-07-15",
        source: "fmp",
      },
    });

    expect(resolved?.sourceKey).toBe("fmp_fallback");
    expect(resolved?.status).toBe("fallback");
  });

  it("falls back to daily close when quote is unavailable", () => {
    const resolved = resolveCurrentPrice({
      dailyCandles: [
        {
          market: "US",
          ticker: "QQQ",
          date: "2026-07-15",
          open: 500,
          high: 505,
          low: 498,
          close: 503.12,
        },
      ],
      price: null,
    });

    expect(resolved?.currentPrice).toBe(503.12);
    expect(resolved?.sourceKey).toBe("daily_close");
    expect(resolved?.status).toBe("fresh");
  });

  it("uses manual and saved trade fallbacks last", () => {
    const manual = resolveCurrentPrice({
      dailyCandles: [],
      price: null,
      manualPriceUsd: 100,
    });
    expect(manual?.sourceKey).toBe("manual_fallback");

    const saved = resolveCurrentPrice({
      dailyCandles: [],
      price: null,
      savedTradePriceUsd: 95,
    });
    expect(saved?.sourceKey).toBe("saved_trade");
  });
});
