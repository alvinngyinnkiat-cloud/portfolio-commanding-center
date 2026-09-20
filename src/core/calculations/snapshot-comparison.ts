import type { DailySnapshot } from "@/core/domain/types";
import { compareDateDescWithCreatedAt } from "@/shared/lib/sort";

export interface SnapshotMyPortfolioChange {
  dollars: number;
  percent: number | null;
}

/** Latest snapshot vs previous distinct calendar date (newest createdAt wins same-day). */
export function pickSnapshotComparisonPair(
  snapshots: DailySnapshot[]
): { latest: DailySnapshot; previous: DailySnapshot | null } | null {
  if (snapshots.length === 0) return null;

  const sorted = [...snapshots].sort(compareDateDescWithCreatedAt);
  const latest = sorted[0];
  const previous = sorted.find((row) => row.date < latest.date) ?? null;

  return { latest, previous };
}

export function computeMyPortfolioChange(
  latest: DailySnapshot,
  previous: DailySnapshot
): SnapshotMyPortfolioChange {
  const dollars = latest.ownPortfolio - previous.ownPortfolio;
  const percent =
    previous.ownPortfolio !== 0
      ? (dollars / previous.ownPortfolio) * 100
      : null;

  return { dollars, percent };
}
