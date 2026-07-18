import type { StockDailyCandle } from "@/core/domain/types";
import type {
  CurrentPriceSourceKey,
  CurrentPriceStatus,
} from "@/core/domain/types/current-price";
import { resolveCanonicalScannerCurrentPrice } from "./canonical-current-price";

export interface ResolvedCurrentPrice {
  currentPrice: number;
  marketSession: string;
  sourceKey: CurrentPriceSourceKey;
  source: string;
  status: CurrentPriceStatus;
}

export const DAILY_CLOSE_SOURCE_LABEL = "Daily close";

/**
 * Shared current-price resolution — completed daily candle close only.
 * Manual Module 5 price is fallback when no completed candle exists.
 */
export function resolveCurrentPrice(input: {
  dailyCandles: StockDailyCandle[];
  manualPriceUsd?: number | null;
}): ResolvedCurrentPrice | null {
  const canonical = resolveCanonicalScannerCurrentPrice(input.dailyCandles);
  if (canonical) {
    return {
      currentPrice: canonical.currentPrice,
      marketSession: canonical.marketDate,
      sourceKey: "daily_close",
      source: DAILY_CLOSE_SOURCE_LABEL,
      status: "fresh",
    };
  }

  if (
    input.manualPriceUsd != null &&
    Number.isFinite(input.manualPriceUsd) &&
    input.manualPriceUsd > 0
  ) {
    return {
      currentPrice: input.manualPriceUsd,
      marketSession: "manual",
      sourceKey: "manual_fallback",
      source: "Manual",
      status: "fallback",
    };
  }

  return null;
}
