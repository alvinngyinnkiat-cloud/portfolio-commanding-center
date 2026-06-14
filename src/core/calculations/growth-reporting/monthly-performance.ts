import type { DailySnapshot } from "@/core/domain/types";
import type { MonthlyPerformanceRow } from "./types";
import {
  groupSnapshotsByMonth,
  sortSnapshotsAsc,
} from "./snapshot-helpers";

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-SG", {
    month: "short",
    year: "numeric",
  });
}

export function buildMonthlyPerformanceTable(
  snapshots: DailySnapshot[]
): MonthlyPerformanceRow[] {
  const groups = groupSnapshotsByMonth(snapshots);
  const rows: MonthlyPerformanceRow[] = [];

  for (const [month, monthSnapshots] of groups) {
    const sorted = sortSnapshotsAsc(monthSnapshots);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const monthlyGrowthDollars = last.ownPortfolio - first.ownPortfolio;
    const monthlyContributionAdded =
      last.totalContribution - first.totalContribution;
    const monthlyPLChange = monthlyGrowthDollars - monthlyContributionAdded;
    const monthlyGrowthPercent =
      first.ownPortfolio !== 0
        ? (monthlyGrowthDollars / first.ownPortfolio) * 100
        : null;

    rows.push({
      month,
      monthLabel: formatMonthLabel(month),
      startingOwnPortfolio: first.ownPortfolio,
      endingOwnPortfolio: last.ownPortfolio,
      monthlyContributionAdded,
      monthlyPLChange,
      monthlyGrowthDollars,
      monthlyGrowthPercent,
      snapshotCount: sorted.length,
    });
  }

  return rows.sort((a, b) => a.month.localeCompare(b.month));
}
