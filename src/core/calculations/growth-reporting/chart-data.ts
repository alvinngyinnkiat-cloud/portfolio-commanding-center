import type { DailySnapshot } from "@/core/domain/types";
import type { PortfolioGrowthChartPoint } from "./types";
import { readSnapshotTotalPl, sortSnapshotsAsc } from "./snapshot-helpers";

export function buildPortfolioGrowthChartData(
  snapshots: DailySnapshot[]
): PortfolioGrowthChartPoint[] {
  return sortSnapshotsAsc(snapshots).map((snapshot) => ({
    date: snapshot.date,
    ownPortfolio: snapshot.ownPortfolio,
    totalPortfolio: snapshot.totalPortfolio,
    totalContribution: snapshot.totalContribution,
    totalPL: readSnapshotTotalPl(snapshot),
  }));
}
