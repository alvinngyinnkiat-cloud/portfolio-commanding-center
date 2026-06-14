import type { AssetAllocationItem, PortfolioMetrics } from "@/core/domain/types";

export const ALLOCATION_COLORS = {
  stocks: "#3b82f6",
  crypto: "#f59e0b",
  stockCash: "#22c55e",
  cryptoCash: "#06b6d4",
  /** Legacy snapshot chart series */
  usStocks: "#3b82f6",
  sgStocks: "#8b5cf6",
  cash: "#22c55e",
} as const;

/**
 * Dashboard asset allocation — module-owned holdings + cash (4 components).
 * Excludes client equity, options unrealised P/L, and open risk.
 */
export function calculateAssetAllocation(
  metrics: PortfolioMetrics
): AssetAllocationItem[] {
  return [
    {
      name: "Total Stock Value",
      value: metrics.stockHoldingsValueSgd,
      color: ALLOCATION_COLORS.stocks,
    },
    {
      name: "Total Crypto Value",
      value: metrics.cryptoHoldingsValueSgd,
      color: ALLOCATION_COLORS.crypto,
    },
    {
      name: "Total Stock Available Cash",
      value: metrics.stockAvailableTradingCashSgd,
      color: ALLOCATION_COLORS.stockCash,
    },
    {
      name: "Crypto Available Cash",
      value: metrics.cryptoAvailableTradingCashSgd,
      color: ALLOCATION_COLORS.cryptoCash,
    },
  ];
}

/** Sum of the four asset-allocation components for chart totals. */
export function calculateAssetAllocationTotal(
  metrics: PortfolioMetrics
): number {
  return (
    metrics.stockHoldingsValueSgd +
    metrics.cryptoHoldingsValueSgd +
    metrics.stockAvailableTradingCashSgd +
    metrics.cryptoAvailableTradingCashSgd
  );
}
