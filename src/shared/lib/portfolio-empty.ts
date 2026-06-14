import type { PortfolioMetrics } from "@/core/domain/types";

export function isEmptyPortfolio(metrics: PortfolioMetrics): boolean {
  return (
    metrics.totalPortfolioValue === 0 &&
    metrics.totalContribution === 0 &&
    metrics.stockHoldingsValueSgd === 0 &&
    metrics.cryptoHoldingsValueSgd === 0 &&
    metrics.optionsValueSgd === 0
  );
}
