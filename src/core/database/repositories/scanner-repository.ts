import type { ScannerScanRun, ScannerScheduleState } from "@/core/domain/types/scanner";

export interface ScannerResultRepository {
  getLatest(): ScannerScanRun | null;
  getPrevious(): ScannerScanRun | null;
  save(run: ScannerScanRun): void;
}

export interface ScannerScheduleRepository {
  get(): ScannerScheduleState;
  set(state: ScannerScheduleState): void;
}
