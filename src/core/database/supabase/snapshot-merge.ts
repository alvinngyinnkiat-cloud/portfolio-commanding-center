import type { DailySnapshot } from "@/core/domain/types";
import { normalizeDailySnapshot } from "@/core/calculations/snapshots";

/** Merge snapshots by Singapore calendar date — keep newer createdAt on conflict. */
export function mergeSnapshotsByDate(sources: DailySnapshot[]): DailySnapshot[] {
  const byDate = new Map<string, DailySnapshot>();

  for (const raw of sources) {
    const snapshot = normalizeDailySnapshot(raw);
    const existing = byDate.get(snapshot.date);
    if (!existing) {
      byDate.set(snapshot.date, snapshot);
      continue;
    }
    const existingTime = Date.parse(existing.createdAt);
    const incomingTime = Date.parse(snapshot.createdAt);
    if (
      !Number.isFinite(existingTime) ||
      (Number.isFinite(incomingTime) && incomingTime > existingTime)
    ) {
      byDate.set(snapshot.date, snapshot);
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function snapshotsChanged(
  before: DailySnapshot[],
  after: DailySnapshot[]
): boolean {
  if (before.length !== after.length) return true;
  const beforeByDate = new Map(before.map((row) => [row.date, row]));
  for (const row of after) {
    const prev = beforeByDate.get(row.date);
    if (!prev) return true;
    if (prev.createdAt !== row.createdAt || prev.ownPortfolio !== row.ownPortfolio) {
      return true;
    }
  }
  return false;
}
