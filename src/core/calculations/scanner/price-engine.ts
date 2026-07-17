import type { StockDailyCandle, StockPrice } from "@/core/domain/types";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { resolveEffectivePrice } from "@/core/calculations/stocks/price-normalize";
import type { LatestScannerRecord } from "@/core/calculations/scanner/scanner-snapshot";
import { formatScannerRecordMarketDateLabel } from "@/core/calculations/scanner/scanner-snapshot";
import { formatScannerPriceSourceForModules } from "@/core/calculations/scanner/resolve-scanner-ticker-price";
import type { WatchlistEntry } from "./watchlist";
import { getActiveWatchlistEntries } from "./watchlist";

export type ScannerPriceSource =
  | "watchlist_scan"
  | "watchlist_quote"
  | "watchlist_candle"
  | "manual_fallback"
  | "unavailable";

/** Shared read-only resolution source for Modules 5 and 6. */
export type TickerPriceResolutionSource =
  | "scanner_refreshed"
  | "manual_fallback"
  | "saved_fallback"
  | "unavailable";

export interface ResolvedTickerPrice {
  priceUsd: number | null;
  source: TickerPriceResolutionSource;
  priceAsOf: string | null;
}

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

function isValidTickerPrice(price: number | null | undefined): price is number {
  return price != null && Number.isFinite(price) && price > 0;
}

/**
 * Shared current-price resolver for Modules 5 and 6.
 * Priority: scanner refresh → manual Module 5 input → cached quote/candle.
 */
export function getLatestTickerPrice(input: {
  ticker: string;
  scannerRecord?: LatestScannerRecord | null;
  scannerScanPrice?: ScannerScanPriceCache | null;
  manualPriceUsd?: number | null;
  watchlist?: WatchlistEntry[];
  prices?: StockPrice[];
  dailyCandles?: StockDailyCandle[];
}): ResolvedTickerPrice {
  if (input.scannerRecord && isValidTickerPrice(input.scannerRecord.currentPrice)) {
    return {
      priceUsd: input.scannerRecord.currentPrice,
      source: "scanner_refreshed",
      priceAsOf: input.scannerRecord.marketDate,
    };
  }

  if (isValidTickerPrice(input.manualPriceUsd)) {
    return {
      priceUsd: input.manualPriceUsd,
      source: "manual_fallback",
      priceAsOf: null,
    };
  }

  if (input.watchlist && input.prices && input.dailyCandles) {
    const cached = resolveScannerWatchlistPrice({
      underlying: input.ticker,
      watchlist: input.watchlist,
      prices: input.prices,
      dailyCandles: input.dailyCandles,
      scannerScanPrice: null,
      storedManualFallback: undefined,
    });
    if (isValidTickerPrice(cached.priceUsd)) {
      return {
        priceUsd: cached.priceUsd,
        source: "saved_fallback",
        priceAsOf: cached.priceAsOf,
      };
    }
  }

  return {
    priceUsd: null,
    source: "unavailable",
    priceAsOf: null,
  };
}

export function resolvedTickerPriceToScannerPrice(
  resolved: ResolvedTickerPrice,
  options?: { isWatchlistTicker?: boolean; savedScannerSource?: ScannerPriceSource }
): ResolvedScannerPrice {
  let source: ScannerPriceSource = "unavailable";
  if (resolved.source === "scanner_refreshed") {
    source = "watchlist_scan";
  } else if (resolved.source === "manual_fallback") {
    source = "manual_fallback";
  } else if (resolved.source === "saved_fallback") {
    source = options?.savedScannerSource ?? "watchlist_quote";
  }

  return {
    priceUsd: resolved.priceUsd,
    source,
    isWatchlistTicker: options?.isWatchlistTicker ?? false,
    priceAsOf: resolved.priceAsOf,
  };
}

export function formatTickerPriceSourceLabel(
  source: TickerPriceResolutionSource,
  priceAsOf?: string | null,
  scannerRecord?: LatestScannerRecord | null
): string {
  if (source === "scanner_refreshed") {
    if (scannerRecord?.indicatorStatus === "insufficient_history") {
      const lines = [
        `Market session: ${scannerRecord.marketDate ?? priceAsOf ?? "—"}`,
        formatScannerPriceSourceForModules({
          priceSource: scannerRecord.priceSource,
          indicatorStatus: scannerRecord.indicatorStatus,
        }),
      ];
      if (scannerRecord.refreshedAt) {
        const refreshed = new Intl.DateTimeFormat("en-SG", {
          timeZone: "Asia/Singapore",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
          .format(new Date(scannerRecord.refreshedAt))
          .replace(",", "");
        lines.push(`Refreshed: ${refreshed} SGT`);
      }
      return lines.join("\n");
    }

    const recordLabel = formatScannerRecordMarketDateLabel(scannerRecord ?? null);
    if (recordLabel) return recordLabel;
    const lines = ["Source: Scanner"];
    if (priceAsOf) {
      lines.unshift(`Market session: ${priceAsOf}`);
    }
    return lines.join("\n");
  }
  if (source === "manual_fallback") return "Manual fallback";
  if (source === "saved_fallback") {
    return priceAsOf ? `Saved fallback · ${priceAsOf}` : "Saved fallback";
  }
  return "Unavailable";
}
