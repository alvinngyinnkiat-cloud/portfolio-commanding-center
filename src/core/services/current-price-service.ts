import type {
  CurrentPriceRefreshBatchResult,
  CurrentPriceRefreshProgress,
  CurrentPriceResult,
  PersistedCurrentPriceRecord,
} from "@/core/domain/types/current-price";
import type { PersistedScannerTickerRecord } from "@/core/calculations/scanner/scanner-ticker-records";
import {
  DAILY_CLOSE_SOURCE_LABEL,
  resolveCurrentPrice,
} from "@/core/calculations/scanner/resolve-current-price";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import type { ScannerResultRepository } from "@/core/database/repositories/scanner-repository";
import type { StockDailyCandleRepository } from "@/core/database/repositories/stock-daily-candle-repository";
import { generateId } from "@/core/database/local/local-storage";
import type { StockCandleUpdateService } from "./stock-candle-update-service";
import type { MarketDataService } from "./market-data-service";

export interface CurrentPriceTickerInput {
  ticker: string;
  fetchSymbol?: string;
  manualPriceUsd?: number | null;
}

function isValidPrice(price: number | null | undefined): price is number {
  return price != null && Number.isFinite(price) && price > 0;
}

function toPersistedRecord(input: {
  ticker: string;
  resolved: NonNullable<ReturnType<typeof resolveCurrentPrice>>;
  refreshedAt: string;
  refreshRunId: string;
}): PersistedCurrentPriceRecord {
  return {
    ticker: normalizeTicker(input.ticker),
    currentPrice: input.resolved.currentPrice,
    marketSession: input.resolved.marketSession,
    refreshedAt: input.refreshedAt,
    source: input.resolved.source,
    sourceKey: input.resolved.sourceKey,
    status: input.resolved.status,
    refreshRunId: input.refreshRunId,
  };
}

function mapPersistedToResult(record: PersistedCurrentPriceRecord): CurrentPriceResult {
  return {
    ticker: normalizeTicker(record.ticker),
    currentPrice: record.currentPrice,
    marketSession: record.marketSession,
    refreshedAt: record.refreshedAt,
    source: record.source,
    sourceKey: record.sourceKey,
    status: record.status,
    error: null,
  };
}

export class CurrentPriceService {
  private activeRefreshRunId: string | null = null;

  constructor(
    private readonly scannerResultRepo: ScannerResultRepository,
    private readonly dailyRepo: StockDailyCandleRepository,
    private readonly stockCandleUpdates: StockCandleUpdateService,
    private readonly marketData: MarketDataService
  ) {}

  isRefreshRunning(): boolean {
    return this.activeRefreshRunId != null;
  }

  getCurrentPrice(ticker: string): CurrentPriceResult {
    const key = normalizeTicker(ticker);
    const dailyCandles = this.dailyRepo.listByTicker("US", key);
    const fromCandles = resolveCurrentPrice({ dailyCandles });
    if (fromCandles) {
      const stored = this.scannerResultRepo.getCurrentPriceRecord(key);
      return {
        ticker: key,
        currentPrice: fromCandles.currentPrice,
        marketSession: fromCandles.marketSession,
        refreshedAt: stored?.refreshedAt ?? null,
        source: fromCandles.source,
        sourceKey: fromCandles.sourceKey,
        status: fromCandles.status,
        error: null,
      };
    }

    const stored = this.scannerResultRepo.getCurrentPriceRecord(key);
    if (stored && isValidPrice(stored.currentPrice)) {
      return mapPersistedToResult(stored);
    }

    const scannerRecord = this.scannerResultRepo.getLatestTickerRecord(key);
    if (scannerRecord && isValidPrice(scannerRecord.result.currentPrice)) {
      return {
        ticker: key,
        currentPrice: scannerRecord.result.currentPrice,
        marketSession: scannerRecord.marketDate,
        refreshedAt: scannerRecord.refreshedAt,
        source: scannerRecord.result.priceSource ?? DAILY_CLOSE_SOURCE_LABEL,
        sourceKey: "daily_close",
        status: scannerRecord.result.priceStatus ?? "fresh",
        error: null,
      };
    }

    return {
      ticker: key,
      currentPrice: null,
      marketSession: null,
      refreshedAt: null,
      source: null,
      sourceKey: null,
      status: "unavailable",
      error: null,
    };
  }

  /** Sync central current-price record from a completed scanner ticker save. */
  persistFromScannerTickerRecord(record: PersistedScannerTickerRecord): void {
    const price = record.result.currentPrice;
    if (!isValidPrice(price) || !record.result.priceAsOf) return;

    this.scannerResultRepo.upsertCurrentPriceRecord({
      ticker: normalizeTicker(record.ticker),
      currentPrice: price,
      marketSession: record.marketDate,
      refreshedAt: record.refreshedAt,
      source: DAILY_CLOSE_SOURCE_LABEL,
      sourceKey: "daily_close",
      status: "fresh",
      refreshRunId: record.refreshRunId,
    });
  }

