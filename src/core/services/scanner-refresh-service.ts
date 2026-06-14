import type { ScannerScanRun } from "@/core/domain/types/scanner";
import type { StockCandleUpdateResult } from "./stock-candle-update-service";

export type ScannerManualRefreshOutcome = ScannerScanRun["refreshStatus"];

export interface ScannerManualRefreshResult {
  outcome: ScannerManualRefreshOutcome;
  candleResult: StockCandleUpdateResult;
  scanRun: ScannerScanRun;
}

/**
 * Manual scanner refresh — same pipeline as scheduled refresh:
 * fetch completed daily candles, then recalculate scan results.
 */
export async function runScannerManualRefresh(
  updateCandles: (date?: Date) => Promise<StockCandleUpdateResult>,
  runScan: (date?: Date) => ScannerScanRun,
  date: Date = new Date()
): Promise<ScannerManualRefreshResult> {
  const candleResult = await updateCandles(date);
  const scanRun = runScan(date);
  return {
    outcome: scanRun.refreshStatus,
    candleResult,
    scanRun,
  };
}
