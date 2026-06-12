import type { DailySnapshot } from "@/core/domain/types";
import type { SnapshotRepository } from "@/core/database/repositories/snapshot-repository";
import { createDailySnapshot } from "@/core/calculations/snapshots";
import type { PortfolioAggregator } from "./portfolio-aggregator";

export class SnapshotService {
  constructor(
    private repo: SnapshotRepository,
    private aggregator: PortfolioAggregator
  ) {}

  list(): DailySnapshot[] {
    return this.repo.list();
  }

  captureNow(): DailySnapshot {
    const { inputs, metrics } = this.aggregator.getPortfolioState();
    const snapshot = createDailySnapshot(inputs, metrics);
    this.repo.upsert(snapshot);
    return snapshot;
  }
}
