import type { StockPriceScheduleRepository } from "../repositories/stock-price-schedule-repository";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

const DEFAULT_STATE = {
  usLastUpdateDate: null,
  sgLastUpdateDate: null,
} as const;

export class LocalStockPriceScheduleRepository
  implements StockPriceScheduleRepository
{
  get() {
    return readJson(STORAGE_KEYS.stockPriceSchedule, DEFAULT_STATE);
  }

  set(state: ReturnType<StockPriceScheduleRepository["get"]>): void {
    writeJson(STORAGE_KEYS.stockPriceSchedule, state);
  }
}
