import type { WatchlistEntry } from "@/core/calculations/scanner/watchlist";
import { getActiveWatchlistEntries } from "@/core/calculations/scanner/watchlist";
import { scanTicker } from "@/core/calculations/scanner/scan";
import {
  buildRankings,
  countOpportunities,
} from "@/core/calculations/scanner/ranking";
import { getSingaporeDateString } from "@/core/calculations/stocks/price-schedule";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { normalizeStockPrices } from "@/core/calculations/stocks/price-normalize";
import type {
  ScannerRefreshRunMetadata,
  ScannerRefreshRunStatus,
  ScannerTickerDataStatus,
  PersistedScannerTickerRecord,
} from "@/core/calculations/scanner/scanner-ticker-records";
import { validateTickerScanResult } from "@/core/calculations/scanner/scanner-ticker-validation";
import type { ScannerScanRun, ScannerTickerResult } from "@/core/domain/types/scanner";
import type {
  ScannerResultRepository,
  ScannerScheduleRepository,
} from "@/core/database/repositories/scanner-repository";
import type { StockPriceScheduleRepository } from "@/core/database/repositories/stock-price-schedule-repository";
import type { ScannerWatchlistRepository } from "@/core/database/repositories/scanner-watchlist-repository";
import type { StockDailyCandleRepository } from "@/core/database/repositories/stock-daily-candle-repository";
import type { StockPriceRepository } from "@/core/database/repositories/stock-price-repository";
import type { StockWeeklyCandleRepository } from "@/core/database/repositories/stock-weekly-candle-repository";
import { generateId } from "@/core/database/local/local-storage";
import { getLatestCandleDate } from "@/core/calculations/stocks/weekly-candles";
import type { StockCandleUpdateResult } from "./stock-candle-update-service";
import type { CurrentPriceService } from "./current-price-service";

export type ScannerRefreshPhase =
  | "fetching"
  | "saving"
  | "verifying"
  | "complete";

export interface ScannerRefreshProgress {
  phase: ScannerRefreshPhase;
  completed: number;
  total: number;
  message: string;
}

export interface ScannerTickerRefreshAttempt {
  ticker: string;
  success: boolean;
  marketDate: string | null;
  refreshedAt: string | null;
  currentPrice: number | null;
  candles: number;
  error: string | null;
}

export interface ScannerHardenedRefreshResult {
  refreshRun: ScannerRefreshRunMetadata;
  scanRun: ScannerScanRun;
  candleResult: StockCandleUpdateResult;
  tickerStatuses: Record<string, ScannerTickerDataStatus>;
  tickerAttempts: ScannerTickerRefreshAttempt[];
}

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logRefreshDiag(event: string, payload: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return;
  console.debug("[scanner-refresh]", event, payload);
}

function deriveRunRefreshStatus(
  successCount: number,
  total: number
): ScannerScanRun["refreshStatus"] {
  if (successCount === 0) return "failed";
  if (successCount < total) return "partial";
  return "success";
}

function deriveMetadataStatus(
  successCount: number,
  total: number
): ScannerRefreshRunStatus {
  if (successCount === 0) return "failed";
  if (successCount < total) return "partial_success";
  return "success";
}

export class ScannerRefreshOrchestrator {
  private activeRefreshRunId: string | null = null;

  constructor(
    private readonly watchlistRepo: ScannerWatchlistRepository,
    private readonly priceRepo: StockPriceRepository,
    private readonly dailyRepo: StockDailyCandleRepository,
    private readonly weeklyRepo: StockWeeklyCandleRepository,
    private readonly resultRepo: ScannerResultRepository,
    private readonly scheduleRepo: ScannerScheduleRepository,
    private readonly priceScheduleRepo: StockPriceScheduleRepository,
    private readonly currentPriceService?: CurrentPriceService
  ) {}

  isRefreshRunning(): boolean {
    return this.activeRefreshRunId != null;
  }

