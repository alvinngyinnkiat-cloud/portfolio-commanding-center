"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  buildStockPortfolioSummary,
  deriveUsStockHoldingsDisplay,
} from "@/core/calculations/stocks/summary";

/** Module 2 US Stock Holdings Value — shared display source for Dashboard. */
export function useUsStockHoldingsValue(): number | null {
  const { data, stockData, optionsData } = usePortfolio();

  return useMemo(() => {
    if (!data?.fxRateValid || !stockData) {
      return null;
    }

    const summary = buildStockPortfolioSummary(
      stockData.holdings,
      data.contributions,
      stockData.transactions,
      stockData.fxRate,
      optionsData?.trades ?? [],
      stockData.cashFlow.fxConversions ?? [],
      data.settings.brokerUsdCashOverride ?? null
    );

    return deriveUsStockHoldingsDisplay(summary).sgd;
  }, [
    data?.fxRateValid,
    data?.contributions,
    data?.settings.brokerUsdCashOverride,
    stockData,
    optionsData?.trades,
  ]);
}
