import type { StockDailyCandle, StockPrice } from "@/core/domain/types";
import { resolveEffectivePrice } from "@/core/calculations/stocks/price-normalize";
import type {
  ScannerPriceStatus,
  ScannerTickerPriceSourceKey,
} from "@/core/domain/types/scanner";
import { resolveCanonicalScannerCurrentPrice } from "./canonical-current-price";

export interface ResolvedScannerTickerPrice {
  currentPrice: number;
  marketDate: string;
  priceSourceKey: ScannerTickerPriceSourceKey;
  priceSource: string;
  priceStatus: ScannerPriceStatus;
}

function isFmpSource(source: string | undefined): boolean {
  return source === "fmp" || source === "FMP";
}

function labelForSourceKey(key: ScannerTickerPriceSourceKey): string {
  if (key === "daily_close") return "Daily close";
  if (key === "quote") return "Scanner quote";
  if (key === "fmp_fallback") return "FMP fallback";
  return "Stored daily candle";
}

/**
 * Resolve scanner current price independently of indicator history.
 * Priority: completed daily close → quote → stored daily close.
 */
export function resolveScannerTickerCurrentPrice(input: {
  dailyCandles: StockDailyCandle[];
  price: StockPrice | null;
}): ResolvedScannerTickerPrice | null {
  const canonical = resolveCanonicalScannerCurrentPrice(input.dailyCandles);
  if (canonical) {
    return {
      currentPrice: canonical.currentPrice,
      marketDate: canonical.marketDate,
      priceSourceKey: "daily_close",
      priceSource: labelForSourceKey("daily_close"),
      priceStatus: "fresh",
    };
  }

  if (input.price) {
    const quoteUsd = resolveEffectivePrice(input.price);
    const marketDate = input.price.priceAsOf ?? input.price.lastPriceUpdate ?? null;
    if (quoteUsd != null && quoteUsd > 0 && marketDate) {
      const fmp = isFmpSource(input.price.source);
      const key: ScannerTickerPriceSourceKey = fmp ? "fmp_fallback" : "quote";
      return {
        currentPrice: quoteUsd,
        marketDate,
        priceSourceKey: key,
        priceSource: labelForSourceKey(key),
        priceStatus: "fallback",
      };
    }
  }

  if (input.dailyCandles.length > 0) {
    const sorted = [...input.dailyCandles].sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1];
    if (last && Number.isFinite(last.close) && last.close > 0 && last.date) {
      return {
        currentPrice: last.close,
        marketDate: last.date,
        priceSourceKey: "stored_candle",
        priceSource: labelForSourceKey("stored_candle"),
        priceStatus: "fallback",
      };
    }
  }

  return null;
}

export function formatScannerPriceSourceForModules(input: {
  priceSource?: string | null;
  indicatorStatus?: string | null;
}): string {
  const source = input.priceSource ?? "Scanner";
  if (input.indicatorStatus === "insufficient_history") {
    return `Current Price source: Scanner price-only / ${source}`;
  }
  return source;
}
