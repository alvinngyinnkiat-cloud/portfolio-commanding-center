import type { ScannerScanRun } from "@/core/domain/types/scanner";
import type { StockCandleUpdateResult } from "./stock-candle-update-service";
import type {
  ScannerHardenedRefreshResult,
  ScannerRefreshOrchestrator,
  ScannerRefreshProgress,
} from "./scanner-refresh-orchestrator";

export type ScannerManualRefreshOutcome = ScannerScanRun["refreshStatus"];

export interface ScannerManualRefreshResult {
  outcome: ScannerManualRefreshOutcome;
  metadataStatus: ScannerHardenedRefreshResult["refreshRun"]["status"];
  candleResult: StockCandleUpdateResult;
  scanRun: ScannerScanRun;
  refreshRun: ScannerHardenedRefreshResult["refreshRun"];
  tickerStatuses: ScannerHardenedRefreshResult["tickerStatuses"];
}

export async function runScannerManualRefresh(
  orchestrator: ScannerRefreshOrchestrator,
  updateCandles: (date?: Date) => Promise<StockCandleUpdateResult>,
  date: Date = new Date(),
  onProgress?: (progress: ScannerRefreshProgress) => void
): Promise<ScannerManualRefreshResult> {
  const result = await orchestrator.runRefresh({
    updateCandles,
    date,
    onProgress,
  });

  return {
    outcome: result.scanRun.refreshStatus,
    metadataStatus: result.refreshRun.status,
    candleResult: result.candleResult,
    scanRun: result.scanRun,
    refreshRun: result.refreshRun,
    tickerStatuses: result.tickerStatuses,
  };
}

export async function retryFailedScannerTickers(
  orchestrator: ScannerRefreshOrchestrator,
  failedTickers: string[],
  updateCandles: (date?: Date) => Promise<StockCandleUpdateResult>,
  date: Date = new Date(),
  onProgress?: (progress: ScannerRefreshProgress) => void
): Promise<ScannerManualRefreshResult> {
  const result = await orchestrator.runRefresh({
    updateCandles,
    date,
    tickers: failedTickers,
    onProgress,
  });

  return {
    outcome: result.scanRun.refreshStatus,
    metadataStatus: result.refreshRun.status,
    candleResult: result.candleResult,
    scanRun: result.scanRun,
    refreshRun: result.refreshRun,
    tickerStatuses: result.tickerStatuses,
  };
}
