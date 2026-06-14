import type { DailySnapshot } from "@/core/domain/types";

/** Read stored snapshot P/L — ownPortfolio and totalContribution captured at snapshot time. */
export function readSnapshotTotalPl(snapshot: DailySnapshot): number {
  return snapshot.ownPortfolio - snapshot.totalContribution;
}

export function sortSnapshotsAsc(snapshots: DailySnapshot[]): DailySnapshot[] {
  return [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
}

export function findEarliestSnapshot(
  snapshots: DailySnapshot[]
): DailySnapshot | null {
  const sorted = sortSnapshotsAsc(snapshots);
  return sorted[0] ?? null;
}

/** Latest snapshot on or before targetDate (YYYY-MM-DD). */
export function findSnapshotAtOrBefore(
  snapshots: DailySnapshot[],
  targetDate: string
): DailySnapshot | null {
  const sorted = sortSnapshotsAsc(snapshots);
  let match: DailySnapshot | null = null;
  for (const snapshot of sorted) {
    if (snapshot.date <= targetDate) {
      match = snapshot;
    } else {
      break;
    }
  }
  return match;
}

export function groupSnapshotsByMonth(
  snapshots: DailySnapshot[]
): Map<string, DailySnapshot[]> {
  const groups = new Map<string, DailySnapshot[]>();
  for (const snapshot of sortSnapshotsAsc(snapshots)) {
    const month = snapshot.date.slice(0, 7);
    const list = groups.get(month) ?? [];
    list.push(snapshot);
    groups.set(month, list);
  }
  return groups;
}
