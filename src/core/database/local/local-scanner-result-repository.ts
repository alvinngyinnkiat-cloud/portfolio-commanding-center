import type { ScannerScanRun } from "@/core/domain/types/scanner";
import type { ScannerResultRepository } from "../repositories/scanner-repository";
import type {
  PersistedScannerTickerRecord,
  ScannerRefreshRunMetadata,
  ScannerResultsStore,
  UpsertTickerRecordOutcome,
} from "@/core/calculations/scanner/scanner-ticker-records";
import {
  createScannerResultRepositoryExtensions,
  getLatestScannerRun,
  getPreviousScannerRun,
  saveScannerRun,
} from "../scanner-result-repository-helpers";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

const EMPTY: ScannerResultsStore = {
  latest: null,
  previous: null,
  tickerRecords: {},
  tickerLatestKeys: {},
  lastRefreshRun: null,
};

export class LocalScannerResultRepository implements ScannerResultRepository {
  private readStoreInternal(): ScannerResultsStore {
    return readJson<ScannerResultsStore>(STORAGE_KEYS.scannerResults, EMPTY);
  }

  private writeStoreInternal(store: ScannerResultsStore): void {
    writeJson(STORAGE_KEYS.scannerResults, store);
  }

  private get extensions() {
    return createScannerResultRepositoryExtensions(
      () => this.readStoreInternal(),
      (store) => this.writeStoreInternal(store)
    );
  }

  getLatest(): ScannerScanRun | null {
    return getLatestScannerRun(() => this.readStoreInternal());
  }

  getPrevious(): ScannerScanRun | null {
    return getPreviousScannerRun(() => this.readStoreInternal());
  }

  save(run: ScannerScanRun): void {
    saveScannerRun(
      () => this.readStoreInternal(),
      (store) => this.writeStoreInternal(store),
      run
    );
  }

  upsertTickerRecord(record: PersistedScannerTickerRecord): UpsertTickerRecordOutcome {
    return this.extensions.upsertTickerRecord(record);
  }

  getTickerRecord(ticker: string, marketDate: string): PersistedScannerTickerRecord | null {
    return this.extensions.getTickerRecord(ticker, marketDate);
  }

  getLatestTickerRecord(ticker: string): PersistedScannerTickerRecord | null {
    return this.extensions.getLatestTickerRecord(ticker);
  }

  getAllLatestTickerRecords(): Map<string, PersistedScannerTickerRecord> {
    return this.extensions.getAllLatestTickerRecords();
  }

  getLastRefreshRun(): ScannerRefreshRunMetadata | null {
    return this.extensions.getLastRefreshRun();
  }

  setLastRefreshRun(run: ScannerRefreshRunMetadata): void {
    this.extensions.setLastRefreshRun(run);
  }

  verifyTickerRecord(
    stored: PersistedScannerTickerRecord | null,
    expected: PersistedScannerTickerRecord
  ): boolean {
    return this.extensions.verifyTickerRecord(stored, expected);
  }

  readStore(): ScannerResultsStore {
    return this.extensions.readStore();
  }
}
