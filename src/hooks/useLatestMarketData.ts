"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { MarketDataRecord } from "@/core/domain/types/market-data";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";

/**
 * Read the latest centrally persisted market-data record for a ticker.
 * Re-computes when marketDataVersion bumps after Scanner refresh.
 */
export function useLatestMarketData(ticker: string): MarketDataRecord | null {
  const { services, marketDataVersion } = usePortfolio();

  return useMemo(() => {
    return services.marketData.getLatestMarketData(normalizeTicker(ticker));
  }, [services, ticker, marketDataVersion]);
}

export function useMarketDataRecordMap(): Map<string, MarketDataRecord> {
  const { services, marketDataVersion } = usePortfolio();

  return useMemo(() => {
    return services.marketData.getRecordMap();
  }, [services, marketDataVersion]);
}
