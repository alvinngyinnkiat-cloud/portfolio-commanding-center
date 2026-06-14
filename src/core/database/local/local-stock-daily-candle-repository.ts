import type { StockDailyCandle } from "@/core/domain/types";
import type { StockDailyCandleRepository } from "../repositories/stock-daily-candle-repository";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

const EMPTY: StockDailyCandle[] = [];

export class LocalStockDailyCandleRepository implements StockDailyCandleRepository {
  list(): StockDailyCandle[] {
    return readJson(STORAGE_KEYS.stockDailyCandles, EMPTY);
  }

  listByTicker(
    market: StockDailyCandle["market"],
    ticker: string
  ): StockDailyCandle[] {
    const normalized = normalizeTicker(ticker);
    return this.list()
      .filter((row) => row.market === market && row.ticker === normalized)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  replaceForTicker(
    market: StockDailyCandle["market"],
    ticker: string,
    candles: StockDailyCandle[]
  ): void {
    const normalized = normalizeTicker(ticker);
    const rest = this.list().filter(
      (row) => !(row.market === market && row.ticker === normalized)
    );
    writeJson(STORAGE_KEYS.stockDailyCandles, [...rest, ...candles]);
  }
}
