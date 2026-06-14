import type {
  PriceDisplaySource,
  StockMarket,
  StockPrice,
  StockTransaction,
} from "@/core/domain/types";
import { buildPositionLedgers } from "./holdings";

type LegacyStockPrice = StockPrice & {
  currentPrice?: number;
  updatedAt?: string;
};

function readAutoLatestPrice(price: LegacyStockPrice): number {
  if (typeof price.latestPrice === "number" && price.latestPrice > 0) {
    return price.latestPrice;
  }
  return 0;
}

function readManualPrice(price: LegacyStockPrice): number | undefined {
  if (typeof price.manualPrice === "number" && price.manualPrice > 0) {
    return price.manualPrice;
  }
  if (price.source === "manual" && typeof price.currentPrice === "number") {
    return price.currentPrice > 0 ? price.currentPrice : undefined;
  }
  if (price.source === "manual" && typeof price.latestPrice === "number") {
    return price.latestPrice > 0 ? price.latestPrice : undefined;
  }
  return undefined;
}

/** Auto-fetched latest price only. */
export function resolveLatestPrice(price: LegacyStockPrice): number {
  return readAutoLatestPrice(price);
}

/** Auto latestPrice first, then manual override. */
export function resolveEffectivePrice(
  price: LegacyStockPrice | undefined
): number | null {
  if (!price) {
    return null;
  }

  const autoPrice = readAutoLatestPrice(price);
  if (autoPrice > 0) {
    return autoPrice;
  }

  const manualPrice = readManualPrice(price);
  return manualPrice != null && manualPrice > 0 ? manualPrice : null;
}

export function resolvePriceSource(
  price: LegacyStockPrice | undefined
): PriceDisplaySource {
  if (!price) {
    return "Missing";
  }
  if (readAutoLatestPrice(price) > 0) {
    return "Auto";
  }
  const manualPrice = readManualPrice(price);
  if (manualPrice != null && manualPrice > 0) {
    return "Manual";
  }
  return "Missing";
}

export function resolveLastPriceUpdate(price: LegacyStockPrice): string {
  return price.lastPriceUpdate ?? price.updatedAt ?? new Date(0).toISOString();
}

/** Normalize stored price rows and keep currentPrice in sync for holdings lookup. */
export function normalizeStockPrice(price: LegacyStockPrice): StockPrice {
  const latestPrice = readAutoLatestPrice(price);
  const manualPrice = readManualPrice(price);
  const effectivePrice = resolveEffectivePrice(price);
  const lastPriceUpdate = resolveLastPriceUpdate(price);

  return {
    market: price.market,
    ticker: price.ticker,
    latestPrice,
    manualPrice,
    lastPriceUpdate,
    manualPriceUpdatedAt: price.manualPriceUpdatedAt,
    priceAsOf: price.priceAsOf,
    source: price.source ?? "yahoo",
    priceUnavailable: price.priceUnavailable,
    currentPrice: effectivePrice ?? undefined,
    updatedAt: lastPriceUpdate,
  };
}

export function normalizeStockPrices(prices: LegacyStockPrice[]): StockPrice[] {
  return prices.map(normalizeStockPrice);
}

/** Open positions that require a live quote for valuation. */
export function getOpenPositionSymbols(
  transactions: StockTransaction[],
  market: StockMarket
): Array<{ market: StockMarket; ticker: string }> {
  const ledgers = buildPositionLedgers(transactions);
  return [...ledgers.values()]
    .filter((ledger) => ledger.market === market && ledger.quantity > 0)
    .map((ledger) => ({ market: ledger.market, ticker: ledger.ticker }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}
