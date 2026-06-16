import type { PortfolioMetrics } from "@/core/domain/types";

export function isEmptyPortfolio(metrics: PortfolioMetrics): boolean {
  return (
    metrics.totalPortfolio === 0 &&
    metrics.totalContribution === 0 &&
    metrics.stockHoldingsValueSgd === 0 &&
    metrics.cryptoHoldingsValueSgd === 0
  );
}
