import type { ContributionTransaction } from "@/core/domain/types";
import { calculateCryptoContribution } from "@/core/calculations/crypto/contributions";
import { calculateStockDepositNetSgd } from "@/core/calculations/stocks/cash-flow";
import { aggregateTotalContribution } from "./dashboard-aggregation";

/** Total contribution from recorded SGD deposit/withdrawal amounts only. */
export function calculateHistoricalTotalContributionSgd(
  contributions: ContributionTransaction[]
): number {
  return aggregateTotalContribution({
    totalStockContributionSgd: calculateStockDepositNetSgd(contributions),
    cryptoContributionSgd: calculateCryptoContribution(contributions),
  });
}
/** Client contribution — fixed historical SGD recorded in Options settings. */
export function resolveClientContributionSgd(
  settings: Pick<{ clientStartingCapitalSgd?: number }, "clientStartingCapitalSgd">
): number {
  const sgd = settings.clientStartingCapitalSgd;
  return typeof sgd === "number" && Number.isFinite(sgd) ? sgd : 0;
}
