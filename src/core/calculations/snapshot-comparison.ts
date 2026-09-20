import type { DailySnapshot } from "@/core/domain/types";
import { mergeSnapshotsByDate } from "@/core/database/supabase/snapshot-merge";
import { snapshotClientPortfolioCaptured } from "./snapshot-display";
import { compareDateDescWithCreatedAt } from "@/shared/lib/sort";

export interface SnapshotMyPortfolioChange {
  dollars: number;
  percent: number | null;
}

/** One snapshot per calendar date (newest createdAt wins), newest dates first. */
export function buildCanonicalSnapshotTimeline(
  snapshots: DailySnapshot[]
): DailySnapshot[] {
  return mergeSnapshotsByDate(snapshots).sort((a, b) =>
    b.date.localeCompare(a.date)
  );
}

/** Latest snapshot vs previous distinct calendar date (newest createdAt wins same-day). */
export function pickSnapshotComparisonPair(
  snapshots: DailySnapshot[]
): { latest: DailySnapshot; previous: DailySnapshot | null } | null {
  const timeline = buildCanonicalSnapshotTimeline(snapshots);
  if (timeline.length === 0) return null;

  return {
    latest: timeline[0],
    previous: timeline[1] ?? null,
  };
}

export interface SnapshotDailyChangeColumns {
  ownPortfolio: number | null;
  clientPortfolio: number | null;
  usStocksEtfSgd: number | null;
  sgStocksSgd: number | null;
  cryptoSgd: number | null;
  personalCashSgd: number | null;
}

function deltaWhenBothCaptured(
  current: DailySnapshot,
  previous: DailySnapshot
): number | null {
  const curOk = snapshotClientPortfolioCaptured(current);
  const prevOk = snapshotClientPortfolioCaptured(previous);
  if (!curOk || !prevOk) return null;
  return (current.clientPortfolio as number) - (previous.clientPortfolio as number);
}

/** Day-over-day deltas vs previous distinct date; null column = display "—". */
export function computeSnapshotDailyChanges(
  current: DailySnapshot,
  previous: DailySnapshot | null
): SnapshotDailyChangeColumns | null {
  if (!previous) return null;

  return {
    ownPortfolio: current.ownPortfolio - previous.ownPortfolio,
    clientPortfolio: deltaWhenBothCaptured(current, previous),
    usStocksEtfSgd: current.usStocksEtfSgd - previous.usStocksEtfSgd,
    sgStocksSgd: current.sgStocksSgd - previous.sgStocksSgd,
    cryptoSgd: current.cryptoSgd - previous.cryptoSgd,
    personalCashSgd: current.personalCashSgd - previous.personalCashSgd,
  };
}

export function getPreviousDistinctDateSnapshot(
  timeline: DailySnapshot[],
  date: string
): DailySnapshot | null {
  const idx = timeline.findIndex((row) => row.date === date);
  if (idx === -1) return null;
  return timeline[idx + 1] ?? null;
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
