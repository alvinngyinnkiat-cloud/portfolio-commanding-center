import type { PersistedCurrentPriceRecord } from "@/core/domain/types/current-price";
import type {
  UpsertCurrentPriceRecordOutcome,
} from "@/core/calculations/scanner/current-price-records";
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
  upsertCurrentPriceRecord(
    record: PersistedCurrentPriceRecord
  ): UpsertCurrentPriceRecordOutcome;
  getCurrentPriceRecord(ticker: string): PersistedCurrentPriceRecord | null;
  getAllCurrentPriceRecords(): Map<string, PersistedCurrentPriceRecord>;
  verifyCurrentPriceRecord(
    stored: PersistedCurrentPriceRecord | null,
    expected: PersistedCurrentPriceRecord
  ): boolean;
  /** Read normalized store — used to rebuild snapshot after refresh. */
  readStore(): ScannerResultsStore;
}

export interface ScannerScheduleRepository {
  get(): ScannerScheduleState;
  set(state: ScannerScheduleState): void;
}
