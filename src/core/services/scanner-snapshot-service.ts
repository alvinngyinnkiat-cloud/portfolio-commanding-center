import type { ScannerScanRun } from "@/core/domain/types/scanner";
import type { ScannerResultRepository } from "@/core/database/repositories/scanner-repository";
import {
  buildLatestScannerRecordMap,
  getLatestScannerRecordFromRuns,
  type LatestScannerRecord,
} from "@/core/calculations/scanner/scanner-snapshot";

/**
 * Shared read-only scanner snapshot for Modules 5 and 6.
 * Always resolves per-ticker records from persisted scan runs (latest + previous).
 */
export class ScannerSnapshotService {
  private version = 0;

  constructor(private readonly scannerResultRepo: ScannerResultRepository) {}

  /** Bump after scanner refresh persistence so subscribers refetch. */
  invalidate(): void {
    this.version += 1;
  }

  getVersion(): number {
    return this.version;
  }

  private loadRuns(): ScannerScanRun[] {
    return [this.scannerResultRepo.getLatest(), this.scannerResultRepo.getPrevious()].filter(
      (run): run is ScannerScanRun => run != null
    );
  }

  getLatestScannerRecord(ticker: string): LatestScannerRecord | null {
    return getLatestScannerRecordFromRuns(this.loadRuns(), ticker);
  }

  getRecordMap(): Map<string, LatestScannerRecord> {
    return buildLatestScannerRecordMap(this.loadRuns());
  }
}

export type { LatestScannerRecord };
