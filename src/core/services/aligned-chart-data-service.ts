import type { AlignedChartData } from "@/core/domain/types/aligned-chart-data";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import type { StockDailyCandleRepository } from "@/core/database/repositories/stock-daily-candle-repository";
import { resolveAlignedChartData } from "@/core/calculations/scanner/resolve-aligned-chart-data";
import type { MarketDataService } from "./market-data-service";

export class AlignedChartDataService {
  private cacheVersion = 0;
  private readonly cache = new Map<string, AlignedChartData>();

  constructor(
    private readonly marketData: MarketDataService,
    private readonly dailyRepo: StockDailyCandleRepository
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
      dailyCandles,
      scannerChartCandles: record?.candles ?? [],
      currentAveragePrice: record?.currentAveragePrice ?? null,
      previousAveragePrice: record?.previousAveragePrice ?? null,
      atr14: record?.atr14 ?? null,
      refreshedAt: record?.refreshedAt ?? null,
    });

    this.cache.set(key, resolved);
    return resolved;
  }

  async resolve(ticker: string): Promise<AlignedChartData> {
    this.cache.delete(normalizeTicker(ticker));
    return this.resolveSync(ticker);
  }
}
