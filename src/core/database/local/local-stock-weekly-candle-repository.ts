import type { StockWeeklyCandle } from "@/core/domain/types";
import type { StockWeeklyCandleRepository } from "../repositories/stock-weekly-candle-repository";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

const EMPTY: StockWeeklyCandle[] = [];

export class LocalStockWeeklyCandleRepository
  implements StockWeeklyCandleRepository
{
  list(): StockWeeklyCandle[] {
    return readJson(STORAGE_KEYS.stockWeeklyCandles, EMPTY);
  }

  listByTicker(
    market: StockWeeklyCandle["market"],
    ticker: string
  ): StockWeeklyCandle[] {
    const normalized = normalizeTicker(ticker);
    return this.list()
      .filter((row) => row.market === market && row.ticker === normalized)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  replaceForTicker(
    market: StockWeeklyCandle["market"],
    ticker: string,
    candles: StockWeeklyCandle[]
  ): void {
    const normalized = normalizeTicker(ticker);
    const rest = this.list().filter(
      (row) => !(row.market === market && row.ticker === normalized)
    );
    writeJson(STORAGE_KEYS.stockWeeklyCandles, [...rest, ...candles]);
  }
}