  async refreshTickers(input: {
    tickers: CurrentPriceTickerInput[];
    onProgress?: (progress: CurrentPriceRefreshProgress) => void;
  }): Promise<CurrentPriceRefreshBatchResult> {
    if (this.activeRefreshRunId) {
      throw new Error("Current price refresh is already running");
    }

    const refreshRunId = generateId();
    this.activeRefreshRunId = refreshRunId;
    const refreshedAt = new Date().toISOString();
    const unique = new Map<string, CurrentPriceTickerInput>();

    for (const row of input.tickers) {
      const ticker = normalizeTicker(row.ticker);
      if (!ticker) continue;
      unique.set(ticker, { ...row, ticker });
    }

    const tickers = [...unique.values()];
    const total = tickers.length;

    try {
      input.onProgress?.({
        phase: "refreshing",
        completed: 0,
        total,
        message: "Refreshing...",
      });

      if (tickers.length > 0) {
        await this.stockCandleUpdates.refreshDailyCandlesForTickers(
          tickers.map((row) => ({
            ticker: row.ticker,
            fetchSymbol: row.fetchSymbol,
          }))
        );
      }

      input.onProgress?.({
        phase: "saving",
        completed: 0,
        total,
        message: "Saving...",
      });

      const settled = await Promise.allSettled(
        tickers.map(async (row, index) => {
          const ticker = normalizeTicker(row.ticker);
          const dailyCandles = this.dailyRepo.listByTicker("US", ticker);

          const resolved = resolveCurrentPrice({
            dailyCandles,
            manualPriceUsd: row.manualPriceUsd,
          });

          if (!resolved) {
            const previous = this.scannerResultRepo.getCurrentPriceRecord(ticker);
            if (previous && isValidPrice(previous.currentPrice)) {
              return {
                ticker,
                result: {
                  ticker,
                  currentPrice: previous.currentPrice,
                  marketSession: previous.marketSession,
                  refreshedAt: previous.refreshedAt,
                  source: previous.source,
                  sourceKey: previous.sourceKey,
                  status: "stale" as const,
                  error: "No completed candle — kept previous price",
                },
                persisted: null,
              };
            }

            return {
              ticker,
              result: {
                ticker,
                currentPrice: null,
                marketSession: null,
                refreshedAt: null,
                source: null,
                sourceKey: null,
                status: "unavailable" as const,
                error: "No completed daily candle available",
              },
              persisted: null,
            };
          }

          const persisted = toPersistedRecord({
            ticker,
            resolved,
            refreshedAt,
            refreshRunId,
          });

          const upsert = this.scannerResultRepo.upsertCurrentPriceRecord(persisted);
          if (upsert === "rejected") {
            const previous = this.scannerResultRepo.getCurrentPriceRecord(ticker);
            if (previous && isValidPrice(previous.currentPrice)) {
              return {
                ticker,
                result: {
                  ticker,
                  currentPrice: previous.currentPrice,
                  marketSession: previous.marketSession,
                  refreshedAt: previous.refreshedAt,
                  source: previous.source,
                  sourceKey: previous.sourceKey,
                  status: "stale" as const,
                  error: "Save rejected — kept previous price",
                },
                persisted: null,
              };
            }
            return {
              ticker,
              result: {
                ticker,
                currentPrice: null,
                marketSession: null,
                refreshedAt: null,
                source: null,
                sourceKey: null,
                status: "unavailable" as const,
                error: "Save rejected",
              },
              persisted: null,
            };
          }

          const stored = this.scannerResultRepo.getCurrentPriceRecord(ticker);
          if (
            !stored ||
            !this.scannerResultRepo.verifyCurrentPriceRecord(stored, persisted)
          ) {
            const previous = this.scannerResultRepo.getCurrentPriceRecord(ticker);
            if (previous && isValidPrice(previous.currentPrice)) {
              return {
                ticker,
                result: {
                  ticker,
                  currentPrice: previous.currentPrice,
                  marketSession: previous.marketSession,
                  refreshedAt: previous.refreshedAt,
                  source: previous.source,
                  sourceKey: previous.sourceKey,
                  status: "stale" as const,
                  error: "Verification failed — kept previous price",
                },
                persisted: null,
              };
            }
          }

          input.onProgress?.({
            phase: "saving",
            completed: index + 1,
            total,
            message: "Saving...",
          });

          return {
            ticker,
            result: mapPersistedToResult(stored ?? persisted),
            persisted,
          };
        })
      );

      this.marketData.invalidate();

      const results: CurrentPriceResult[] = [];
      const successfulTickers: string[] = [];
      const failedTickers: Array<{ ticker: string; error: string }> = [];

      for (const entry of settled) {
        if (entry.status === "rejected") {
          continue;
        }
        const { ticker, result } = entry.value;
        results.push(result);
        if (result.currentPrice != null && result.status !== "unavailable") {
          if (result.error) {
            failedTickers.push({ ticker, error: result.error });
          } else {
            successfulTickers.push(ticker);
          }
        } else {
          failedTickers.push({
            ticker,
            error: result.error ?? "Unavailable",
          });
        }
      }

      const status =
        successfulTickers.length === 0
          ? "failed"
          : failedTickers.length > 0
            ? "partial_success"
            : "success";

      input.onProgress?.({
        phase: "complete",
        completed: total,
        total,
        message:
          status === "success"
            ? "Updated"
            : status === "partial_success"
              ? "Partial success"
              : "Failed",
      });

      return {
        refreshRunId,
        results,
        successfulTickers,
        failedTickers,
        status,
      };
    } finally {
      this.activeRefreshRunId = null;
    }
  }
}
