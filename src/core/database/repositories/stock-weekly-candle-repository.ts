import type { StockMarket, StockWeeklyCandle } from "@/core/domain/types";

export interface StockWeeklyCandleRepository {
  list(): StockWeeklyCandle[];
  listByTicker(market: StockMarket, ticker: string): StockWeeklyCandle[];
  replaceForTicker(
    market: StockMarket,
    ticker: string,
    candles: StockWeeklyCandle[]
  ): void;
}
