import { describe, expect, it } from "vitest";
import {
  buildScannerScanPriceMap,
  indexUsDailyCandlesByTicker,
  resolveScannerWatchlistPrice,
} from "./price-engine";
import { DEFAULT_SCANNER_WATCHLIST } from "./watchlist";

const watchlist = DEFAULT_SCANNER_WATCHLIST;

describe("resolveScannerWatchlistPrice", () => {
  it("uses scanner scan cache for watchlist tickers without stock holdings", () => {
    const resolved = resolveScannerWatchlistPrice({
      underlying: "AAPL",
      watchlist,
      prices: [],
      dailyCandles: [],
      scannerScanPrice: { priceUsd: 195.5, priceAsOf: "2025-06-13" },
    });

    expect(resolved.source).toBe("watchlist_scan");
    expect(resolved.priceUsd).toBe(195.5);
    expect(resolved.isWatchlistTicker).toBe(true);
  });

  it("falls back to quote cache when scan cache is missing", () => {
    const resolved = resolveScannerWatchlistPrice({
      underlying: "AVGO",
      watchlist,
      prices: [
        {
          market: "US",
          ticker: "AVGO",
          latestPrice: 172.25,
          lastPriceUpdate: "2025-06-13",
          priceAsOf: "2025-06-13",
          source: "yahoo",
        },
      ],
      dailyCandles: [],
      scannerScanPrice: null,
    });

    expect(resolved.source).toBe("watchlist_quote");
    expect(resolved.priceUsd).toBe(172.25);
  });

  it("falls back to latest daily candle close", () => {
    const resolved = resolveScannerWatchlistPrice({
      underlying: "MSFT",
      watchlist,
      prices: [],
      dailyCandles: [
        {
          market: "US",
          ticker: "MSFT",
          date: "2025-06-12",
          open: 420,
          high: 425,
          low: 418,
          close: 422.5,
        },
      ],
      scannerScanPrice: null,
    });

    expect(resolved.source).toBe("watchlist_candle");
    expect(resolved.priceUsd).toBe(422.5);
  });

  it("returns unavailable for non-watchlist tickers without manual fallback", () => {
    const resolved = resolveScannerWatchlistPrice({
      underlying: "UNKNOWN",
      watchlist,
      prices: [],
      dailyCandles: [],
      scannerScanPrice: null,
    });

    expect(resolved.source).toBe("unavailable");
    expect(resolved.priceUsd).toBeNull();
    expect(resolved.isWatchlistTicker).toBe(false);
  });
});

describe("scanner price helpers", () => {
  it("builds scan price map from scanner results", () => {
    const map = buildScannerScanPriceMap([
      { ticker: "NVDA", currentPrice: 120.5, priceAsOf: "2025-06-13" },
      { ticker: "AAPL", currentPrice: null, priceAsOf: null },
    ]);

    expect(map.get("NVDA")?.priceUsd).toBe(120.5);
    expect(map.has("AAPL")).toBe(false);
  });

  it("indexes US daily candles by ticker", () => {
    const index = indexUsDailyCandlesByTicker([
      {
        market: "US",
        ticker: "GOOG",
        date: "2025-06-13",
        open: 1,
        high: 2,
        low: 1,
        close: 1.5,
      },
    ]);

    expect(index.get("GOOG")).toHaveLength(1);
  });
});
