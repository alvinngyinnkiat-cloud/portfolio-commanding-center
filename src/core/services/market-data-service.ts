import type { MarketDataRecord } from "@/core/domain/types/market-data";
import type { ScannerScanRun } from "@/core/domain/types/scanner";
import type { ScannerResultRepository } from "@/core/database/repositories/scanner-repository";
import type {
  PersistedScannerTickerRecord,
  ScannerRefreshRunMetadata,
} from "@/core/calculations/scanner/scanner-ticker-records";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";

function isValidPrice(price: number | null | undefined): price is number {
  return price != null && Number.isFinite(price) && price > 0;
}

export function mapPersistedToMarketDataRecord(
  record: PersistedScannerTickerRecord,
  latestRunId: string | null
): MarketDataRecord {
  const result = record.result;
  return {
    ticker: normalizeTicker(record.ticker),
    currentPrice: result.currentPrice ?? 0,
    marketSession: record.marketDate,
    refreshedAt: record.refreshedAt,
    priceSource: result.priceSource ?? null,
    priceSourceKey: result.priceSourceKey ?? null,
    priceStatus: result.priceStatus ?? null,
    candles: result.recentCandles,
    atr14: result.indicators.atr14,
    currentAveragePrice: result.indicators.avgPrice,
    previousAveragePrice: result.indicators.avgPricePrev,
    indicatorStatus: result.indicatorStatus ?? null,
    refreshRunId: record.refreshRunId,
    scannerResult: result,
    isStale: latestRunId != null && record.refreshRunId !== latestRunId,
  };
}

function compareMarketDataRecords(a: MarketDataRecord, b: MarketDataRecord): number {
  const marketCmp = b.marketSession.localeCompare(a.marketSession);
  if (marketCmp !== 0) return marketCmp;
  return b.refreshedAt.localeCompare(a.refreshedAt);
}

/**
 * Single shared read surface for Modules 4, 5 and 6.
 * Reads centrally persisted per-ticker records only — no quote/candle fallbacks.
 */
export class MarketDataService {
  private version = 0;

  constructor(private readonly scannerResultRepo: ScannerResultRepository) {}

  invalidate(): void {
    this.version += 1;
  }

  getVersion(): number {
    return this.version;
  }

  getLastRefreshRun(): ScannerRefreshRunMetadata | null {
    return this.scannerResultRepo.getLastRefreshRun();
  }

  getLatestMarketData(ticker: string): MarketDataRecord | null {
    return this.getRecordMap().get(normalizeTicker(ticker)) ?? null;
  }

  getRecordMap(): Map<string, MarketDataRecord> {
    const store = this.scannerResultRepo.readStore();
    const latestRunId =
      store.lastRefreshRun?.refreshRunId ?? store.latest?.id ?? null;
    const persisted = this.scannerResultRepo.getAllLatestTickerRecords();
    const map = new Map<string, MarketDataRecord>();

    for (const [ticker, record] of persisted) {
      if (!isValidPrice(record.result.currentPrice)) continue;
      map.set(ticker, mapPersistedToMarketDataRecord(record, latestRunId));
    }

    return map;
  }

  /** Re-read persisted store after save and verify expected tickers. */
  verifyPersistedRecords(
    expected: PersistedScannerTickerRecord[]
  ): { ok: string[]; failed: Array<{ ticker: string; error: string }> } {
    const ok: string[] = [];
    const failed: Array<{ ticker: string; error: string }> = [];

    for (const record of expected) {
      const ticker = normalizeTicker(record.ticker);
      const stored = this.scannerResultRepo.getTickerRecord(
        record.ticker,
        record.marketDate
      );

      if (!this.scannerResultRepo.verifyTickerRecord(stored, record)) {
        failed.push({ ticker, error: "Post-save verification mismatch" });
        continue;
      }

      if (stored!.result.currentPrice !== record.result.currentPrice) {
        failed.push({ ticker, error: "currentPrice mismatch after re-read" });
        continue;
      }

      if (stored!.marketDate !== record.marketDate) {
        failed.push({ ticker, error: "marketSession mismatch after re-read" });
        continue;
      }

      if (stored!.refreshedAt !== record.refreshedAt) {
        failed.push({ ticker, error: "refreshedAt mismatch after re-read" });
        continue;
      }

      if (stored!.refreshRunId !== record.refreshRunId) {
        failed.push({ ticker, error: "refreshRunId mismatch after re-read" });
        continue;
      }

      ok.push(ticker);
    }

    return { ok, failed };
  }

  getLatestScanRun(): ScannerScanRun | null {
    return this.scannerResultRepo.getLatest();
  }
}
