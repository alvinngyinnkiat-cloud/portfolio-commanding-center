import type { DailySnapshot } from "@/core/domain/types";
import type { SnapshotRepository } from "@/core/database/repositories/snapshot-repository";
import { createDailySnapshot } from "@/core/calculations/snapshots";
import { getSingaporeDateString } from "@/core/calculations/snapshot-schedule";
import { mergeSnapshotsByDate } from "@/core/database/supabase/snapshot-merge";
import type { PortfolioAggregator } from "./portfolio-aggregator";
import { sortByDateDesc } from "@/shared/lib/sort";

export type SnapshotSupabaseSaver = (
  snapshot: DailySnapshot
) => Promise<DailySnapshot>;

export interface CaptureSnapshotResult {
  snapshot: DailySnapshot;
  savedToSupabase: boolean;
  supabaseError?: string;
}

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

  /**
   * Manual capture with isolated Supabase insert — reads live values only,
   * never queues full snapshot sync or reloads other modules.
   */
  async captureNowAsync(options?: {
    saveToSupabase?: SnapshotSupabaseSaver;
  }): Promise<CaptureSnapshotResult | null> {
    const state = this.aggregator.getPortfolioState();
    if (!state.fxRateValid || !state.inputs || !state.metrics) {
      return null;
    }

    const snapshot = createDailySnapshot(state.inputs, state.metrics, {
      date: getSingaporeDateString(),
      snapshotType: "manual",
      createdAt: new Date().toISOString(),
    });

    if (options?.saveToSupabase) {
      try {
        const verified = await options.saveToSupabase(snapshot);
        this.repo.upsertLocalOnly(verified);
        return { snapshot: verified, savedToSupabase: true };
      } catch (error) {
        const supabaseError =
          error instanceof Error ? error.message : "Unknown Supabase error";
        this.repo.upsertLocalOnly(snapshot);
        return { snapshot, savedToSupabase: false, supabaseError };
      }
    }

    this.repo.upsertLocalOnly(snapshot);
    return { snapshot, savedToSupabase: false };
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
