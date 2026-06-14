import type { ScannerScanRun } from "@/core/domain/types/scanner";
import type { ScannerResultRepository } from "../repositories/scanner-repository";
import { normalizeScannerScanRun } from "@/core/calculations/scanner/normalize-scan-result";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

interface StoredScannerResults {
  latest: ScannerScanRun | null;
  previous: ScannerScanRun | null;
}

const EMPTY: StoredScannerResults = { latest: null, previous: null };

export class LocalScannerResultRepository implements ScannerResultRepository {
  private readStore(): StoredScannerResults {
    return readJson(STORAGE_KEYS.scannerResults, EMPTY);
  }

  getLatest(): ScannerScanRun | null {
    return normalizeScannerScanRun(this.readStore().latest);
  }

  getPrevious(): ScannerScanRun | null {
    return normalizeScannerScanRun(this.readStore().previous);
  }

  save(run: ScannerScanRun): void {
    const store = this.readStore();
    writeJson(STORAGE_KEYS.scannerResults, {
      previous: store.latest,
      latest: run,
    });
  }
}
