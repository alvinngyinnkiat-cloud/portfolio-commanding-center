import type { DailySnapshot } from "@/core/domain/types";
import type { SnapshotRepository } from "../repositories/snapshot-repository";
import { DEFAULT_SNAPSHOTS } from "@/core/domain/defaults";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

export class LocalSnapshotRepository implements SnapshotRepository {
  list(): DailySnapshot[] {
    return readJson(STORAGE_KEYS.snapshots, DEFAULT_SNAPSHOTS);
  }

  upsert(snapshot: DailySnapshot): void {
    const list = this.list();
    const idx = list.findIndex((s) => s.date === snapshot.date);
    if (idx >= 0) {
      list[idx] = snapshot;
    } else {
      list.push(snapshot);
    }
    list.sort((a, b) => a.date.localeCompare(b.date));
    this.replaceAll(list);
  }

  replaceAll(snapshots: DailySnapshot[]): void {
    writeJson(STORAGE_KEYS.snapshots, snapshots);
  }
}
