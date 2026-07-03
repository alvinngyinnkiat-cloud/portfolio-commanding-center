import type { DailySnapshot } from "@/core/domain/types";
import type { SnapshotRepository } from "@/core/database/repositories/snapshot-repository";
import { createDailySnapshot } from "@/core/calculations/snapshots";
import { getSingaporeDateString } from "@/core/calculations/snapshot-schedule";
import { mergeSnapshotsByDate } from "@/core/database/supabase/snapshot-merge";
import type { PortfolioAggregator } from "./portfolio-aggregator";
import { sortByDateDesc } from "@/shared/lib/sort";

export class SnapshotService {
  constructor(
    private repo: SnapshotRepository,
    private aggregator: PortfolioAggregator
  ) {}

  list(): DailySnapshot[] {
    return sortByDateDesc(this.repo.list());
  }

  delete(date: string): void {
    this.repo.delete(date);
  }

  /** Manual capture from Settings → Snapshots. */
  captureNow(): DailySnapshot | null {
    const state = this.aggregator.getPortfolioState();
    if (!state.fxRateValid || !state.inputs || !state.metrics) {
      return null;
    }

    const snapshot = createDailySnapshot(state.inputs, state.metrics, {
      date: getSingaporeDateString(),
      snapshotType: "manual",
      createdAt: new Date().toISOString(),
    });
    this.repo.upsert(snapshot);
    return snapshot;
  }

  /** Import backup JSON — deduped by date, newer createdAt wins. */
  importSnapshots(incoming: DailySnapshot[]): DailySnapshot[] {
    const merged = mergeSnapshotsByDate([...this.repo.list(), ...incoming]);
    this.repo.replaceAll(merged);
    return merged;
  }

  /** All snapshots for export (repo + optional extra sources merged by date). */
  exportSnapshots(extra: DailySnapshot[] = []): DailySnapshot[] {
    return mergeSnapshotsByDate([...this.repo.list(), ...extra]);
  }
}
