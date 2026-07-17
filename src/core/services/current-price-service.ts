import type {
  CurrentPriceRefreshBatchResult,
  CurrentPriceRefreshProgress,
  CurrentPriceResult,
  PersistedCurrentPriceRecord,
} from "@/core/domain/types/current-price";
import type { PersistedScannerTickerRecord } from "@/core/calculations/scanner/scanner-ticker-records";
import { resolveCurrentPrice } from "@/core/calculations/scanner/resolve-current-price";
import { normalizeStockPrices } from "@/core/calculations/stocks/price-normalize";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import type { ScannerResultRepository } from "@/core/database/repositories/scanner-repository";
import type { StockDailyCandleRepository } from "@/core/database/repositories/stock-daily-candle-repository";
import type { StockPriceRepository } from "@/core/database/repositories/stock-price-repository";
import { generateId } from "@/core/database/local/local-storage";
import type { StockPriceUpdateService } from "./stock-price-update-service";
import type { MarketDataService } from "./market-data-service";

export interface CurrentPriceTickerInput {
  ticker: string;
  fetchSymbol?: string;
  manualPriceUsd?: number | null;
  savedTradePriceUsd?: number | null;
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

function mapScannerSourceKey(
  key: import("@/core/domain/types/scanner").ScannerTickerPriceSourceKey | null | undefined
): import("@/core/domain/types/current-price").CurrentPriceSourceKey | null {
  if (key === "quote") return "primary_quote";
  if (key === "daily_close") return "daily_close";
  if (key === "fmp_fallback") return "fmp_fallback";
  if (key === "stored_candle") return "stored_candle";
  return null;
}

export class CurrentPriceService {
  private activeRefreshRunId: string | null = null;

  constructor(
    private readonly scannerResultRepo: ScannerResultRepository,
    private readonly priceRepo: StockPriceRepository,
    private readonly dailyRepo: StockDailyCandleRepository,
    private readonly stockPriceUpdates: StockPriceUpdateService,
    private readonly marketData: MarketDataService
  ) {}

  isRefreshRunning(): boolean {
    return this.activeRefreshRunId != null;
  }

  getCurrentPrice(ticker: string): CurrentPriceResult {
    const stored = this.scannerResultRepo.getCurrentPriceRecord(ticker);
    if (stored && isValidPrice(stored.currentPrice)) {
      return mapPersistedToResult(stored);
    }

    const scannerRecord = this.scannerResultRepo.getLatestTickerRecord(ticker);
    if (scannerRecord && isValidPrice(scannerRecord.result.currentPrice)) {
      return {
        ticker: normalizeTicker(ticker),
        currentPrice: scannerRecord.result.currentPrice,
        marketSession: scannerRecord.marketDate,
        refreshedAt: scannerRecord.refreshedAt,
        source: scannerRecord.result.priceSource ?? "Scanner",
        sourceKey: mapScannerSourceKey(scannerRecord.result.priceSourceKey),
        status: scannerRecord.result.priceStatus ?? "fresh",
        error: null,
      };
    }

    return {
      ticker: normalizeTicker(ticker),
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

    const scannerKey = record.result.priceSourceKey;
    const sourceKey =
      scannerKey === "quote"
        ? "primary_quote"
        : scannerKey === "daily_close"
          ? "daily_close"
          : scannerKey === "fmp_fallback"
            ? "fmp_fallback"
            : scannerKey === "stored_candle"
              ? "stored_candle"
              : "daily_close";

    this.scannerResultRepo.upsertCurrentPriceRecord({
      ticker: normalizeTicker(record.ticker),
      currentPrice: price,
      marketSession: record.marketDate,
      refreshedAt: record.refreshedAt,
      source: record.result.priceSource ?? "Daily close",
      sourceKey,
      status: record.result.priceStatus ?? "fresh",
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
        await this.stockPriceUpdates.refreshPricesForTickers(
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

      const prices = normalizeStockPrices(this.priceRepo.list());
      const settled = await Promise.allSettled(
        tickers.map(async (row, index) => {
          const ticker = normalizeTicker(row.ticker);
          const priceRow =
            prices.find(
              (price) =>
                price.market === "US" && normalizeTicker(price.ticker) === ticker
            ) ?? null;
          const dailyCandles = this.dailyRepo.listByTicker("US", ticker);

          const resolved = resolveCurrentPrice({
            dailyCandles,
            price: priceRow,
            manualPriceUsd: row.manualPriceUsd,
            savedTradePriceUsd: row.savedTradePriceUsd,
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
                  error: "Live refresh failed — kept previous price",
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
                error: "No valid current price source",
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
