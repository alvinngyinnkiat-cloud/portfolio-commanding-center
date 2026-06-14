import type { ScannerScheduleState } from "@/core/domain/types/scanner";
import type { ScannerScheduleRepository } from "../repositories/scanner-repository";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

const DEFAULT_STATE: ScannerScheduleState = {
  lastScanDate: null,
  lastSuccessfulScanTime: null,
  failedRefreshCount: 0,
  lastFailedAttemptDate: null,
};

export class LocalScannerScheduleRepository implements ScannerScheduleRepository {
  get(): ScannerScheduleState {
    const state = readJson(STORAGE_KEYS.scannerSchedule, DEFAULT_STATE);
    return {
      ...DEFAULT_STATE,
      ...state,
      lastFailedAttemptDate: state.lastFailedAttemptDate ?? null,
    };
  }

  set(state: ScannerScheduleState): void {
    writeJson(STORAGE_KEYS.scannerSchedule, state);
  }
}
