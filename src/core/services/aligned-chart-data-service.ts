import type { StockDailyCandle } from "@/core/domain/types";
import type { AlignedChartData } from "@/core/domain/types/aligned-chart-data";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { resolveFetchSymbol } from "@/core/calculations/scanner/watchlist";
import type { StockDailyCandleRepository } from "@/core/database/repositories/stock-daily-candle-repository";
import type { ScannerWatchlistRepository } from "@/core/database/repositories/scanner-watchlist-repository";
import {
  alignedChartNeedsSessionFetch,
  normalizeMarketSessionDate,
  resolveAlignedChartData,
  validateFetchedSessionCandle,
} from "@/core/calculations/scanner/resolve-aligned-chart-data";
import type { MarketDataService } from "./market-data-service";
import type { StockHistoryFetcher } from "./stock-history-fetcher";

function mergeDailyCandleIntoRepo(
  dailyRepo: StockDailyCandleRepository,
  ticker: string,
  candle: { date: string; open: number; high: number; low: number; close: number }
): void {
  const normalized = normalizeTicker(ticker);
  const sessionDate = normalizeMarketSessionDate(candle.date);
  if (!sessionDate) return;

  const existing = dailyRepo.listByTicker("US", normalized);
  const rest = existing.filter(
    (row) => normalizeMarketSessionDate(row.date) !== sessionDate
  );
  const next: StockDailyCandle = {
    market: "US",
    ticker: normalized,
    date: sessionDate,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    source: "yahoo",
    fetchedAt: new Date().toISOString(),
  };
  dailyRepo.replaceForTicker("US", normalized, [...rest, next]);
}

export class AlignedChartDataService {
  private cacheVersion = 0;
  private readonly cache = new Map<string, AlignedChartData>();

  constructor(
    private readonly marketData: MarketDataService,
    private readonly dailyRepo: StockDailyCandleRepository,
    private readonly watchlistRepo: ScannerWatchlistRepository,
    private readonly fetchHistory: StockHistoryFetcher
  ) {}

  invalidate(): void {
    this.cacheVersion += 1;
    this.cache.clear();
  }

  getCacheVersion(): number {
    return this.cacheVersion;
  }

  resolveSync(ticker: string): AlignedChartData {
    const key = normalizeTicker(ticker);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const record = this.marketData.getLatestMarketData(key);
    const dailyCandles = this.dailyRepo.listByTicker("US", key);
    const resolved = resolveAlignedChartData({
      ticker: key,
      priceSession: record?.marketSession ?? null,
      centralCurrentPrice: record?.currentPrice ?? null,
      dailyCandles,
      scannerChartCandles: record?.candles ?? [],
      currentAveragePrice: record?.currentAveragePrice ?? null,
      previousAveragePrice: record?.previousAveragePrice ?? null,
      atr14: record?.atr14 ?? null,
      source: record?.priceSource ?? null,
      refreshedAt: record?.refreshedAt ?? null,
    });

    this.cache.set(key, resolved);
    return resolved;
  }

  async resolve(ticker: string): Promise<AlignedChartData> {
    const key = normalizeTicker(ticker);
    this.cache.delete(key);

    const record = this.marketData.getLatestMarketData(key);
    const priceSession = normalizeMarketSessionDate(record?.marketSession ?? null);

    let dailyCandles = this.dailyRepo.listByTicker("US", key);
    let supplemental = null as ReturnType<typeof validateFetchedSessionCandle>;

    let resolved = resolveAlignedChartData({
      ticker: key,
      priceSession,
      centralCurrentPrice: record?.currentPrice ?? null,
      dailyCandles,
      scannerChartCandles: record?.candles ?? [],
      currentAveragePrice: record?.currentAveragePrice ?? null,
      previousAveragePrice: record?.previousAveragePrice ?? null,
      atr14: record?.atr14 ?? null,
      source: record?.priceSource ?? null,
      refreshedAt: record?.refreshedAt ?? null,
      supplementalDailyBar: supplemental,
    });

    if (alignedChartNeedsSessionFetch(resolved, priceSession) && priceSession) {
      const watchlistEntry = this.watchlistRepo
        .get()
        .find((row) => normalizeTicker(row.ticker) === key);
      const fetchSymbol = watchlistEntry
        ? resolveFetchSymbol(watchlistEntry.ticker, watchlistEntry.fetchSymbol)
        : key;

      try {
        const histories = await this.fetchHistory([
          {
            market: "US",
            ticker: fetchSymbol,
            displayTicker: key,
          },
        ]);
        const fetched = histories[0]?.candles ?? [];
        const sessionBar = fetched.find(
          (bar) => normalizeMarketSessionDate(bar.date) === priceSession
        );
        supplemental = validateFetchedSessionCandle(key, priceSession, sessionBar);

        if (supplemental) {
          mergeDailyCandleIntoRepo(this.dailyRepo, key, supplemental);
          dailyCandles = this.dailyRepo.listByTicker("US", key);
          this.marketData.invalidate();

          resolved = resolveAlignedChartData({
            ticker: key,
            priceSession,
            centralCurrentPrice: record?.currentPrice ?? null,
            dailyCandles,
            scannerChartCandles: record?.candles ?? [],
            currentAveragePrice: record?.currentAveragePrice ?? null,
            previousAveragePrice: record?.previousAveragePrice ?? null,
            atr14: record?.atr14 ?? null,
            source: record?.priceSource ?? null,
            refreshedAt: record?.refreshedAt ?? null,
            supplementalDailyBar: supplemental,
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[aligned-chart] session candle fetch failed", {
            ticker: key,
            priceSession,
            error,
          });
        }
      }
    }

    this.cache.set(key, resolved);
    return resolved;
  }
}
