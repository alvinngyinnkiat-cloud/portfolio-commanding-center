import type { MarketDataRecord } from "@/core/domain/types/market-data";
import type { ScannerResultRepository } from "@/core/database/repositories/scanner-repository";
import { MarketDataService } from "./market-data-service";

/** @deprecated Use MarketDataService — kept for backward-compatible imports. */
export type LatestScannerRecord = MarketDataRecord;

/**
 * Thin compatibility wrapper — delegates to MarketDataService.
 */
export class ScannerSnapshotService {
  private readonly marketData: MarketDataService;

  constructor(
    scannerResultRepo: ScannerResultRepository,
    marketData?: MarketDataService
  ) {
    this.marketData = marketData ?? new MarketDataService(scannerResultRepo);
  }

  invalidate(): void {
    this.marketData.invalidate();
  }

  getVersion(): number {
    return this.marketData.getVersion();
  }

  getLatestScannerRecord(ticker: string): MarketDataRecord | null {
    return this.marketData.getLatestMarketData(ticker);
  }

  getRecordMap(): Map<string, MarketDataRecord> {
    return this.marketData.getRecordMap();
  }
}

export type { MarketDataRecord };
