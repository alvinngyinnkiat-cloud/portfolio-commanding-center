import type { DailySnapshot } from "@/core/domain/types";
import type { PortfolioMetrics } from "@/core/domain/types";
import { addLocalMonths, toLocalDateString } from "@/shared/lib/date";
import type { GrowthDelta, GrowthPeriodKey, GrowthSummaryData } from "./types";
import { findEarliestSnapshot, findSnapshotAtOrBefore } from "./snapshot-helpers";

const PERIOD_MONTHS: Record<Exclude<GrowthPeriodKey, "sinceStart">, number> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "1y": 12,
};

export function calculateGrowthDelta(
  currentValue: number,
  historicalValue: number | null
): GrowthDelta {
  if (historicalValue == null) {
    return { dollars: null, percent: null, insufficientData: true };
  }

  const dollars = currentValue - historicalValue;
  const percent =
    historicalValue !== 0 ? (dollars / historicalValue) * 100 : null;

  return { dollars, percent, insufficientData: false };
}

function historicalOwnPortfolioForPeriod(
  snapshots: DailySnapshot[],
  period: GrowthPeriodKey
): number | null {
  if (snapshots.length === 0) return null;

  if (period === "sinceStart") {
    return findEarliestSnapshot(snapshots)?.ownPortfolio ?? null;
  }

  const targetDate = toLocalDateString(
    addLocalMonths(new Date(), -PERIOD_MONTHS[period])
  );
  const snapshot = findSnapshotAtOrBefore(snapshots, targetDate);
  return snapshot?.ownPortfolio ?? null;
}

export function buildGrowthSummary(
  snapshots: DailySnapshot[],
  metrics: PortfolioMetrics | null
): GrowthSummaryData | null {
  if (!metrics) return null;

  const currentOwn = metrics.totalPortfolioValue;
  const periods: GrowthPeriodKey[] = [
    "sinceStart",
    "1m",
    "3m",
    "6m",
    "1y",
  ];

  const periodGrowth = {} as GrowthSummaryData["periodGrowth"];
  for (const period of periods) {
    const historical = historicalOwnPortfolioForPeriod(snapshots, period);
    periodGrowth[period] = calculateGrowthDelta(currentOwn, historical);
  }

  return {
    currentOwnPortfolio: metrics.totalPortfolioValue,
    currentTotalPortfolio: metrics.totalPortfolio,
    totalContribution: metrics.totalContribution,
    totalPL: metrics.totalPL,
    totalPLPercent: metrics.totalPLPercent,
    periodGrowth,
  };
}
