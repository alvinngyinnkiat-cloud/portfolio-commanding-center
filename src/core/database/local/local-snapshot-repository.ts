import type { DailySnapshot } from "@/core/domain/types";
import type { SnapshotRepository } from "../repositories/snapshot-repository";
import { DEFAULT_SNAPSHOTS } from "@/core/domain/defaults";
import { normalizeDailySnapshot } from "@/core/calculations/snapshots";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

export class LocalSnapshotRepository implements SnapshotRepository {
  list(): DailySnapshot[] {
    const raw = readJson(STORAGE_KEYS.snapshots, DEFAULT_SNAPSHOTS);
    return raw.map((snapshot) => normalizeDailySnapshot(snapshot));
  }

  upsert(snapshot: DailySnapshot): void {
    const normalized = normalizeDailySnapshot(snapshot);
    const list = this.list();
    const idx = list.findIndex((s) => s.date === normalized.date);
    if (idx >= 0) {
      list[idx] = normalized;
    } else {
      list.push(normalized);
    }
    list.sort((a, b) => a.date.localeCompare(b.date));
    this.replaceAll(list);
  }

  delete(date: string): void {
    this.replaceAll(this.list().filter((s) => s.date !== date));
  }

  replaceAll(snapshots: DailySnapshot[]): void {
    writeJson(
      STORAGE_KEYS.snapshots,
      snapshots.map((snapshot) => normalizeDailySnapshot(snapshot))
    );
  }
}