  async runRefresh(input: {
    updateCandles: (date?: Date) => Promise<StockCandleUpdateResult>;
    date?: Date;
    tickers?: string[];
    onProgress?: (progress: ScannerRefreshProgress) => void;
  }): Promise<ScannerHardenedRefreshResult> {
    if (this.activeRefreshRunId) {
      throw new Error("Scanner refresh is already running");
    }

    const startedAt = new Date();
    const refreshRunId = generateId();
    this.activeRefreshRunId = refreshRunId;
    const startedMs = Date.now();

    const date = input.date ?? startedAt;
    const today = getSingaporeDateString(date);
    const scanTime = startedAt.toISOString();

    logRefreshDiag("start", { refreshRunId, startedAt: scanTime });

    try {
      const candleResult = await input.updateCandles(date);

      const allEntries = getActiveWatchlistEntries(this.watchlistRepo.get());
      const targetEntries =
        input.tickers && input.tickers.length > 0
          ? allEntries.filter((entry) =>
              input.tickers!.some(
                (ticker) => normalizeTicker(ticker) === normalizeTicker(entry.ticker)
              )
            )
          : allEntries;

      const total = targetEntries.length;
      input.onProgress?.({
        phase: "fetching",
        completed: 0,
        total,
        message: `Refreshing 0/${total}`,
      });

      const settled = await Promise.allSettled(
        targetEntries.map((entry, index) =>
          this.refreshSingleTicker({
            entry,
            refreshRunId,
            refreshedAt: scanTime,
            index,
            total,
            onProgress: input.onProgress,
          })
        )
      );

      const attempts: ScannerTickerRefreshAttempt[] = settled.map((outcome, i) => {
        if (outcome.status === "fulfilled") return outcome.value;
        const ticker = targetEntries[i]?.ticker ?? "UNKNOWN";
        return {
          ticker,
          success: false,
          marketDate: null,
          refreshedAt: null,
          currentPrice: null,
          candles: 0,
          error:
            outcome.reason instanceof Error
              ? outcome.reason.message
              : "Unexpected refresh failure",
        };
      });

      input.onProgress?.({
        phase: "saving",
        completed: total,
        total,
        message: "Saving...",
      });

      const successfulTickers: string[] = [];
      const failedTickers: Array<{ ticker: string; error: string }> = [];
      const savedRecords: PersistedScannerTickerRecord[] = [];

      for (const attempt of attempts) {
        if (!attempt.success || !attempt.marketDate) {
          failedTickers.push({
            ticker: attempt.ticker,
            error: attempt.error ?? "Refresh failed",
          });
          continue;
        }

        const persisted = this.resultRepo.getLatestTickerRecord(attempt.ticker);
        if (!persisted) {
          failedTickers.push({
            ticker: attempt.ticker,
            error: "Save verification failed — record missing after upsert",
          });
          continue;
        }

        savedRecords.push(persisted);
        successfulTickers.push(normalizeTicker(attempt.ticker));
      }

      input.onProgress?.({
        phase: "verifying",
        completed: total,
        total,
        message: "Verifying...",
      });

      for (const expected of savedRecords) {
        const stored = this.resultRepo.getTickerRecord(
          expected.ticker,
          expected.marketDate
        );
        if (!this.resultRepo.verifyTickerRecord(stored, expected)) {
          const ticker = normalizeTicker(expected.ticker);
          if (!failedTickers.some((row) => normalizeTicker(row.ticker) === ticker)) {
            failedTickers.push({
              ticker,
              error: "Post-save verification mismatch",
            });
          }
          const idx = successfulTickers.indexOf(ticker);
          if (idx >= 0) successfulTickers.splice(idx, 1);
        }
      }

      const scanRun = this.buildScanRun({
        refreshRunId,
        today,
        scanTime,
        allEntries,
        successfulTickers: new Set(successfulTickers),
        attempts,
      });

      const metadataStatus = deriveMetadataStatus(successfulTickers.length, total);
      const refreshRun: ScannerRefreshRunMetadata = {
        refreshRunId,
        startedAt: scanTime,
        completedAt: new Date().toISOString(),
        totalTickers: total,
        successfulTickers,
        failedTickers,
        status: metadataStatus,
      };

      if (successfulTickers.length > 0) {
        this.resultRepo.save(scanRun);
      }
      this.resultRepo.setLastRefreshRun(refreshRun);

      if (successfulTickers.length > 0) {
        this.scheduleRepo.set({
          lastScanDate: today,
          lastSuccessfulScanTime: scanTime,
          failedRefreshCount: 0,
          lastFailedAttemptDate: null,
        });
      } else {
        const schedule = this.scheduleRepo.get();
        this.scheduleRepo.set({
          ...schedule,
          failedRefreshCount: schedule.failedRefreshCount + 1,
          lastFailedAttemptDate: today,
        });
      }

      const tickerStatuses = this.buildTickerStatuses(
        allEntries,
        refreshRun,
        refreshRunId
      );

      input.onProgress?.({
        phase: "complete",
        completed: total,
        total,
        message:
          metadataStatus === "success"
            ? "Refresh complete"
            : metadataStatus === "partial_success"
              ? "Partial success"
              : "Refresh failed",
      });

      logRefreshDiag("complete", {
        refreshRunId,
        durationMs: Date.now() - startedMs,
        successful: successfulTickers.length,
        failed: failedTickers.length,
      });

      return {
        refreshRun,
        scanRun,
        candleResult,
        tickerStatuses,
        tickerAttempts: attempts,
      };
    } finally {
      this.activeRefreshRunId = null;
    }
  }

