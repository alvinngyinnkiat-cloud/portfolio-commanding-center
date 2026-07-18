import type { MarketDataRecord } from "@/core/domain/types/market-data";
import type { ScannerScanRun, ScannerTickerPriceSourceKey } from "@/core/domain/types/scanner";
import type { PersistedCurrentPriceRecord } from "@/core/domain/types/current-price";
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
  latestRunId: string | null,
  priceRecord?: PersistedCurrentPriceRecord | null
): MarketDataRecord {
  const result = record.result;
  const useCentralPrice =
    priceRecord != null && isValidPrice(priceRecord.currentPrice);

  return {
    ticker: normalizeTicker(record.ticker),
    currentPrice: useCentralPrice
      ? priceRecord.currentPrice
      : (result.currentPrice ?? 0),
    marketSession: useCentralPrice
      ? priceRecord.marketSession
      : record.marketDate,
    refreshedAt: useCentralPrice ? priceRecord.refreshedAt : record.refreshedAt,
    priceSource: useCentralPrice
      ? priceRecord.source
      : (result.priceSource ?? null),
    priceSourceKey: useCentralPrice
      ? priceRecord.sourceKey
      : (result.priceSourceKey ?? null),
    priceStatus: useCentralPrice
      ? priceRecord.status
      : (result.priceStatus ?? null),
    candles: result.recentCandles,
    atr14: result.indicators.atr14,
    currentAveragePrice: result.indicators.avgPrice,
    previousAveragePrice: result.indicators.avgPricePrev,
    indicatorStatus: result.indicatorStatus ?? null,
    refreshRunId: useCentralPrice
      ? priceRecord.refreshRunId
      : record.refreshRunId,
    scannerResult: result,
    isStale:
      priceRecord?.status === "stale" ||
      (latestRunId != null && record.refreshRunId !== latestRunId),
  };
}

function toScannerPriceSourceKey(
  key: import("@/core/domain/types/current-price").CurrentPriceSourceKey
): ScannerTickerPriceSourceKey {
  if (key === "manual_fallback" || key === "saved_trade") return "stored_candle";
  return "daily_close";
}

function mapPriceOnlyMarketDataRecord(
  priceRecord: PersistedCurrentPriceRecord
): MarketDataRecord {
  const reason = "Price-only — scanner indicators unavailable";
  const scannerResult: import("@/core/domain/types/scanner").ScannerTickerResult = {
    ticker: priceRecord.ticker,
    category: "Custom",
    market: "US",
    currentPrice: priceRecord.currentPrice,
    priceAsOf: priceRecord.marketSession,
    priceSource: priceRecord.source,
    priceSourceKey: toScannerPriceSourceKey(priceRecord.sourceKey),
    priceStatus: priceRecord.status === "unavailable" ? "stale" : priceRecord.status,
    status: "price_only",
    indicatorStatus: "insufficient_history",
    indicatorError: reason,
    candlesAvailable: 0,
    candlesRequired: 200,
    indicators: {
      ema20: null,
      ema20Prev: null,
      sma50: null,
      sma50Prev: null,
      sma50SlopePct: null,
      sma200: null,
      sma200Prev: null,
      atr14: null,
      so: null,
      soPrev: null,
      soStatus: "Rolling Down",
      soDebug: null,
      atrDebug: null,
      high: null,
      low: null,
      avgPrice: null,
      avgPricePrev: null,
      emaDiff: null,
      emaDiffPct: null,
      marketStructure: "Neutral",
      momentum: "At EMA",
      trend: "Neutral",
      trendQualityScore: 0,
    },
    structure: {
      dailySupport: null,
      weeklySupport: null,
      primarySupport: null,
      dailyResistance: null,
      weeklyResistance: null,
      primaryResistance: null,
      midPrice: null,
      rangeWidth: null,
      sellPutRange: null,
      sellCallRange: null,
      icMidZone: null,
    },
    strategies: {
      bullPut: {
        eligible: false,
        checklist: [],
        passReasons: [],
        failReasons: [reason],
      },
      bearCall: {
        eligible: false,
        checklist: [],
        passReasons: [],
        failReasons: [reason],
      },
      ironCondor: {
        eligible: false,
        checklist: [],
        passReasons: [],
        failReasons: [reason],
      },
    },
    emaStrategy: {
      output: "NO TRADE",
      reasons: [reason],
      checklist: [],
    },
    mainSystem: {
      output: "NO TRADE",
      strategy: null,
      reasons: [reason],
    },
    bestSetup: null,
    tradable: false,
    tradeReasons: [reason],
    recentCandles: [],
    notes: [reason],
  };

  return {
    ticker: normalizeTicker(priceRecord.ticker),
    currentPrice: priceRecord.currentPrice,
    marketSession: priceRecord.marketSession,
    refreshedAt: priceRecord.refreshedAt,
    priceSource: priceRecord.source,
    priceSourceKey: priceRecord.sourceKey,
    priceStatus: priceRecord.status,
    candles: [],
    atr14: null,
    currentAveragePrice: null,
    previousAveragePrice: null,
    indicatorStatus: "insufficient_history",
    refreshRunId: priceRecord.refreshRunId,
    scannerResult,
    isStale: priceRecord.status === "stale",
  };
}

function compareMarketDataRecords(a: MarketDataRecord, b: MarketDataRecord): number {
  const marketCmp = b.marketSession.localeCompare(a.marketSession);
  if (marketCmp !== 0) return marketCmp;
  return b.refreshedAt.localeCompare(a.refreshedAt);
}

/**
 * Single shared read surface for Modules 4, 5 and 6.
 * Merges central current-price records with scanner indicator records.
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
    const priceRecords = this.scannerResultRepo.getAllCurrentPriceRecords();
    const scannerRecords = this.scannerResultRepo.getAllLatestTickerRecords();
    const map = new Map<string, MarketDataRecord>();
    const seen = new Set<string>();

    for (const [ticker, scannerRecord] of scannerRecords) {
      if (!isValidPrice(scannerRecord.result.currentPrice) && !priceRecords.has(ticker)) {
        continue;
      }
      const priceRecord = priceRecords.get(ticker) ?? null;
      if (priceRecord && isValidPrice(priceRecord.currentPrice)) {
        map.set(
          ticker,
          mapPersistedToMarketDataRecord(scannerRecord, latestRunId, priceRecord)
        );
      } else if (isValidPrice(scannerRecord.result.currentPrice)) {
        map.set(ticker, mapPersistedToMarketDataRecord(scannerRecord, latestRunId));
      }
      seen.add(ticker);
    }

    for (const [ticker, priceRecord] of priceRecords) {
      if (seen.has(ticker)) continue;
      map.set(ticker, mapPriceOnlyMarketDataRecord(priceRecord));
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
