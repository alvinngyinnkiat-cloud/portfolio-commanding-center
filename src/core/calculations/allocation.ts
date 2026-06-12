import type { AssetAllocationItem, PortfolioMetrics } from "@/core/domain/types";

export const ALLOCATION_COLORS = {
  usStocks: "#3b82f6",
  sgStocks: "#8b5cf6",
  crypto: "#f59e0b",
  cash: "#22c55e",
} as const;

export function calculateAssetAllocation(
  metrics: PortfolioMetrics
): AssetAllocationItem[] {
  return [
    {
      name: "US Stocks & ETFs",
      value: metrics.usStocksEtfSgd,
      color: ALLOCATION_COLORS.usStocks,
    },
    {
      name: "SG Stocks",
      value: metrics.sgStocksSgd,
      color: ALLOCATION_COLORS.sgStocks,
    },
    { name: "Crypto", value: metrics.cryptoSgd, color: ALLOCATION_COLORS.crypto },
    { name: "Cash", value: metrics.totalCashSgd, color: ALLOCATION_COLORS.cash },
  ];
}