  private async refreshSingleTicker(input: {
    entry: WatchlistEntry;
    refreshRunId: string;
    refreshedAt: string;
    index: number;
    total: number;
    onProgress?: (progress: ScannerRefreshProgress) => void;
  }): Promise<ScannerTickerRefreshAttempt> {
    const ticker = normalizeTicker(input.entry.ticker);
    const previous = this.resultRepo.getLatestTickerRecord(ticker);
    let lastError = "Unknown error";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      input.onProgress?.({
        phase: "fetching",
        completed: input.index,
        total: input.total,
        message: `Refreshing ${input.index + 1}/${input.total}`,
      });

      logRefreshDiag("fetch_attempt", {
        refreshRunId: input.refreshRunId,
        ticker,
        attempt,
      });

      try {
        const result = this.scanTickerFresh(input.entry);
        const validation = validateTickerScanResult(result, ticker, previous);

        logRefreshDiag("validation", {
          refreshRunId: input.refreshRunId,
          ticker,
          attempt,
          ok: validation.ok,
          marketDate: result.priceAsOf,
          close: result.recentCandles.at(-1)?.close ?? null,
          error: validation.error ?? null,
        });

        if (!validation.ok) {
          lastError = validation.error ?? "Validation failed";
          if (attempt < MAX_ATTEMPTS) {
            await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
            continue;
          }
          break;
        }

        const record: PersistedScannerTickerRecord = {
          ticker,
          marketDate: result.priceAsOf!,
          refreshedAt: input.refreshedAt,
          refreshRunId: input.refreshRunId,
          result,
          candleCount: result.recentCandles.length,
        };

        const upsert = this.resultRepo.upsertTickerRecord(record);
        logRefreshDiag("save", {
          refreshRunId: input.refreshRunId,
          ticker,
          attempt,
          upsert,
        });

        if (upsert === "skipped_stale") {
          lastError = "Stored record is newer than fetched data";
          if (attempt < MAX_ATTEMPTS) {
            await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
            continue;
          }
          break;
        }

        this.currentPriceService?.persistFromScannerTickerRecord(record);

        return {
          ticker,
          success: true,
          marketDate: record.marketDate,
          refreshedAt: record.refreshedAt,
          currentPrice: result.currentPrice,
          candles: record.candleCount,
          error: null,
        };
      } catch (error) {
        lastError =
          error instanceof Error ? error.message : "Unexpected ticker refresh error";
        logRefreshDiag("fetch_error", {
          refreshRunId: input.refreshRunId,
          ticker,
          attempt,
          error: lastError,
        });
        if (attempt < MAX_ATTEMPTS) {
          await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
        }
      }
    }

