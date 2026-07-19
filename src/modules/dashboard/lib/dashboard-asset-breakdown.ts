import { ALLOCATION_COLORS } from "@/core/calculations/allocation";
import type { AssetAllocationItem, PortfolioMetrics } from "@/core/domain/types";

export const DASHBOARD_ASSET_BREAKDOWN_LABELS = {
  usStockHoldings: "US Stock Holdings Value (SGD)",
  sgHoldings: "SG Holdings Value (SGD)",
  cryptoHoldings: "Crypto Holdings Value (SGD)",
  totalCash: "Total Cash",
} as const;

export interface DashboardAssetBreakdown {
  items: AssetAllocationItem[];
  total: number;
  usStockHoldingsValueSgd: number;
  sgHoldingsValueSgd: number;
  cryptoHoldingsValueSgd: number;
  totalCashSgd: number;
}

/** Single source for Dashboard asset breakdown cards and allocation chart. */
export function buildDashboardAssetBreakdown(
  usStockHoldingsValueSgd: number,
  metrics: Pick<
    PortfolioMetrics,
    "sgStocksSgd" | "cryptoHoldingsValueSgd" | "totalCashSgd"
  >
): DashboardAssetBreakdown {
  const items: AssetAllocationItem[] = [
    {
      name: DASHBOARD_ASSET_BREAKDOWN_LABELS.usStockHoldings,
      value: usStockHoldingsValueSgd,
      color: ALLOCATION_COLORS.usHoldings,
    },
    {
      name: DASHBOARD_ASSET_BREAKDOWN_LABELS.sgHoldings,
      value: metrics.sgStocksSgd,
      color: ALLOCATION_COLORS.sgHoldings,
    },
    {
      name: DASHBOARD_ASSET_BREAKDOWN_LABELS.cryptoHoldings,
      value: metrics.cryptoHoldingsValueSgd,
      color: ALLOCATION_COLORS.crypto,
    },
    {
      name: DASHBOARD_ASSET_BREAKDOWN_LABELS.totalCash,
      value: metrics.totalCashSgd,
      color: ALLOCATION_COLORS.cash,
    },
  ];

  const total = items.reduce((sum, item) => sum + item.value, 0);

  return {
    items,
    total,
    usStockHoldingsValueSgd,
    sgHoldingsValueSgd: metrics.sgStocksSgd,
    cryptoHoldingsValueSgd: metrics.cryptoHoldingsValueSgd,
    totalCashSgd: metrics.totalCashSgd,
  };
}
