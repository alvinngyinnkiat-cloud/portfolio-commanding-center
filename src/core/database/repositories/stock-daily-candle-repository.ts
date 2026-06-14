import type { StockDailyCandle, StockMarket } from "@/core/domain/types";

export interface StockDailyCandleRepository {
  list(): StockDailyCandle[];
  listByTicker(market: StockMarket, ticker: string): StockDailyCandle[];
  replaceForTicker(
    market: StockMarket,
    ticker: string,
    candles: StockDailyCandle[]
  ): void;
}
