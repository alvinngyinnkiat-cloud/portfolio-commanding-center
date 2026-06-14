import type { StockDailyCandle, StockPrice } from "@/core/domain/types";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { resolveEffectivePrice } from "@/core/calculations/stocks/price-normalize";
import type { WatchlistEntry } from "./watchlist";
import { getActiveWatchlistEntries } from "./watchlist";

export type ScannerPriceSource =
  | "watchlist_scan"
  | "watchlist_quote"
  | "watchlist_candle"
  | "manual_fallback"
  | "unavailable";

export interface ScannerScanPriceCache {
  priceUsd: number;
  priceAsOf: string | null;
}

export interface ResolvedScannerPrice {
  priceUsd: number | null;
  source: ScannerPriceSource;
  isWatchlistTicker: boolean;
  priceAsOf: string | null;
}

export function findWatchlistEntry(
  underlying: string,
  watchlist: WatchlistEntry[]
): WatchlistEntry | null {
  const ticker = normalizeTicker(underlying);
  return (
    getActiveWatchlistEntries(watchlist).find(
      (entry) => normalizeTicker(entry.ticker) === ticker
    ) ?? null
  );
}

function latestDailyCloseUsd(candles: StockDailyCandle[]): number | null {
  if (candles.length === 0) return null;
  const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date));
  const close = sorted[sorted.length - 1]?.close;
  return Number.isFinite(close) && close > 0 ? close : null;
}

function lookupQuotePriceUsd(
  underlying: string,
  prices: StockPrice[]
): { priceUsd: number; priceAsOf: string | null } | null {
  const ticker = normalizeTicker(underlying);
  const row = prices.find(
    (price) =>
      price.market === "US" && normalizeTicker(price.ticker) === ticker
  );
  if (!row) return null;
  const priceUsd = resolveEffectivePrice(row);
  if (priceUsd == null || priceUsd <= 0) return null;
  return { priceUsd, priceAsOf: row.priceAsOf ?? null };
}

/**
 * Scanner-owned market price resolution for watchlist tickers.
 * Priority: scan cache → quote cache → daily candle close → manual fallback.
 */
export function resolveScannerWatchlistPrice(input: {
  underlying: string;
  watchlist: WatchlistEntry[];
  prices: StockPrice[];
  dailyCandles: StockDailyCandle[];
  scannerScanPrice?: ScannerScanPriceCache | null;
  storedManualFallback?: number;
}): ResolvedScannerPrice {
  const watchlistEntry = findWatchlistEntry(input.underlying, input.watchlist);

  if (watchlistEntry) {
    if (
      input.scannerScanPrice != null &&
      Number.isFinite(input.scannerScanPrice.priceUsd) &&
      input.scannerScanPrice.priceUsd > 0
    ) {
      return {
        priceUsd: input.scannerScanPrice.priceUsd,
        source: "watchlist_scan",
        isWatchlistTicker: true,
        priceAsOf: input.scannerScanPrice.priceAsOf,
      };
    }

    const quote = lookupQuotePriceUsd(input.underlying, input.prices);
    if (quote) {
      return {
        priceUsd: quote.priceUsd,
        source: "watchlist_quote",
        isWatchlistTicker: true,
        priceAsOf: quote.priceAsOf,
      };
    }

    const candleClose = latestDailyCloseUsd(input.dailyCandles);
    if (candleClose != null) {
      const sorted = [...input.dailyCandles].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      return {
        priceUsd: candleClose,
        source: "watchlist_candle",
        isWatchlistTicker: true,
        priceAsOf: sorted[sorted.length - 1]?.date ?? null,
      };
    }
  }

  if (
    input.storedManualFallback != null &&
    Number.isFinite(input.storedManualFallback) &&
    input.storedManualFallback > 0
  ) {
    return {
      priceUsd: input.storedManualFallback,
      source: "manual_fallback",
      isWatchlistTicker: watchlistEntry != null,
      priceAsOf: null,
    };
  }

  return {
    priceUsd: null,
    source: "unavailable",
    isWatchlistTicker: watchlistEntry != null,
    priceAsOf: null,
  };
}

export function buildScannerScanPriceMap(
  results: Array<{ ticker: string; currentPrice: number | null; priceAsOf: string | null }>
): Map<string, ScannerScanPriceCache> {
  const map = new Map<string, ScannerScanPriceCache>();
  for (const row of results) {
    if (row.currentPrice == null || row.currentPrice <= 0) continue;
    map.set(normalizeTicker(row.ticker), {
      priceUsd: row.currentPrice,
      priceAsOf: row.priceAsOf,
    });
  }
  return map;
}

export function indexUsDailyCandlesByTicker(
  candles: StockDailyCandle[]
): Map<string, StockDailyCandle[]> {
  const map = new Map<string, StockDailyCandle[]>();
  for (const bar of candles) {
    if (bar.market !== "US") continue;
    const key = normalizeTicker(bar.ticker);
    const list = map.get(key) ?? [];
    list.push(bar);
    map.set(key, list);
  }
  return map;
}

export function formatScannerPriceSourceLabel(source: ScannerPriceSource): string {
  if (source === "watchlist_scan") return "Scanner · Watchlist";
  if (source === "watchlist_quote") return "Scanner · Quote";
  if (source === "watchlist_candle") return "Scanner · Candle";
  if (source === "manual_fallback") return "Manual fallback";
  return "Unavailable";
}
