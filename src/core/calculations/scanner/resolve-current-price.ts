import type { StockDailyCandle, StockPrice } from "@/core/domain/types";
import type {
  CurrentPriceSourceKey,
  CurrentPriceStatus,
} from "@/core/domain/types/current-price";
import { resolveEffectivePrice } from "@/core/calculations/stocks/price-normalize";
import { resolveCanonicalScannerCurrentPrice } from "./canonical-current-price";

export interface ResolvedCurrentPrice {
  currentPrice: number;
  marketSession: string;
  sourceKey: CurrentPriceSourceKey;
  source: string;
  status: CurrentPriceStatus;
}

function isFmpSource(source: string | undefined): boolean {
  return source === "fmp" || source === "FMP";
}

export function labelForCurrentPriceSourceKey(key: CurrentPriceSourceKey): string {
  if (key === "primary_quote") return "Primary";
  if (key === "fmp_fallback") return "FMP";
  if (key === "daily_close") return "Daily close";
  if (key === "stored_candle") return "Daily close";
  if (key === "manual_fallback") return "Manual";
  return "Saved trade";
}

/**
 * Shared current-price resolution for CurrentPriceService.
 * Priority: primary quote → FMP → completed daily close → manual → saved trade.
 */
export function resolveCurrentPrice(input: {
  dailyCandles: StockDailyCandle[];
  price: StockPrice | null;
  manualPriceUsd?: number | null;
  savedTradePriceUsd?: number | null;
}): ResolvedCurrentPrice | null {
  if (input.price) {
    const quoteUsd = resolveEffectivePrice(input.price);
    const marketSession =
      input.price.priceAsOf ?? input.price.lastPriceUpdate ?? null;
    if (quoteUsd != null && quoteUsd > 0 && marketSession) {
      const fmp = isFmpSource(input.price.source);
      const sourceKey: CurrentPriceSourceKey = fmp ? "fmp_fallback" : "primary_quote";
      return {
        currentPrice: quoteUsd,
        marketSession,
        sourceKey,
        source: labelForCurrentPriceSourceKey(sourceKey),
        status: fmp ? "fallback" : "fresh",
      };
    }
  }

  const canonical = resolveCanonicalScannerCurrentPrice(input.dailyCandles);
  if (canonical) {
    return {
      currentPrice: canonical.currentPrice,
      marketSession: canonical.marketDate,
      sourceKey: "daily_close",
      source: labelForCurrentPriceSourceKey("daily_close"),
      status: "fresh",
    };
  }

  if (input.dailyCandles.length > 0) {
    const sorted = [...input.dailyCandles].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const last = sorted[sorted.length - 1];
    if (last && Number.isFinite(last.close) && last.close > 0 && last.date) {
      return {
        currentPrice: last.close,
        marketSession: last.date,
        sourceKey: "stored_candle",
        source: labelForCurrentPriceSourceKey("stored_candle"),
        status: "fallback",
      };
    }
  }

  if (
    input.manualPriceUsd != null &&
    Number.isFinite(input.manualPriceUsd) &&
    input.manualPriceUsd > 0
  ) {
    return {
      currentPrice: input.manualPriceUsd,
      marketSession: input.price?.priceAsOf ?? input.price?.lastPriceUpdate ?? "manual",
      sourceKey: "manual_fallback",
      source: labelForCurrentPriceSourceKey("manual_fallback"),
      status: "fallback",
    };
  }

  if (
    input.savedTradePriceUsd != null &&
    Number.isFinite(input.savedTradePriceUsd) &&
    input.savedTradePriceUsd > 0
  ) {
    return {
      currentPrice: input.savedTradePriceUsd,
      marketSession: "saved",
      sourceKey: "saved_trade",
      source: labelForCurrentPriceSourceKey("saved_trade"),
      status: "fallback",
    };
  }

  return null;
}
