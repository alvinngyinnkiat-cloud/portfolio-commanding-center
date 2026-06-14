import type { ContributionTransaction } from "@/core/domain/types";
import type { DailySnapshot } from "@/core/domain/types";
import type { PortfolioMetrics } from "@/core/domain/types";
import { parseLocalDate } from "@/shared/lib/date";
import type { PortfolioJourneyData } from "./types";
import { findEarliestSnapshot } from "./snapshot-helpers";
import { buildContributionAnalytics } from "./contribution-analytics";

export function buildPortfolioJourney(
  snapshots: DailySnapshot[],
  contributions: ContributionTransaction[],
  metrics: PortfolioMetrics | null
): PortfolioJourneyData {
  const earliestSnapshot = findEarliestSnapshot(snapshots);
  const contributionDates = contributions
    .map((tx) => tx.date)
    .sort((a, b) => a.localeCompare(b));

  const firstContributionDate = contributionDates[0] ?? null;
  const firstSnapshotDate = earliestSnapshot?.date ?? null;

  const startDate =
    [firstSnapshotDate, firstContributionDate]
      .filter((d): d is string => d != null)
      .sort()[0] ?? null;

  const analytics = buildContributionAnalytics(contributions);
  const currentPortfolioValue = metrics?.totalPortfolioValue ?? 0;
  const totalGrowthSinceStart =
    earliestSnapshot != null
      ? currentPortfolioValue - earliestSnapshot.ownPortfolio
      : null;

  const daysSinceStarted =
    startDate != null
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - parseLocalDate(startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null;

  return {
    firstSnapshotDate,
    firstContributionDate,
    currentPortfolioValue,
    totalContributionsSgd: analytics.totalContributionSgd,
    totalGrowthSinceStart,
    daysSinceStarted,
  };
}
