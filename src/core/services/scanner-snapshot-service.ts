import type { ScannerScanRun } from "@/core/domain/types/scanner";
import type { ScannerResultRepository } from "@/core/database/repositories/scanner-repository";
import {
  buildLatestScannerRecordMapFromSources,
  type LatestScannerRecord,
} from "@/core/calculations/scanner/scanner-snapshot";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";

/**
 * Shared read-only scanner snapshot for Modules 5 and 6.
 * Reads persisted per-ticker records first, then scan-run fallbacks.
 */
export class ScannerSnapshotService {
  private version = 0;

  constructor(private readonly scannerResultRepo: ScannerResultRepository) {}

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
    return this.getRecordMap().get(normalizeTicker(ticker)) ?? null;
  }

  getRecordMap(): Map<string, LatestScannerRecord> {
    const store = this.scannerResultRepo.readStore();
    return buildLatestScannerRecordMapFromSources({
      persisted: this.scannerResultRepo.getAllLatestTickerRecords(),
      runs: this.loadRuns(),
      latestRunId: store.lastRefreshRun?.refreshRunId ?? store.latest?.id ?? null,
    });
  }
}

export type { LatestScannerRecord };
