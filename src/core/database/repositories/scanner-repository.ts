import type {
  ScannerRefreshRunMetadata,
  PersistedScannerTickerRecord,
  ScannerResultsStore,
  UpsertTickerRecordOutcome,
} from "@/core/calculations/scanner/scanner-ticker-records";
import type { ScannerScanRun, ScannerScheduleState } from "@/core/domain/types/scanner";

export interface ScannerResultRepository {
  getLatest(): ScannerScanRun | null;
  getPrevious(): ScannerScanRun | null;
  save(run: ScannerScanRun): void;
  upsertTickerRecord(record: PersistedScannerTickerRecord): UpsertTickerRecordOutcome;
  getTickerRecord(
    ticker: string,
    marketDate: string
  ): PersistedScannerTickerRecord | null;
  getLatestTickerRecord(ticker: string): PersistedScannerTickerRecord | null;
  getAllLatestTickerRecords(): Map<string, PersistedScannerTickerRecord>;
  getLastRefreshRun(): ScannerRefreshRunMetadata | null;
  setLastRefreshRun(run: ScannerRefreshRunMetadata): void;
  verifyTickerRecord(
    stored: PersistedScannerTickerRecord | null,
    expected: PersistedScannerTickerRecord
  ): boolean;
  /** Read normalized store — used to rebuild snapshot after refresh. */
  readStore(): ScannerResultsStore;
}

export interface ScannerScheduleRepository {
  get(): ScannerScheduleState;
  set(state: ScannerScheduleState): void;
}
