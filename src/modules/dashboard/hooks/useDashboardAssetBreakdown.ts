"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  buildStockPortfolioSummary,
  deriveUsStockHoldingsDisplay,
} from "@/core/calculations/stocks/summary";
import {
  buildDashboardAssetBreakdown,
  type DashboardAssetBreakdown,
} from "../lib/dashboard-asset-breakdown";

/** Dashboard asset breakdown — shared by summary cards and allocation chart. */
export function useDashboardAssetBreakdown(): DashboardAssetBreakdown | null {
  const { data, stockData, optionsData } = usePortfolio();

  return useMemo(() => {
    if (!data?.fxRateValid || !data.metrics || !stockData) {
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

    const usStockHoldingsValueSgd =
      deriveUsStockHoldingsDisplay(summary).sgd;

    return buildDashboardAssetBreakdown(
      usStockHoldingsValueSgd,
      data.metrics
    );
  }, [
    data?.fxRateValid,
    data?.metrics,
    data?.contributions,
    data?.settings.brokerUsdCashOverride,
    stockData,
    optionsData?.trades,
  ]);
}
