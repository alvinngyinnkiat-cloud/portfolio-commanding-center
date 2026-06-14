import type { DailySnapshot } from "@/core/domain/types";
import type { SnapshotRepository } from "@/core/database/repositories/snapshot-repository";
import { createDailySnapshot } from "@/core/calculations/snapshots";
import {
  getSingaporeDateString,
  isSingaporeEndOfDayCaptureWindow,
  hasSnapshotForDate,
} from "@/core/calculations/snapshot-schedule";
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

  /** Manual capture from Settings → Snapshots (v1.1 localStorage). */
  captureNow(): DailySnapshot | null {
    const state = this.aggregator.getPortfolioState();
    if (!state.fxRateValid || !state.inputs || !state.metrics) {
      return null;
    }

    const snapshot = createDailySnapshot(state.inputs, state.metrics, {
      snapshotType: "manual",
      createdAt: new Date().toISOString(),
    });
    this.repo.upsert(snapshot);
    return snapshot;
  }

  /**
   * End-of-day auto capture at 11:59pm Singapore time.
   *
   * v1.1 (localStorage): polled client-side while the dashboard is open.
   * Vercel Cron calls captureEndOfDayForDate at the scheduled time.
   *
   * Returns the new snapshot when captured; null when not due or already captured today.
   */
  captureEndOfDayIfDue(): DailySnapshot | null {
    if (!isSingaporeEndOfDayCaptureWindow()) {
      return null;
    }
    return this.captureEndOfDayForDate();
  }

  /** Server cron capture — skips client-side time-window check. */
  captureEndOfDayForDate(date: Date = new Date()): DailySnapshot | null {
    const snapshotDate = getSingaporeDateString(date);
    const existing = this.repo.list();
    if (hasSnapshotForDate(existing, snapshotDate)) {
      return null;
    }

    const state = this.aggregator.getPortfolioState();
    if (!state.fxRateValid || !state.inputs || !state.metrics) {
      return null;
    }

    const snapshot = createDailySnapshot(state.inputs, state.metrics, {
      date: snapshotDate,
      snapshotType: "automatic",
      createdAt: new Date().toISOString(),
    });
    this.repo.upsert(snapshot);
    return snapshot;
  }
}
