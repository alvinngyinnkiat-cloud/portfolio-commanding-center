import type { AssetAllocationItem, PortfolioMetrics } from "@/core/domain/types";

export const ALLOCATION_COLORS = {
  usHoldings: "#3b82f6",
  sgHoldings: "#8b5cf6",
  crypto: "#f59e0b",
  cash: "#22c55e",
  /** Legacy snapshot chart series */
  usStocks: "#3b82f6",
  sgStocks: "#8b5cf6",
  stocks: "#3b82f6",
  stockCash: "#22c55e",
  cryptoCash: "#06b6d4",
} as const;

/**
 * Dashboard asset breakdown — four module-owned slices:
 * US holdings, SG holdings, crypto holdings, and combined cash.
 * Excludes client equity and options as separate slices.
 */
export function calculateAssetAllocation(
  metrics: PortfolioMetrics
): AssetAllocationItem[] {
  return [
    {
      name: "US Holding Value (SGD)",
      value: metrics.usStocksEtfSgd,
      color: ALLOCATION_COLORS.usHoldings,
    },
    {
      name: "SG Holding Value (SGD)",
      value: metrics.sgStocksSgd,
      color: ALLOCATION_COLORS.sgHoldings,
    },
    {
      name: "Crypto Holding Value (SGD)",
      value: metrics.cryptoHoldingsValueSgd,
      color: ALLOCATION_COLORS.crypto,
    },
    {
      name: "Total Cash",
      value: metrics.totalCashSgd,
      color: ALLOCATION_COLORS.cash,
    },
  ];
}

/** Sum of the four asset-breakdown components (equals Total Portfolio). */
export function calculateAssetAllocationTotal(
  metrics: PortfolioMetrics
): number {
  return (
    metrics.usStocksEtfSgd +
    metrics.sgStocksSgd +
    metrics.cryptoHoldingsValueSgd +
    metrics.totalCashSgd
  );
}
