import type { DailySnapshot } from "@/core/domain/types";
import type { PortfolioGrowthChartPoint } from "./types";
import {
  readSnapshotOwnContributionSgd,
} from "./own-contribution";
import { readSnapshotTotalPl, sortSnapshotsAsc } from "./snapshot-helpers";

export function buildPortfolioGrowthChartData(
  snapshots: DailySnapshot[],
  clientContributionSgd: number
): PortfolioGrowthChartPoint[] {
  return sortSnapshotsAsc(snapshots).map((snapshot) => ({
    date: snapshot.date,
    ownPortfolio: snapshot.ownPortfolio,
    totalPortfolio: snapshot.totalPortfolio,
    totalContribution: readSnapshotOwnContributionSgd(
      snapshot,
      clientContributionSgd
    ),
    totalPL: readSnapshotTotalPl(snapshot, clientContributionSgd),
  }));
}