    return {
      ticker,
      success: false,
      marketDate: null,
      refreshedAt: null,
      currentPrice: null,
      candles: 0,
      error: lastError,
    };
  }

  private scanTickerFresh(entry: WatchlistEntry): ScannerTickerResult {
    const prices = normalizeStockPrices(this.priceRepo.list());
    const normalized = normalizeTicker(entry.ticker);
    const price =
      prices.find(
        (row) => row.market === entry.market && normalizeTicker(row.ticker) === normalized
      ) ?? null;

    return scanTicker({
      entry,
      dailyCandles: this.dailyRepo.listByTicker(entry.market, entry.ticker),
      weeklyCandles: this.weeklyRepo.listByTicker(entry.market, entry.ticker),
      price,
    });
  }

  private buildScanRun(input: {
    refreshRunId: string;
    today: string;
    scanTime: string;
    allEntries: WatchlistEntry[];
    successfulTickers: Set<string>;
    attempts: ScannerTickerRefreshAttempt[];
  }): ScannerScanRun {
    const schedule = this.scheduleRepo.get();
    const latestRun = this.resultRepo.getLatest();
    const failedSet = new Set(
      input.attempts.filter((row) => !row.success).map((row) => normalizeTicker(row.ticker))
    );

    const results: ScannerTickerResult[] = input.allEntries.map((entry) => {
      const ticker = normalizeTicker(entry.ticker);
      const persisted = this.resultRepo.getLatestTickerRecord(ticker);
      if (persisted) {
        return persisted.result;
      }

      const previous = latestRun?.results.find(
        (row) => normalizeTicker(row.ticker) === ticker
      );
      if (previous) return previous;

      return {
        ticker: entry.ticker,
        category: entry.category,
        market: entry.market,
        currentPrice: null,
        priceAsOf: null,
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
          bullPut: { eligible: false, checklist: [], passReasons: [], failReasons: [] },
          bearCall: { eligible: false, checklist: [], passReasons: [], failReasons: [] },
          ironCondor: { eligible: false, checklist: [], passReasons: [], failReasons: [] },
        },
        emaStrategy: { output: "NO TRADE", reasons: ["Missing"], checklist: [] },
        mainSystem: { output: "NO TRADE", strategy: null, reasons: ["Missing"] },
        bestSetup: null,
        tradable: false,
        tradeReasons: [],
        recentCandles: [],
        status: failedSet.has(ticker) ? "error" : "incomplete",
        notes: failedSet.has(ticker) ? ["Refresh failed — using previous data if available"] : ["Missing"],
      };
    });

    const missingTickers = results
      .filter((row) => row.status !== "ok" && row.status !== "price_only")
      .map((row) => row.ticker);
    const indicatorsCalculated = results.filter((row) => row.status === "ok").length;
    const successCount = input.successfulTickers.size;
    const refreshStatus = deriveRunRefreshStatus(successCount, input.allEntries.length);

    const marketDates = results.flatMap((row) => row.recentCandles.map((bar) => bar.date));
    const marketDateUsed = getLatestCandleDate(
      marketDates.map((dateValue) => ({ date: dateValue }))
    );

    const priceSchedule = this.priceScheduleRepo.get();
    const dataSourceStatus =
      !priceSchedule.usLastCandleUpdateDate
        ? "unavailable"
        : missingTickers.length > 0
          ? "stale"
          : priceSchedule.usLastCandleUpdateDate < input.today
            ? "stale"
            : "healthy";

    return {
      id: input.refreshRunId,
      scanDate: input.today,
      scanTime: input.scanTime,
      marketDateUsed,
      refreshStatus,
      tickersScanned: input.allEntries.length,
      tickersMissing: missingTickers,
      results,
      rankings: buildRankings(results),
      opportunities: countOpportunities(results),
      health: {
        dataSourceStatus,
        lastSuccessfulRefresh:
          refreshStatus === "failed"
            ? schedule.lastSuccessfulScanTime
            : input.scanTime,
        failedRefreshCount:
          refreshStatus === "failed" ? schedule.failedRefreshCount + 1 : 0,
        indicatorsCalculated,
        missingTickers,
      },
    };
  }

  private buildTickerStatuses(
    entries: WatchlistEntry[],
    refreshRun: ScannerRefreshRunMetadata,
    refreshRunId: string
  ): Record<string, ScannerTickerDataStatus> {
    const failed = new Set(
      refreshRun.failedTickers.map((row) => normalizeTicker(row.ticker))
    );
    const success = new Set(
      refreshRun.successfulTickers.map((ticker) => normalizeTicker(ticker))
    );
    const statuses: Record<string, ScannerTickerDataStatus> = {};

    for (const entry of entries) {
      const ticker = normalizeTicker(entry.ticker);
      const persisted = this.resultRepo.getLatestTickerRecord(ticker);

      if (!persisted) {
        statuses[ticker] = failed.has(ticker) ? "failed" : "missing";
        continue;
      }

      if (failed.has(ticker)) {
        statuses[ticker] = persisted.refreshRunId === refreshRunId ? "failed" : "fallback";
        continue;
      }

      if (success.has(ticker) && persisted.refreshRunId === refreshRunId) {
        statuses[ticker] = "fresh";
        continue;
      }

      statuses[ticker] = "stale";
    }

    return statuses;
  }
}
