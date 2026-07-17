import { describe, expect, it } from "vitest";
import {
  buildScannerScanPriceMap,
  getLatestTickerPrice,
  indexUsDailyCandlesByTicker,
  resolveScannerWatchlistPrice,
} from "./price-engine";
import { DEFAULT_SCANNER_WATCHLIST } from "./watchlist";
import type { MarketDataRecord } from "@/core/domain/types/market-data";

const watchlist = DEFAULT_SCANNER_WATCHLIST;

function makeMarketData(overrides: Partial<MarketDataRecord> = {}): MarketDataRecord {
  return {
    ticker: "QQQ",
    currentPrice: 512,
    marketSession: "2026-07-15",
    refreshedAt: "2026-07-15T05:52:00.000Z",
    priceSource: "Daily close",
    priceSourceKey: "daily_close",
    priceStatus: "fresh",
    candles: [],
    atr14: 5,
    currentAveragePrice: 510,
    previousAveragePrice: 508,
    indicatorStatus: "ready",
    refreshRunId: "run-b",
    scannerResult: {} as never,
    isStale: false,
    ...overrides,
  };
}

describe("getLatestTickerPrice", () => {
  it("prefers central market-data record over manual fallback", () => {
    const resolved = getLatestTickerPrice({
      ticker: "QQQ",
      marketData: makeMarketData(),
      manualPriceUsd: 500,
    });

    expect(resolved.source).toBe("scanner_refreshed");
    expect(resolved.priceUsd).toBe(512);
    expect(resolved.priceAsOf).toBe("2026-07-15");
  });

  it("falls back to manual Module 5 price when market data is missing", () => {
    const resolved = getLatestTickerPrice({
      ticker: "VRT",
      marketData: null,
      manualPriceUsd: 142.5,
    });

    expect(resolved.source).toBe("manual_fallback");
    expect(resolved.priceUsd).toBe(142.5);
  });
});

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
