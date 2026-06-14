import type { StockPrice } from "@/core/domain/types";
import type { StockPriceRepository } from "../repositories/stock-price-repository";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";
import { normalizeStockPrice } from "@/core/calculations/stocks/price-normalize";

const EMPTY_PRICES: StockPrice[] = [];

export class LocalStockPriceRepository implements StockPriceRepository {
  list(): StockPrice[] {
    return readJson(STORAGE_KEYS.stockPrices, EMPTY_PRICES).map((row) =>
      normalizeStockPrice(row)
    );
  }

  upsert(price: StockPrice): void {
    const normalized = normalizeStockPrice(price);
    const list = this.list();
    const idx = list.findIndex(
      (row) => row.market === normalized.market && row.ticker === normalized.ticker
    );
    if (idx >= 0) {
      list[idx] = normalized;
    } else {
      list.push(normalized);
    }
    this.replaceAll(list);
  }

  delete(market: StockPrice["market"], ticker: string): void {
    this.replaceAll(
      this.list().filter((row) => !(row.market === market && row.ticker === ticker))
    );
  }

  replaceAll(prices: StockPrice[]): void {
    writeJson(STORAGE_KEYS.stockPrices, prices);
  }
}
