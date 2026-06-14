import type { StockPrice } from "@/core/domain/types";

export interface StockPriceRepository {
  list(): StockPrice[];
  upsert(price: StockPrice): void;
  delete(market: StockPrice["market"], ticker: string): void;
  replaceAll(prices: StockPrice[]): void;
}
