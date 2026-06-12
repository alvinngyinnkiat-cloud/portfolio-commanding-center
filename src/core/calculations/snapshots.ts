import type { DailySnapshot } from "@/core/domain/types";
import type { PortfolioMetrics, PortfolioInputs } from "@/core/domain/types";
import { buildPortfolioBreakdown } from "./portfolio";

export function filterSnapshotsByDays(
  snapshots: DailySnapshot[],
  days: number
): DailySnapshot[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return snapshots.filter((s) => s.date >= cutoffStr);
}

export function filterSnapshotsByMonths(
  snapshots: DailySnapshot[],
  months: number
): DailySnapshot[] {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return snapshots.filter((s) => s.date >= cutoffStr);
}

export function calculateSnapshotStats(snapshots: DailySnapshot[]) {
  if (snapshots.length === 0) {
    return { highest: 0, lowest: 0, average: 0 };
  }
  const values = snapshots.map((s) => s.ownPortfolio);
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  return { highest, lowest, average };
}

export function createDailySnapshot(
  inputs: PortfolioInputs,
  metrics: PortfolioMetrics,
  date?: string
): DailySnapshot {
  return {
    date: date ?? new Date().toISOString().split("T")[0],
    ownPortfolio: metrics.ownPortfolio,
    totalPortfolio: metrics.totalPortfolio,
    clientPortfolio: metrics.clientPortfolio,
    totalContribution: metrics.totalContribution,
    breakdown: buildPortfolioBreakdown(inputs, metrics),
    fxRateUsed: inputs.fxRate,
  };
}
