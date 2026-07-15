import type { ScannerResultRepository } from "@/core/database/repositories/scanner-repository";
import {
  buildAllLatestTickerRecords,
  getLatestPersistedTickerRecord,
  getPersistedTickerRecord,
  normalizeScannerResultsStore,
  upsertTickerRecord,
  verifyPersistedTickerRecord,
  type PersistedScannerTickerRecord,
  type ScannerRefreshRunMetadata,
  type ScannerResultsStore,
  type UpsertTickerRecordOutcome,
} from "@/core/calculations/scanner/scanner-ticker-records";
import { normalizeScannerScanRun } from "@/core/calculations/scanner/normalize-scan-result";
import type { ScannerScanRun } from "@/core/domain/types/scanner";

export function createScannerResultRepositoryExtensions(
  readStore: () => ScannerResultsStore,
  writeStore: (store: ScannerResultsStore) => void
): Pick<
  ScannerResultRepository,
  | "upsertTickerRecord"
  | "getTickerRecord"
  | "getLatestTickerRecord"
  | "getAllLatestTickerRecords"
  | "getLastRefreshRun"
  | "setLastRefreshRun"
  | "verifyTickerRecord"
  | "readStore"
> {
  return {
    readStore(): ScannerResultsStore {
      return normalizeScannerResultsStore(readStore());
    },

    upsertTickerRecord(record: PersistedScannerTickerRecord): UpsertTickerRecordOutcome {
      const store = normalizeScannerResultsStore(readStore());
      const outcome = upsertTickerRecord(store, record);
      writeStore(store);
      return outcome;
    },

    getTickerRecord(ticker: string, marketDate: string): PersistedScannerTickerRecord | null {
      return getPersistedTickerRecord(normalizeScannerResultsStore(readStore()), ticker, marketDate);
    },

    getLatestTickerRecord(ticker: string): PersistedScannerTickerRecord | null {
      return getLatestPersistedTickerRecord(
        normalizeScannerResultsStore(readStore()),
        ticker
      );
    },

    getAllLatestTickerRecords(): Map<string, PersistedScannerTickerRecord> {
      return buildAllLatestTickerRecords(normalizeScannerResultsStore(readStore()));
    },

    getLastRefreshRun(): ScannerRefreshRunMetadata | null {
      return normalizeScannerResultsStore(readStore()).lastRefreshRun ?? null;
    },

    setLastRefreshRun(run: ScannerRefreshRunMetadata): void {
      const store = normalizeScannerResultsStore(readStore());
      store.lastRefreshRun = run;
      writeStore(store);
    },

    verifyTickerRecord(
      stored: PersistedScannerTickerRecord | null,
      expected: PersistedScannerTickerRecord
    ): boolean {
      return verifyPersistedTickerRecord(stored, expected);
    },
  };
}

export function saveScannerRun(
  readStore: () => ScannerResultsStore,
  writeStore: (store: ScannerResultsStore) => void,
  run: ScannerScanRun
): void {
  const store = normalizeScannerResultsStore(readStore());
  store.previous = store.latest;
  store.latest = normalizeScannerScanRun(run);
  writeStore(store);
}

export function getLatestScannerRun(readStore: () => ScannerResultsStore): ScannerScanRun | null {
  return normalizeScannerScanRun(normalizeScannerResultsStore(readStore()).latest);
}

export function getPreviousScannerRun(readStore: () => ScannerResultsStore): ScannerScanRun | null {
  return normalizeScannerScanRun(normalizeScannerResultsStore(readStore()).previous);
}
