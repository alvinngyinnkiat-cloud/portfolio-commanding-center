import type { StockDailyCandle } from "@/core/domain/types";
import type {
  ScannerPriceStatus,
  ScannerTickerPriceSourceKey,
} from "@/core/domain/types/scanner";
import { resolveCanonicalScannerCurrentPrice } from "./canonical-current-price";
import { DAILY_CLOSE_SOURCE_LABEL } from "./resolve-current-price";

export interface ResolvedScannerTickerPrice {
  currentPrice: number;
  marketDate: string;
  priceSourceKey: ScannerTickerPriceSourceKey;
  priceSource: string;
  priceStatus: ScannerPriceStatus;
}

/**
 * Scanner current price = close of the latest completed daily candle only.
 */
export function resolveScannerTickerCurrentPrice(input: {
  dailyCandles: StockDailyCandle[];
}): ResolvedScannerTickerPrice | null {
  const canonical = resolveCanonicalScannerCurrentPrice(input.dailyCandles);
  if (!canonical) {
    return null;
  }

  return {
    currentPrice: canonical.currentPrice,
    marketDate: canonical.marketDate,
    priceSourceKey: "daily_close",
    priceSource: DAILY_CLOSE_SOURCE_LABEL,
    priceStatus: "fresh",
  };
}

export function formatScannerPriceSourceForModules(input: {
  priceSource?: string | null;
  indicatorStatus?: string | null;
}): string {
  const source = input.priceSource ?? DAILY_CLOSE_SOURCE_LABEL;
  if (input.indicatorStatus === "insufficient_history") {
    return `Source: ${DAILY_CLOSE_SOURCE_LABEL}`;
  }
  return `Source: ${source}`;
}
