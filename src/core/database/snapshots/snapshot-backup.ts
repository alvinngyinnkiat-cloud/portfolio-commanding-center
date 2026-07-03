import type { DailySnapshot } from "@/core/domain/types";
import { normalizeDailySnapshot } from "@/core/calculations/snapshots";
import { mergeSnapshotsByDate } from "@/core/database/supabase/snapshot-merge";
import { STORAGE_KEYS } from "@/core/database/local/storage-keys";
import { readJson, writeJson } from "@/core/database/local/local-storage";

export function readSnapshotBackup(): DailySnapshot[] {
  if (typeof window === "undefined") return [];
  const raw = readJson<unknown[]>(STORAGE_KEYS.snapshotsBackup, []);
  return raw.map((row) =>
    normalizeDailySnapshot(row as Parameters<typeof normalizeDailySnapshot>[0])
  );
}

export function writeSnapshotBackup(snapshots: DailySnapshot[]): void {
  if (typeof window === "undefined") return;
  writeJson(
    STORAGE_KEYS.snapshotsBackup,
    snapshots.map((row) => normalizeDailySnapshot(row))
  );
}

/** Append one snapshot to the local backup file (deduped by date). */
export function appendSnapshotBackup(snapshot: DailySnapshot): DailySnapshot[] {
  const merged = mergeSnapshotsByDate([...readSnapshotBackup(), snapshot]);
  writeSnapshotBackup(merged);
  return merged;
}

export function downloadSnapshotsJson(snapshots: DailySnapshot[], filename?: string): void {
  const merged = mergeSnapshotsByDate(snapshots);
  const blob = new Blob([JSON.stringify(merged, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    filename ?? `portfolio-snapshots-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseSnapshotsImportFile(text: string): DailySnapshot[] {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Backup file must be a JSON array of snapshots.");
  }
  return parsed.map((row) =>
    normalizeDailySnapshot(row as Parameters<typeof normalizeDailySnapshot>[0])
  );
}
