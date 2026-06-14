import type {
  StockDailyCandle,
  StockMarket,
  StockPrice,
  StockWeeklyCandle,
} from "@/core/domain/types";
import type { StockDailyCandleRepository } from "@/core/database/repositories/stock-daily-candle-repository";
import type { StockWeeklyCandleRepository } from "@/core/database/repositories/stock-weekly-candle-repository";
import type { StockPriceRepository } from "@/core/database/repositories/stock-price-repository";
import { normalizeStockPrices } from "@/core/calculations/stocks/price-normalize";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";

export interface StockMarketDataReader {
  getPrice(market: StockMarket, ticker: string): StockPrice | null;
  getDailyCandles(market: StockMarket, ticker: string): StockDailyCandle[];
  getWeeklyCandles(market: StockMarket, ticker: string): StockWeeklyCandle[];
}

export function createStockMarketDataReader(
  priceRepo: StockPriceRepository,
  dailyRepo: StockDailyCandleRepository,
  weeklyRepo: StockWeeklyCandleRepository
): StockMarketDataReader {
  const prices = normalizeStockPrices(priceRepo.list());

  return {
    getPrice(market, ticker) {
      const normalized = normalizeTicker(ticker);
      return (
        prices.find(
          (row) => row.market === market && row.ticker === normalized
        ) ?? null
      );
    },
    getDailyCandles(market, ticker) {
      return dailyRepo.listByTicker(market, ticker);
    },
    getWeeklyCandles(market, ticker) {
      return weeklyRepo.listByTicker(market, ticker);
    },
  };
}
