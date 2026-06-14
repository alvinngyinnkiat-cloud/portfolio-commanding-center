import type { DailySnapshot } from "@/core/domain/types";

export interface SnapshotRepository {
  list(): DailySnapshot[];
  upsert(snapshot: DailySnapshot): void;
  delete(date: string): void;
  replaceAll(snapshots: DailySnapshot[]): void;
}
