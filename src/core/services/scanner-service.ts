import type {
  ScannerDataSourceStatus,
  ScannerScanRun,
  ScannerScheduleState,
  ScannerTrackerData,
} from "@/core/domain/types/scanner";
import type {
  ScannerResultRepository,
  ScannerScheduleRepository,
} from "@/core/database/repositories/scanner-repository";
import type { StockPriceScheduleRepository } from "@/core/database/repositories/stock-price-schedule-repository";
import type { ScannerWatchlistRepository } from "@/core/database/repositories/scanner-watchlist-repository";
import { getActiveWatchlistEntries } from "@/core/calculations/scanner/watchlist";
import { scanTicker } from "@/core/calculations/scanner/scan";
import {
  buildRankings,
  countOpportunities,
} from "@/core/calculations/scanner/ranking";
import { isScannerRefreshDue } from "@/core/calculations/scanner/schedule";
import { getSingaporeDateString } from "@/core/calculations/stocks/price-schedule";
import { getLatestCandleDate } from "@/core/calculations/stocks/weekly-candles";
import { generateId } from "@/core/database/local/local-storage";
import type { StockMarketDataReader } from "./stock-market-data-reader";

export class ScannerService {
  constructor(
    private marketData: StockMarketDataReader,
    private resultRepo: ScannerResultRepository,
    private scheduleRepo: ScannerScheduleRepository,
    private priceScheduleRepo: StockPriceScheduleRepository,
    private watchlistRepo: ScannerWatchlistRepository
  ) {}

  getData(): ScannerTrackerData {
    const schedule = this.scheduleRepo.get();
    const latestRun = this.resultRepo.getLatest();
    const previousRun = this.resultRepo.getPrevious();
    const today = getSingaporeDateString();

    return {
      latestRun,
      previousRun,
      schedule,
      lastRefreshFailed: schedule.lastFailedAttemptDate === today,
    };
  }

  isScanDue(date: Date = new Date()): boolean {
    const schedule = this.scheduleRepo.get();
    return isScannerRefreshDue(schedule.lastScanDate, date);
  }

  runScanIfDue(date: Date = new Date()): ScannerScanRun | null {
    if (!this.isScanDue(date)) {
      return null;
    }
    return this.runScan(date);
  }

  runScan(date: Date = new Date()): ScannerScanRun {
    const schedule = this.scheduleRepo.get();
    const today = getSingaporeDateString(date);
    const scanTime = date.toISOString();
    const activeWatchlist = getActiveWatchlistEntries(this.watchlistRepo.get());
    const results = activeWatchlist.map((entry) =>
      scanTicker({
        entry,
        dailyCandles: this.marketData.getDailyCandles(entry.market, entry.ticker),
        weeklyCandles: this.marketData.getWeeklyCandles(entry.market, entry.ticker),
        price: this.marketData.getPrice(entry.market, entry.ticker),
      })
    );

    const missingTickers = results
      .filter((row) => row.status !== "ok" && row.status !== "price_only")
      .map((row) => row.ticker);
    const indicatorsCalculated = results.filter((row) => row.status === "ok").length;

    const marketDates = results
      .flatMap((row) => this.marketData.getDailyCandles("US", row.ticker))
      .map((bar) => bar.date);
    const marketDateUsed = getLatestCandleDate(
      marketDates.map((dateValue) => ({ date: dateValue }))
    );

    const refreshStatus =
      indicatorsCalculated === 0
        ? "failed"
        : missingTickers.length > 0
          ? "partial"
          : "success";

    const priceSchedule = this.priceScheduleRepo.get();
    const dataSourceStatus = deriveDataSourceStatus(
      priceSchedule.usLastCandleUpdateDate ?? null,
      today,
      missingTickers.length
    );

    const run: ScannerScanRun = {
      id: generateId(),
      scanDate: today,
      scanTime,
      marketDateUsed,
      refreshStatus,
      tickersScanned: activeWatchlist.length,
      tickersMissing: missingTickers,
      results,
      rankings: buildRankings(results),
      opportunities: countOpportunities(results),
      health: {
        dataSourceStatus,
        lastSuccessfulRefresh:
          refreshStatus === "failed"
            ? schedule.lastSuccessfulScanTime
            : scanTime,
        failedRefreshCount:
          refreshStatus === "failed"
            ? schedule.failedRefreshCount + 1
            : 0,
        indicatorsCalculated,
        missingTickers,
      },
    };

    if (refreshStatus !== "failed") {
      this.resultRepo.save(run);
      this.scheduleRepo.set({
        lastScanDate: today,
        lastSuccessfulScanTime: scanTime,
        failedRefreshCount: 0,
        lastFailedAttemptDate: null,
      });
      return run;
    }

    this.scheduleRepo.set({
      ...schedule,
      failedRefreshCount: schedule.failedRefreshCount + 1,
      lastFailedAttemptDate: today,
    });
    return run;
  }
}

function deriveDataSourceStatus(
  usLastCandleUpdateDate: string | null,
  today: string,
  missingCount: number
): ScannerDataSourceStatus {
  if (!usLastCandleUpdateDate) {
    return "unavailable";
  }
  if (missingCount > 0) {
    return "stale";
  }
  if (usLastCandleUpdateDate < today) {
    return "stale";
  }
  return "healthy";
}
