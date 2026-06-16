import type { DashboardSettings } from "@/core/domain/types";
import { calculateClientPortfolioSgd } from "@/core/calculations/portfolio";
import { usdToSgd } from "@/core/calculations/fx";

/** Client options equity for Dashboard — sourced from Options Tracker Client Summary. */
export function deriveDashboardClientPortfolio(
  settings: DashboardSettings,
  fxRate: number,
  clientEquityUsd?: number
): { clientPortfolioUsd: number; clientPortfolioSgd: number } {
  const clientPortfolioUsd =
    clientEquityUsd ?? settings.manualValues.clientPortfolioUsd;
  return {
    clientPortfolioUsd,
    clientPortfolioSgd: calculateClientPortfolioSgd(clientPortfolioUsd, fxRate),
  };
}

/** @deprecated Personal options unrealised P/L is no longer added to dashboard totals. */
export function deriveDashboardOptionsValue(
  userUnrealizedPlUsd: number | null,
  fxRate: number
): number {
  if (userUnrealizedPlUsd == null) return 0;
  return usdToSgd(userUnrealizedPlUsd, fxRate);
}
