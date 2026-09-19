import type { DailySnapshot } from "@/core/domain/types";
import { aggregatePLPercent } from "@/core/calculations/dashboard-aggregation";

/** Own capital deployed = cumulative contribution minus client starting capital (SGD). */
export function deriveOwnContributionSgd(
  totalContributionSgd: number,
  clientContributionSgd: number
): number {
  const total = Number.isFinite(totalContributionSgd) ? totalContributionSgd : 0;
  const client =
    typeof clientContributionSgd === "number" && Number.isFinite(clientContributionSgd)
      ? clientContributionSgd
      : 0;
  return total - client;
}

export function deriveOwnPortfolioPerformance(
  ownPortfolioValue: number,
  totalContributionSgd: number,
  clientContributionSgd: number
): {
  ownContribution: number;
  profitLoss: number;
  returnPercent: number;
} {
  const ownContribution = deriveOwnContributionSgd(
    totalContributionSgd,
    clientContributionSgd
  );
  const profitLoss = ownPortfolioValue - ownContribution;
  const returnPercent = aggregatePLPercent(profitLoss, ownContribution);
  return { ownContribution, profitLoss, returnPercent };
}

export function readSnapshotOwnContributionSgd(
  snapshot: Pick<DailySnapshot, "totalContribution">,
  clientContributionSgd: number
): number {
  return deriveOwnContributionSgd(
    snapshot.totalContribution,
    clientContributionSgd
  );
}
