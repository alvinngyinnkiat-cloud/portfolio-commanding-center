import type { DailySnapshot } from "@/core/domain/types";
import type { SnapshotRepository } from "@/core/database/repositories/snapshot-repository";
import { createDailySnapshot } from "@/core/calculations/snapshots";
import {
  getSingaporeDateString,
  isSingaporeAutomaticSnapshotDue,
  type AutomaticSnapshotSkipReason,
} from "@/core/calculations/snapshot-schedule";
import type { PortfolioAggregator } from "./portfolio-aggregator";
import { sortByDateDesc } from "@/shared/lib/sort";

export interface AutomaticSnapshotCaptureResult {
  snapshot: DailySnapshot | null;
  skipReason: AutomaticSnapshotSkipReason | null;
  snapshotDate: string;
}

export interface AutomaticSnapshotCaptureOptions {
  /** Vercel Cron — skip client time-window guard; upsert by Singapore date. */
  fromCron?: boolean;
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
   * End-of-day auto capture at 11:59 PM Singapore time.
   * Polled client-side while the dashboard is open; also invoked by Vercel Cron.
   */
  captureEndOfDayIfDue(): DailySnapshot | null {
    return this.attemptAutomaticSnapshotCapture().snapshot;
  }

  /** Server cron capture — trusts Vercel schedule (15:59 UTC = 23:59 SGT). */
  captureEndOfDayForDate(date: Date = new Date()): DailySnapshot | null {
    return this.attemptAutomaticSnapshotCapture(date, { fromCron: true }).snapshot;
  }

  attemptAutomaticSnapshotCapture(
    date: Date = new Date(),
    options?: AutomaticSnapshotCaptureOptions
  ): AutomaticSnapshotCaptureResult {
    const snapshotDate = getSingaporeDateString(date);

    if (!options?.fromCron && !isSingaporeAutomaticSnapshotDue(date)) {
      return {
        snapshot: null,
        skipReason: "before_capture_time",
        snapshotDate,
      };
    }

    const state = this.aggregator.getPortfolioState();
    if (!state.fxRateValid || !state.inputs || !state.metrics) {
      return {
        snapshot: null,
        skipReason: "invalid_state",
        snapshotDate,
      };
    }

    const snapshot = createDailySnapshot(state.inputs, state.metrics, {
      date: snapshotDate,
      snapshotType: "automatic",
      createdAt: date.toISOString(),
    });
    this.repo.upsert(snapshot);
    return {
      snapshot,
      skipReason: null,
      snapshotDate,
    };
  }
}
